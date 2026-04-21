import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { GRAMMAR_NODES } from '@/lib/game/grammar-nodes';

async function seedSkillNodesIfNeeded() {
  const count = await prisma.skillNode.count();
  if (count === 0) {
    const data = GRAMMAR_NODES.map((n) => ({
      slug: n.slug,
      title: n.title,
      description: n.description,
      category: n.category,
      level: n.level,
      xpReward: n.xpReward,
    }));
    await prisma.skillNode.createMany({ data, skipDuplicates: true });
  }
}

export async function GET() {
  try {
    const user = await getOrCreateUser();

    // Fire-and-forget or await the seeder
    await seedSkillNodesIfNeeded();

    const [userWithNodes, allGrammarEntries, messageCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          currentHP: true,
          diveDepth: true,
          maxDiveDepth: true,
          streak: true,
          name: true,
          lastActiveAt: true,
          avgVocabulary: true,
          avgComplexity: true,
          avgFluency: true,
          unlockedNodes: { select: { slug: true } },
        },
      }),
      prisma.grammarWeakness.findMany({
        where: { userId: user.id },
        orderBy: { count: 'desc' },
        select: { rule: true, count: true },
      }),
      prisma.message.count({
        where: { sender: 'USER', chatSession: { participants: { some: { userId: user.id } } } }
      }),
    ]);

    if (!userWithNodes) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const weaknessEntries = allGrammarEntries.filter((e) => !e.rule.startsWith('strength:'));
    const strengthEntries = allGrammarEntries
      .filter((e) => e.rule.startsWith('strength:'))
      .map((e) => ({ rule: e.rule.replace(/^strength:/, '').trim(), count: e.count }));

    const topWeaknesses = weaknessEntries.slice(0, 5);
    const topStrengths = strengthEntries.slice(0, 5);

    const grammarWeaknesses: Record<string, number> = {};
    for (const w of topWeaknesses) {
      grammarWeaknesses[w.rule] = w.count;
    }

    const hasEnoughData = messageCount >= 2;

    const stats = {
      currentHP: userWithNodes.currentHP ?? 100,
      diveDepth: userWithNodes.diveDepth,
      maxDiveDepth: userWithNodes.maxDiveDepth,
      streak: userWithNodes.streak ?? 0,
      name: userWithNodes.name,
      grammarWeaknesses: Object.keys(grammarWeaknesses).length > 0 ? grammarWeaknesses : null,
      unlockedNodes: userWithNodes.unlockedNodes.map((node) => node.slug),
      topWeaknesses,
      topStrengths,
      avgVocabulary: hasEnoughData ? userWithNodes.avgVocabulary : null,
      avgComplexity: hasEnoughData ? userWithNodes.avgComplexity : null,
      avgFluency: hasEnoughData ? userWithNodes.avgFluency : null,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
