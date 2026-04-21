import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/api-utils';

const RequestSchema = z.object({
  identifier: z.string().min(1),
});

// GET /api/friends — list all friendships for the current user
export async function GET() {
  try {
    const me = await getOrCreateUser();

    const [sent, received] = await Promise.all([
      prisma.friendship.findMany({
        where: { senderId: me.id },
        include: { receiver: { select: { id: true, name: true, email: true, xp: true, streak: true, diveDepth: true, lastActiveAt: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.friendship.findMany({
        where: { receiverId: me.id },
        include: { sender: { select: { id: true, name: true, email: true, xp: true, streak: true, diveDepth: true, lastActiveAt: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({ sent, received });
  } catch (error) {
    console.error('GET /api/friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/friends — send a friend request (body: { email })
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' }, { status: 400 });
    }

    const me = await getOrCreateUser();
    const { identifier } = parsed.data;
    const trimmed = identifier.trim();

    const isEmail = trimmed.includes('@');
    const target = isEmail
      ? await prisma.user.findUnique({ where: { email: trimmed } })
      : await (prisma.user as any).findUnique({ where: { username: trimmed.toLowerCase().replace(/^@/, '') } });

    if (!target) {
      return NextResponse.json({ error: isEmail ? 'No user found with that email.' : 'No user found with that username.' }, { status: 404 });
    }

    if (target.id === me.id) {
      return NextResponse.json({ error: "You can't add yourself." }, { status: 400 });
    }

    // Check if a friendship already exists in either direction
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: me.id, receiverId: target.id },
          { senderId: target.id, receiverId: me.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'Already friends.' }, { status: 409 });
      }
      if (existing.status === 'PENDING') {
        return NextResponse.json({ error: 'Request already pending.' }, { status: 409 });
      }
      if (existing.status === 'BLOCKED') {
        return NextResponse.json({ error: 'Unable to send request.' }, { status: 403 });
      }
    }

    const friendship = await prisma.friendship.create({
      data: { senderId: me.id, receiverId: target.id, status: 'PENDING' },
      include: { receiver: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(friendship, { status: 201 });
  } catch (error) {
    console.error('POST /api/friends error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
