import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/api-utils';

export async function DELETE(req: Request) {
  try {
    const user = await getOrCreateUser();
    const body = await req.json().catch(() => ({}));
    const { endpoint } = body;

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
    console.error('DELETE /api/push/unsubscribe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
