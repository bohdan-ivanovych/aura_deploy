import { getOrCreateUser, handleApiError, createSuccessResponse } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getOrCreateUser();

    const [decks, mainDeckCardsCount, starredCardsCount, learningCount] = await Promise.all([
      prisma.deck.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { cards: true } },
        },
      }),
      prisma.flashcard.count({
        where: { userId: user.id, deckId: null },
      }),
      prisma.flashcard.count({
        where: { userId: user.id, isStarred: true },
      }),
      prisma.flashcard.count({
        where: { userId: user.id, fsrsScheduledDays: { lt: 21 } },
      })
    ]);

    const grammarMistakesDeck = decks.find(d => d.title === 'Grammar Mistakes');
    const vocabMistakesDeck = decks.find(d => d.title === 'Vocabulary Mistakes');
    const legacyMistakesDeck = decks.find(d => d.title === 'My Mistakes');
    
    const customDecks = decks.filter(d => 
      d.title !== 'Grammar Mistakes' && 
      d.title !== 'Vocabulary Mistakes' && 
      d.title !== 'My Mistakes'
    );

    return createSuccessResponse({
      decks: customDecks,
      mainDeckCardCount: mainDeckCardsCount,
      starredCardCount: starredCardsCount,
      learningCount: learningCount,
      
      grammarMistakesCount: grammarMistakesDeck ? grammarMistakesDeck._count.cards : 0,
      grammarMistakesDeckId: grammarMistakesDeck?.id ?? null,
      
      vocabMistakesCount: vocabMistakesDeck ? vocabMistakesDeck._count.cards : 0,
      vocabMistakesDeckId: vocabMistakesDeck?.id ?? null,

      legacyMistakesCount: legacyMistakesDeck ? legacyMistakesDeck._count.cards : 0,
      legacyMistakesDeckId: legacyMistakesDeck?.id ?? null,
    });
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'Flashcards Dashboard API Error');
    return Response.json({ error: errorMessage }, { status });
  }
}
