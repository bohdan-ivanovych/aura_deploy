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

  const grammarMistakesDeck = decks.find(d => d.title === 'Grammar Mistakes');
  const vocabMistakesDeck = decks.find(d => d.title === 'Vocabulary Mistakes');
  // Legacy support for users who had "My Mistakes"
  const legacyMistakesDeck = decks.find(d => d.title === 'My Mistakes');
  
  const customDecks = decks.filter(d => 
    d.title !== 'Grammar Mistakes' && 
    d.title !== 'Vocabulary Mistakes' && 
    d.title !== 'My Mistakes'
  );

  return (
    <FlashcardsDashboardClient 
      userId={user.id} 
      decks={customDecks} 
      mainDeckCardCount={mainDeckCardsCount} 
      starredCardCount={starredCardsCount}
      learningCount={learningCount}
      
      grammarMistakesCount={grammarMistakesDeck ? grammarMistakesDeck._count.cards : 0}
      grammarMistakesDeckId={grammarMistakesDeck?.id ?? null}
      
      vocabMistakesCount={vocabMistakesDeck ? vocabMistakesDeck._count.cards : 0}
      vocabMistakesDeckId={vocabMistakesDeck?.id ?? null}

      legacyMistakesCount={legacyMistakesDeck ? legacyMistakesDeck._count.cards : 0}
      legacyMistakesDeckId={legacyMistakesDeck?.id ?? null}
    />
  );
}
