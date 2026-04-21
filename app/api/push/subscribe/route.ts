import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/api-utils';

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { endpoint, p256dh, auth } = await req.json();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 });
    }

    await (prisma as any).pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, userId: user.id },
      create: { endpoint, p256dh, auth, userId: user.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/push/subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getOrCreateUser();
    const { endpoint } = await req.json().catch(() => ({}));

    if (endpoint) {
      await (prisma as any).pushSubscription.deleteMany({
        where: { endpoint, userId: user.id },
      });
    } else {
      await (prisma as any).pushSubscription.deleteMany({
        where: { userId: user.id },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/push/subscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
