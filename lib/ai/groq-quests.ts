import { makeAICompletion } from '@/lib/ai/multi-groq';
import { z } from 'zod';

const QUEST_SCHEMA = z.object({
  quests: z.array(z.object({
    title: z.string(),
    description: z.string(),
    xp: z.number()
  })).length(5)
});

export async function generatePersonalizedQuests(userLevel: string, weaknesses: string[]): Promise<Array<{ title: string; description: string; xp: number }>> {
  const levelText = userLevel || 'B1';
  let weaknessesText = 'None specifically recorded.';
  if (weaknesses.length > 0) {
    weaknessesText = weaknesses.join(', ');
  }

  const prompt = `You are an expert ESL game designer. Create exactly 5 unique, highly engaging daily quests for an English learner.
The user's estimated level is ${levelText}.
Their recent grammar weaknesses: ${weaknessesText}.

Constraints for the quests:
- Focus heavily on their weak points, but mix in some general fun chat challenges.
- Quest 1 & 2: Focus on fixing their weaknesses.
- Quest 3: Focus on using advanced vocabulary or idioms suitable for their level.
- Quest 4 & 5: Creative/behavioral chat challenges (e.g. "Ask a philosophical question", "Argue a point passionately").
- DO NOT make them identical to standard quests. Be creative. Make the titles punchy gamer-style titles.
- The description MUST be clear about what they need to do in a single message or session.
- XP should be between 30 and 75, matching difficulty.
- Return ONLY valid JSON matching this schema:
{
  "quests": [
    { "title": "...", "description": "...", "xp": 40 }
  ]
}`;

  try {
    const rawContent = await makeAICompletion({
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.9,
      maxTokens: 500,
      responseFormat: { type: 'json_object' },
      timeoutMs: 15_000,
    });

    const parsed = JSON.parse(rawContent);
    const validated = QUEST_SCHEMA.parse(parsed);
    return validated.quests;
  } catch (err) {
    console.error('Failed to generate personalized quests:', err);
    // Fallback static quests if generation fails
    return [
      { title: 'Sentence Survivor', description: 'Survive 3 messages without any HP damage', xp: 40 },
      { title: 'The Architect', description: 'Write a complex sentence with a subordinate clause', xp: 35 },
      { title: 'Vocab Flex', description: 'Score exactly 80+ on vocabulary in a single message', xp: 50 },
      { title: 'Tense Transformer', description: 'Use a conditional sentence (if/would) perfectly', xp: 45 },
      { title: 'Deep Diver', description: 'Send 5 messages in a single session', xp: 30 }
    ];
  }
}
