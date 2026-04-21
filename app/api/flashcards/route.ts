import { getOrCreateUser, handleApiError, createSuccessResponse, createErrorResponse } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    const { searchParams } = new URL(req.url);
    const dueOnly = searchParams.get('due') === '1';

    const cards = await prisma.flashcard.findMany({
      where: {
        userId: user.id,
        ...(dueOnly ? { nextReview: { lte: new Date() } } : {}),
      },
      orderBy: dueOnly
        ? { nextReview: 'asc' }
        : { createdAt: 'desc' },
      select: {
        id: true,
        front: true,
        back: true,
        englishExplanation: true,
        contextSentence: true,
        type: true,
        fsrsState: true,
        fsrsReps: true,
        fsrsScheduledDays: true,
        fsrsStability: true,
        fsrsDifficulty: true,
        nextReview: true,
        lastReview: true,
        isStarred: true,
        status: true,
        errorCount: true,
      },
    });

    return createSuccessResponse({ cards });
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'Flashcards API Error');
    return createErrorResponse(errorMessage, status);
  }
}

