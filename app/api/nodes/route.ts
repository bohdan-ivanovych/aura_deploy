import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const user = await getOrCreateUser();

    const [userWithNodes, nodes] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { unlockedNodes: { select: { id: true } } },
      }),
      prisma.skillNode.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          category: true,
          level: true,
          xpReward: true,
        },
      }),
    ]);

    const unlockedIds = new Set(userWithNodes?.unlockedNodes.map((n) => n.id) ?? []);
    const nodesWithStatus = nodes.map((node) => ({
      ...node,
      unlocked: unlockedIds.has(node.id),
    }));

    return NextResponse.json({ nodes: nodesWithStatus });
  } catch (error) {
    console.error('API nodes error', error);
    return NextResponse.json({ error: 'Failed to fetch nodes' }, { status: 500 });
  }
}
