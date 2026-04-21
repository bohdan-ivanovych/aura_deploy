import prisma from '@/lib/db/prisma';
import { makeAICompletion } from '@/lib/ai/multi-groq';

export interface QuestCheckParams {
  consecutiveClean: number;
  sessionMsgCount: number;
  vocabScore: number | null;
  complexityScore: number | null;
}

const QUEST_CRITERIA: Record<string, (params: QuestCheckParams) => boolean> = {
  'Flawless 5':      (p) => p.consecutiveClean >= 5,
  'Article Ace':     (p) => p.consecutiveClean >= 3,
  'Depth Diver':     (p) => p.sessionMsgCount >= 10,
  'Vocabulary Flex': (p) => (p.vocabScore ?? 0) >= 70,
  'Complex Thinker': (p) => (p.complexityScore ?? 0) >= 70,
};

export async function checkQuestCompletion(
  userId: string,
  _sessionId: string,
  params: QuestCheckParams
): Promise<{ title: string; depthReward: number } | null> {
  try {
    const quests = await prisma.quest.findMany({
      take: 20, // Check more quests
      orderBy: { id: 'asc' },
      select: { id: true, title: true, xp: true },
    });

    if (quests.length === 0) return null;

    const userQuests = await prisma.userQuest.findMany({
      where: { userId, completed: false },
      select: { id: true, questId: true },
    });

    if (userQuests.length === 0) return null;

    for (const uq of userQuests) {
      const quest = quests.find(q => q.id === uq.questId);
      if (!quest) continue;
      
      const checker = QUEST_CRITERIA[quest.title];
      if (!checker) {
        // Handle dynamic "Bonus Bounties" or custom logic if needed
        continue;
      }
      if (!checker(params)) continue;

      const depthReward = Math.max(1, Math.ceil(quest.xp / 10));
      await prisma.userQuest.update({
        where: { id: uq.id },
        data: { completed: true, completedAt: new Date() },
      });
      return { title: quest.title, depthReward };
    }
  } catch (err) {
    console.error('checkQuestCompletion error', err);
  }
  return null;
}

/**
 * Generates a personalized "Bonus Bounty" based on a grammar weakness.
 * Runs asynchronously to avoid blocking the main chat flow.
 */
export async function generateBonusQuest(userId: string, weakness: string) {
  try {
    const today = new Date();
    today.setUTCHours(0,0,0,0);

    // 1. Check max 2 bonus quests per day (count active/incomplete bounties)
    const todayBonusCount = await prisma.userQuest.count({
      where: {
        userId,
        completed: false,
        quest: { title: { startsWith: 'Bounty:' } }
      }
    });
    if (todayBonusCount >= 2) return;

    // 2. Fetch active quests to give as context to AI and prevent duplicates
    const activeQuestsRaw = await prisma.userQuest.findMany({
      where: { userId, completed: false },
      include: { quest: true }
    });
    
    // Check if a quest for this specific weakness already exists
    if (activeQuestsRaw.some(uq => uq.quest.title.includes(weakness) || uq.quest.title.includes('Master'))) {
      return; 
    }

    const activeQuestNames = activeQuestsRaw.map(uq => uq.quest.title).join(', ');

    // 3. LLM call to create a fun quest
    const prompt = `Generate a fun, short "Bonus Bounty" quest for a student who just made a grammar mistake: "${weakness}".
Format: JSON object with "title" and "task".
Title: Max 3 words, quirky/game-like. Do NOT use these existing quest titles: ${activeQuestNames || 'None'}.
Task: A simple instruction to use the correct form 3 times in the next messages.
Result example: {"title": "Article Avenger", "task": "Use 'the' correctly in your next 3 messages to earn bonus XP."}`;

    const resRaw = await makeAICompletion({
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.8,
      maxTokens: 100,
    });

    let title = `${weakness} Master`;
    let task = `Use the correct form of ${weakness} in your next messages.`;

    try {
      const parsed = JSON.parse(resRaw);
      title = parsed.title || title;
      task = parsed.task || task;
      
      // Ensure we don't accidentally create an identical title to an existing one
      if (activeQuestNames.includes(title)) {
        title = `Advanced ${title}`;
      }
    } catch {
      // Fallback to defaults if JSON fails
    }

    // 4. Create the Quest and UserQuest
    const quest = await prisma.quest.create({
      data: {
        title: `Bounty: ${title}`,
        description: task,
        xp: 50, // Standard bonus bounty XP
      }
    });

    await prisma.userQuest.create({
      data: {
        userId,
        questId: quest.id,
      }
    });

    console.info(`[Quest] Generated bonus bounty for ${userId}: ${title}`);
  } catch (err) {
    console.error('[Quest] Failed to generate bonus bounty:', err);
  }
}
