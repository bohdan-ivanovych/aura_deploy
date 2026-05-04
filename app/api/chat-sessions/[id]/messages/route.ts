import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/api-utils';

const MESSAGE_SELECT = {
  id: true,
  text: true,
  sender: true,
  senderType: true,
  senderPersonaId: true,
  grammarCorrection: true,
  weaknessIdentified: true,
  xpReward: true,
  createdAt: true,
  edited: true,
  originalText: true,
  blockedBy: true,
  errorSpan: true,
  reaction: true,
  isAudio: true,
  audioDuration: true,
  isHiddenFromChat: true,
  senderPersona: {
    select: { id: true, name: true, avatarUrl: true },
  },
} as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const user = await getOrCreateUser();

    // Verify session belongs to user
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found or inaccessible' }, { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: {
        chatSessionId: sessionId,
        isHiddenFromChat: false,
      },
      select: MESSAGE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    messages.reverse();

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
