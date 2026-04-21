import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getOrCreateUser();

    const weaknesses = await prisma.grammarWeakness.findMany({
      where: {
        userId: user.id,
        rule: { not: { startsWith: 'strength:' } },
      },
      orderBy: { count: 'desc' },
      take: 10,
    });

    const strengths = await prisma.grammarWeakness.findMany({
      where: {
        userId: user.id,
        rule: { startsWith: 'strength:' },
      },
      orderBy: { count: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      weaknesses: weaknesses.map(w => ({
        rule: w.rule,
        count: w.count,
        lastSeen: w.lastSeen,
      })),
      strengths: strengths.map(s => ({
        rule: s.rule.replace(/^strength:/, ''),
        count: s.count,
        lastSeen: s.lastSeen,
      })),
    });
  } catch (err) {
    console.error('weaknesses GET error', err);
    return NextResponse.json({ weaknesses: [], strengths: [] }, { status: 500 });
  }
}
