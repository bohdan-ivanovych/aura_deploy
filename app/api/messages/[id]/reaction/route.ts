import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/api-utils';

const VALID_REACTIONS = new Set(['😂', '🔥', '💯', '🙄', '❤️', '🫡', '🤡', '🤨', '🤬', '💀']);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getOrCreateUser();
    const text = await req.text();
    const body = text ? JSON.parse(text) : {};
    const reaction = typeof body?.reaction === 'string' ? body.reaction : null;

    if (reaction && !VALID_REACTIONS.has(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
    }

    // Verify the message belongs to a session the user has access to
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        chatSession: {
          select: { userId: true },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.chatSession?.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { reaction: reaction ?? null },
      select: { id: true, reaction: true },
    });

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error('reaction error', error);
    return NextResponse.json({ error: 'Failed to save reaction' }, { status: 500 });
  }
}
