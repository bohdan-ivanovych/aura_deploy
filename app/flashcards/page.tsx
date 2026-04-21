import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import FlashcardsDashboardClient from './FlashcardsDashboardClient';

export const dynamic = 'force-dynamic';

export default async function FlashcardsPage() {
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

  const mistakesDeck = decks.find(d => d.title === 'My Mistakes');
  const customDecks = decks.filter(d => d.title !== 'My Mistakes');
  const mistakesCount = mistakesDeck ? mistakesDeck._count.cards : 0;

  return (
    <FlashcardsDashboardClient 
      userId={user.id} 
      decks={customDecks} 
      mainDeckCardCount={mainDeckCardsCount} 
      starredCardCount={starredCardsCount}
      learningCount={learningCount}
    />
  );
}
