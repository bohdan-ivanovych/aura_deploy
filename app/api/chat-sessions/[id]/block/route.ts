import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth/api-utils';

const MESSAGE_SELECT = {
  id: true,
  text: true,
  sender: true,
  grammarCorrection: true,
  weaknessIdentified: true,
  bonusXP: true,
  createdAt: true,
  edited: true,
  originalText: true,
  blockedBy: true,
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action, reason } = await req.json();

    const user = await getOrCreateUser();

    // Verify the session exists and user is a participant
    const sessionCheck = await prisma.chatSession.findFirst({
      where: {
        id,
        participants: { some: { userId: user.id } },
      },
    });

    if (!sessionCheck) {
      return createErrorResponse('Session not found', 404);
    }

    if (action !== 'block_ai' && action !== 'unblock_ai') {
      return createErrorResponse('Invalid action', 400);
    }

    const isBlocking = action === 'block_ai';

    const updatedSession = await prisma.chatSession.update({
      where: { id },
      data: isBlocking
        ? { blockedBy: 'USER', blockedAt: new Date(), lastBlocked: reason || 'User blocked AI' }
        : { blockedBy: null, blockedAt: null, lastBlocked: null },
      include: {
        messages: {
          select: MESSAGE_SELECT,
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        personas: {
          include: {
            persona: { select: { id: true, name: true, avatarUrl: true, voiceId: true } },
          },
          take: 1,
        },
      },
    });

    // Best-effort system message
    prisma.message.create({
      data: {
        text: isBlocking
          ? "You blocked the AI. The AI won't respond until you unblock it."
          : "You unblocked the AI. The AI can now respond again.",
        sender: 'USER',
        chatSessionId: id,
        blockedBy: isBlocking ? 'USER' : null,
      },
    }).catch(() => null);

    const persona = updatedSession.personas[0]?.persona ?? null;

    return createSuccessResponse({
      session: { ...updatedSession, persona },
      message: `AI ${isBlocking ? 'blocked' : 'unblocked'} successfully`,
    });

  } catch (error) {
    console.error('Error updating session block status:', error);
    return createErrorResponse('Failed to update session', 500);
  }
}
