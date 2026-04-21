import { NextResponse } from 'next/server';
import webpush from 'web-push';
import prisma from '@/lib/db/prisma';

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL   = process.env.VAPID_EMAIL       ?? 'mailto:admin@aura.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

export interface PushPayload {
  userId: string;
  title: string;
  body: string;
  url?: string;
}

export async function sendPushToUser(payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const subs = await (prisma as any).pushSubscription.findMany({
    where: { userId: payload.userId },
  });

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  });

  await Promise.allSettled(
    subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notification
      ).catch(async (err: { statusCode?: number }) => {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await (prisma as any).pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
      })
    )
  );
}

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-internal-secret');
    if (secret !== process.env.INTERNAL_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const payload: PushPayload = await req.json();
    await sendPushToUser(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/push/send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
