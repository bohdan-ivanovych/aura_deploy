import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { sendPushToUser } from '@/app/api/push/send/route';

export async function GET(req: Request) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const results: string[] = [];

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        diveDepth: true,
        streak: true,
        lastActiveAt: true,
        sentFriendships: {
          where: { status: 'ACCEPTED' },
          include: { receiver: { select: { name: true, diveDepth: true } } },
        },
        receivedFriendships: {
          where: { status: 'ACCEPTED' },
          include: { sender: { select: { name: true, diveDepth: true } } },
        },
      },
    });

    for (const user of users) {
      const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
      if (!lastActive) continue;

      const diffDays = Math.floor((now.getTime() - lastActive.getTime()) / 86400000);

      if (diffDays === 4) {
        const decayDays = diffDays - 3;
        const decayedDepth = Math.max(0, user.diveDepth - Math.min(decayDays, 10));
        await sendPushToUser({
          userId: user.id,
          title: "You're surfacing 🌊",
          body: `Your depth dropped to ${decayedDepth}m. Dive now to recover.`,
          url: '/',
        });
        results.push(`atrophy:${user.id}`);
      }

      const allFriends = [
        ...user.sentFriendships.map(f => ({ name: f.receiver.name, depth: f.receiver.diveDepth })),
        ...user.receivedFriendships.map(f => ({ name: f.sender.name, depth: f.sender.diveDepth })),
      ];
      const topFriend = allFriends.sort((a, b) => b.depth - a.depth)[0];
      if (topFriend && topFriend.depth > user.diveDepth) {
        await sendPushToUser({
          userId: user.id,
          title: `@${topFriend.name ?? 'A friend'} just passed you`,
          body: `They're at ${topFriend.depth}m. You're at ${user.diveDepth}m.`,
          url: '/friends',
        });
        results.push(`overtake:${user.id}`);
      }

      const todayUTC = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastStreakDay = user.lastActiveAt
        ? new Date(
            new Date(user.lastActiveAt).getFullYear(),
            new Date(user.lastActiveAt).getMonth(),
            new Date(user.lastActiveAt).getDate()
          )
        : null;
      const isStreakAtRisk =
        user.streak > 0 &&
        lastStreakDay &&
        lastStreakDay.getTime() === todayUTC.getTime() - 86400000 &&
        now.getHours() >= 20;

      if (isStreakAtRisk) {
        await sendPushToUser({
          userId: user.id,
          title: 'Your streak ends tonight 🔥',
          body: `${user.streak} days. Don't lose it now.`,
          url: '/chat',
        });
        results.push(`streak:${user.id}`);
      }
    }

    return NextResponse.json({ ok: true, sent: results.length, details: results });
  } catch (error) {
    console.error('Cron notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
