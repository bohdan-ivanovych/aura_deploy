import { getOrCreateUser, handleApiError, createSuccessResponse, createErrorResponse } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser();
    const body = await req.json();
    const { title, cards } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return createErrorResponse('Deck title is required', 400);
    }

    const deckData: any = {
      userId: user.id,
      title: title.trim(),
    };

    if (Array.isArray(cards) && cards.length > 0) {
      deckData.cards = {
        create: cards.map((c: any) => ({
          userId: user.id,
          front: c.front,
          back: c.back,
          sourceTag: 'import',
        })),
      };
    }

    const deck = await prisma.deck.create({
      data: deckData,
      include: { cards: true },
    });

    return createSuccessResponse({ deck });
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'Create Deck API Error');
    return createErrorResponse(errorMessage, status);
  }
}
