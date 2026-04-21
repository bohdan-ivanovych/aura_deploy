import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { QUEST_BANK, QuestCategory } from '@/lib/game/quest-bank';
import { generatePersonalizedQuests } from '@/lib/ai/groq-quests';

const CATEGORIES: QuestCategory[] = ['vocab', 'grammar', 'fluency', 'consistency', 'engagement'];

async function seedQuestsIfNeeded() {
  const existing = await prisma.quest.findMany({
    where: { title: { in: QUEST_BANK.map(q => q.title) } },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map(q => q.title));
  const toCreate = QUEST_BANK.filter(q => !existingTitles.has(q.title));
  if (toCreate.length > 0) {
    await prisma.quest.createMany({ data: toCreate.map(q => ({ title: q.title, description: q.description, xp: q.xp })) });
  }
}

/** Returns start of today in UTC */
function todayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Deterministic seeded random for user+date */
function makeSeededRandom(userId: string, dateStr: string) {
  const seedString = userId + dateStr;
  const seed = [...seedString].reduce((acc, c) => Math.imul(31, acc) + c.charCodeAt(0) | 0, 0);
  return (n: number) => {
    let s = seed ^ (n * 2654435761);
    s = ((s ^ (s >> 16)) * 0x45d9f3b) >>> 0;
    return s / 0xffffffff;
  };
}

export async function GET() {
  try {
    const user = await getOrCreateUser();
    await seedQuestsIfNeeded();

    const today = todayUTC();
    const dateStr = new Date().toISOString().slice(0, 10);
    const seededRandom = makeSeededRandom(user.id, dateStr);

    // Fetch all quests from DB
    const allQuestsRaw = await prisma.quest.findMany({
      select: { id: true, title: true, description: true, xp: true },
    });

    // Build category -> quest mapping using our bank definitions
    const questByTitle = new Map(allQuestsRaw.map(q => [q.title, q]));
    const categoryQuests: Record<string, typeof allQuestsRaw> = {};
    
    for (const cat of CATEGORIES) {
      categoryQuests[cat] = [];
    }
    
    for (const bankQuest of QUEST_BANK) {
      const dbQuest = questByTitle.get(bankQuest.title);
      if (dbQuest) {
        categoryQuests[bankQuest.category].push(dbQuest);
      }
    }

    // Fetch user quests (forcing turbopack cache bust)
    const userQuests = await prisma.userQuest.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        questId: true,
        completed: true,
        completedAt: true,
        quest: { select: { id: true, title: true, description: true, xp: true } }
      },
      orderBy: { completedAt: 'desc' },
    });

    // Determine Day 1 vs Day 2+ based on xp (safe proxy — user has played before)
    const hasData = user.xp > 50;
    
    let generatedDailyQuests: Array<typeof allQuestsRaw[0]> = [];

    // Check if we already generated Daily quests today
    // Note: UserQuest has no createdAt — use all Daily: entries as a proxy
    const todaysDailyQuests = userQuests.filter(uq =>
      uq.quest.title.startsWith('Daily:')
    ).map(uq => uq.quest);


    if (todaysDailyQuests.length >= 5) {
      generatedDailyQuests = todaysDailyQuests.slice(0, 5);
    } else if (hasData) {
      // Day 2+: Attempt LLM Generation
      try {
        const weaknessRows = await prisma.grammarWeakness.findMany({
          where: { userId: user.id },
          orderBy: { count: 'desc' },
          take: 3,
          select: { rule: true },
        });
        const topWeaknesses = weaknessRows.map(w => w.rule);
        const cefrLevel = user.detectedLevel || 'B1';

        const llmQuests = await generatePersonalizedQuests(cefrLevel, topWeaknesses);

        const createdQuests = await Promise.all(llmQuests.map(async (llmQ) => {
          const newQ = await prisma.quest.create({
            data: { title: `Daily: ${llmQ.title}`, description: llmQ.description, xp: llmQ.xp }
          });
          await prisma.userQuest.create({ data: { userId: user.id, questId: newQ.id } });
          return newQ;
        }));
        
        generatedDailyQuests = createdQuests;
      } catch (e) {
        console.error('LLM Quest Gen failed', e);
      }
    }

    // Fallback to static pool if LLM failed or if Day 1
    if (generatedDailyQuests.length < 5) {
      for (const cat of CATEGORIES) {
        const catQuests = categoryQuests[cat] || [];
        if (catQuests.length === 0) continue;
        
        const shuffled = [...catQuests].sort((a, b) => {
          const ia = catQuests.indexOf(a);
          const ib = catQuests.indexOf(b);
          return seededRandom(ia + CATEGORIES.indexOf(cat) * 100) - seededRandom(ib + CATEGORIES.indexOf(cat) * 100);
        });
        
        generatedDailyQuests.push(shuffled[0]);
      }
    }

    // Collect bounties: deduplicate by NORMALIZED TITLE
    const bountyByTitle = new Map<string, typeof userQuests[0]['quest']>();
    for (const uq of userQuests) {
      if (!uq.quest.title.startsWith('Bounty:')) continue;
      const isActive = !uq.completed;
      const completedToday = uq.completed && uq.completedAt && new Date(uq.completedAt) >= today;
      if (isActive || completedToday) {
        const normalizedTitle = uq.quest.title.replace(/^Bounty:\s*/i, '').trim().toLowerCase();
        if (!bountyByTitle.has(normalizedTitle)) {
          bountyByTitle.set(normalizedTitle, uq.quest);
        }
      }
    }
    const uniqueBounties = Array.from(bountyByTitle.values()).slice(0, 2);

    const finalQuestsToDisplay = [...generatedDailyQuests.slice(0,5), ...uniqueBounties];

    // Build completed set from today
    const completedSet = new Set(
      userQuests
        .filter(uq => uq.completed && uq.completedAt && new Date(uq.completedAt) >= today)
        .map(uq => uq.questId)
    );

    const questsWithStatus = finalQuestsToDisplay.map(q => {
      let target = 1;
      const numMatch = q.description.match(/\b(\d+)\b/);
      if (numMatch) target = parseInt(numMatch[1], 10);

      const isCompleted = completedSet.has(q.id);

      let progress = 0;
      if (isCompleted) {
        progress = target;
      } else if (q.title === 'Depth Diver' || q.title === 'Marathon' || q.title === 'Warm Up') {
        const lastReset = user.dailyMessageResetAt ? new Date(user.dailyMessageResetAt) : null;
        const countIsToday = lastReset && lastReset >= today;
        progress = countIsToday ? Math.min(user.dailyMessageCount, target) : 0;
      }

      return { ...q, completed: isCompleted, progress, target };
    });

    return NextResponse.json({ quests: questsWithStatus });
  } catch (error) {
    console.error('Quests API error:', error);
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
  }
}
