import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { GRAMMAR_NODES } from '@/lib/game/grammar-nodes';

async function seedNodesIfNeeded() {
  const count = await prisma.skillNode.count();
  if (count > 0) return;

  const slugToId: Record<string, string> = {};

  for (const node of GRAMMAR_NODES) {
    const created = await prisma.skillNode.create({
      data: {
        slug: node.slug,
        title: node.title,
        description: node.description,
        category: node.category,
        level: node.level,
        xpReward: node.xpReward,
      },
    });
    slugToId[node.slug] = created.id;
  }

  for (const node of GRAMMAR_NODES) {
    if (node.prerequisiteSlugs.length === 0) continue;
    const prereqIds = node.prerequisiteSlugs
      .filter((s) => slugToId[s])
      .map((s) => ({ id: slugToId[s] }));

    await prisma.skillNode.update({
      where: { slug: node.slug },
      data: { prerequisites: { connect: prereqIds } },
    });
  }
}

export async function GET() {
  try {
    const user = await getOrCreateUser();

    try {
      await seedNodesIfNeeded();
    } catch (seedErr) {
      console.warn('Skill tree seeding failed or partially failed:', seedErr);
    }

    const recentThreshold = new Date(Date.now() - 30 * 60 * 1000);

    const [userWithNodes, nodes, progressRows, recentWeaknesses] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { unlockedNodes: { select: { id: true } } },
      }),
      prisma.skillNode.findMany({
        include: { prerequisites: { select: { id: true } } },
        orderBy: [{ category: 'asc' }, { level: 'asc' }, { title: 'asc' }],
      }),
      prisma.userSkillProgress.findMany({
        where: { userId: user.id },
        select: { nodeSlug: true, practiced: true, correct: true },
      }),
      prisma.grammarWeakness.findMany({
        where: { userId: user.id, lastSeen: { gte: recentThreshold } },
        select: { rule: true },
      }),
    ]);

    const unlockedIds = new Set(userWithNodes?.unlockedNodes.map((n) => n.id) ?? []);
    const progressBySlug = new Map(progressRows.map((p) => [p.nodeSlug, p]));
    const recentRules = new Set(recentWeaknesses.map((w) => w.rule.toLowerCase()));
    const keywordsBySlug = new Map(GRAMMAR_NODES.map((n) => [n.slug, n.keywords ?? []]));

    const result = nodes.map((node) => {
      const prerequisiteIds = node.prerequisites.map((p) => p.id);
      const unlocked = unlockedIds.has(node.id);
      const allPrereqsUnlocked =
        prerequisiteIds.length === 0 || prerequisiteIds.every((id) => unlockedIds.has(id));
      const progress = progressBySlug.get(node.slug);
      const practiced: number = progress?.practiced ?? 0;
      const correct: number = progress?.correct ?? 0;
      const progressPct: number = Math.min(100, Math.round((correct / 15) * 100));
      const readyToUnlock: boolean =
        !unlocked &&
        allPrereqsUnlocked &&
        (user.diveDepth ?? 0) >= Math.max(0, node.level - 1) * 5;

      const keywords: string[] = keywordsBySlug.get(node.slug) ?? [];
      const recentlyIdentified: boolean =
        !unlocked && keywords.length > 0 && keywords.some((k) => recentRules.has(k.toLowerCase()));

      return {
        id: node.id,
        slug: node.slug,
        title: node.title,
        description: node.description,
        category: node.category,
        level: node.level,
        xpReward: node.xpReward,
        prerequisiteIds,
        unlocked,
        readyToUnlock,
        practiced,
        correct,
        progressPct,
        recentlyIdentified,
      };
    });

    return NextResponse.json({
      nodes: result,
      userXp: user.xp,
      unlockedCount: unlockedIds.size,
    });
  } catch (error) {
    console.error('API skill-tree GET error', error);
    return NextResponse.json({ error: 'Failed to fetch skill tree' }, { status: 500 });
  }
}
