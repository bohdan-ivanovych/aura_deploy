import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { rateLimit } from '@/lib/utils/rate-limit';
import { mapWeaknessToNodeSlug, normalizeSkillTopic, titleFromSkillTopic } from '@/lib/game/grammar-nodes';

const SKILL_UNLOCK_DEPTH_BONUS = 3;

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const allowed = await rateLimit(`unlock:${user.id}`, 20, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
    }

    const body = await req.json();
    const rawSlug = typeof body?.slug === 'string' ? body.slug.trim() : '';
    const slug = normalizeSkillTopic(rawSlug);
    const quizScore: number = typeof body?.quizScore === 'number' ? body.quizScore : 0;
    const quizTotal: number = typeof body?.quizTotal === 'number' ? body.quizTotal : 0;
    const title = typeof body?.title === 'string' ? body.title.trim() : titleFromSkillTopic(rawSlug);

    if (!rawSlug || !slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    // Try to find existing node
    let node = await prisma.skillNode.findUnique({
      where: { slug },
      include: { prerequisites: { select: { id: true } } },
    });

    // If node doesn't exist, try to create it from weakness data
    if (!node) {
      // Check if this matches a predefined node (case-insensitive)
      const mappedSlug = mapWeaknessToNodeSlug(slug);
      if (mappedSlug) {
        node = await prisma.skillNode.findUnique({
          where: { slug: mappedSlug },
          include: { prerequisites: { select: { id: true } } },
        });
      }

      // If still no node, create a dynamic one
      if (!node && title) {
        node = await prisma.skillNode.create({
          data: {
            slug,
            title,
            description: `A grammar pattern identified in your recent conversations that needs practice.`,
            category: 'Emerging Skills',
            level: 1,
            xpReward: 30,
            isCustom: true,
          },
          include: { prerequisites: { select: { id: true } } },
        });
      }
    }

    if (!node) {
      return NextResponse.json({ error: 'Skill node not found and could not be created' }, { status: 404 });
    }

    let unlockedIds = new Set<string>();

    if (node.prerequisites.length > 0) {
      const userWithNodes = await prisma.user.findUnique({
        where: { id: user.id },
        select: { unlockedNodes: { select: { id: true } } },
      });
      unlockedIds = new Set(userWithNodes?.unlockedNodes.map((n) => n.id) ?? []);
      const allPrereqsMet = node.prerequisites.every((p) => unlockedIds.has(p.id));

      if (!allPrereqsMet) {
        return NextResponse.json({ error: 'Prerequisites not met' }, { status: 400 });
      }
    } else {
      // Fetch unlockedIds even if no prereqs, to check if already unlocked
      const userWithNodes = await prisma.user.findUnique({
        where: { id: user.id },
        select: { unlockedNodes: { select: { id: true } } },
      });
      unlockedIds = new Set(userWithNodes?.unlockedNodes.map((n) => n.id) ?? []);
    }

    const isAlreadyUnlocked = unlockedIds.has(node.id);
    const depthBonus = isAlreadyUnlocked ? 0 : SKILL_UNLOCK_DEPTH_BONUS;

    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { diveDepth: true, maxDiveDepth: true },
    });
    const currentDepth = currentUser?.diveDepth ?? 0;
    const newDepth = Math.min(200, currentDepth + depthBonus);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        unlockedNodes: { connect: { id: node.id } },
        diveDepth: newDepth,
        maxDiveDepth: newDepth > (currentUser?.maxDiveDepth ?? 0) ? newDepth : undefined,
      },
      select: { diveDepth: true },
    });

    if (quizScore > 0 && quizTotal > 0) {
      await prisma.userSkillProgress.upsert({
        where: { userId_nodeSlug: { userId: user.id, nodeSlug: slug } },
        update: {
          practiced: { increment: quizTotal },
          correct: { increment: quizScore },
        },
        create: {
          userId: user.id,
          nodeSlug: slug,
          practiced: quizTotal,
          correct: quizScore,
        },
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      user: { diveDepth: updatedUser.diveDepth },
      unlockedNodeSlug: node.slug,
      depthBonus,
    });
  } catch (error) {
    console.error('Skill Tree Unlock Error:', error);
    return NextResponse.json({ error: 'Failed to unlock skill' }, { status: 500 });
  }
}
