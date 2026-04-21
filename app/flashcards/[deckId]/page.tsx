import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import DeckDetailsClient from './DeckDetailsClient';

export const dynamic = 'force-dynamic';

export default async function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const user = await getOrCreateUser();
  const resolvedParams = await params;
  const { deckId } = resolvedParams;

  let deckTitle = 'Main Collection';
  let isSystemDeck = false;

  if (deckId === 'main') {
    isSystemDeck = true;
  } else if (deckId === 'stars') {
    isSystemDeck = true;
    deckTitle = 'Polar Stars';
  } else {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: user.id },
    });
    if (!deck) return notFound();
    deckTitle = deck.title;
  }

  // Fetch cards based on deck mode
  const rawCards = await prisma.flashcard.findMany({
    where: {
      userId: user.id,
      ...(deckId === 'main' ? { deckId: null } : deckId === 'stars' ? { isStarred: true } : { deckId }),
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <DeckDetailsClient 
      userId={user.id} 
      deckId={isSystemDeck ? (deckId === 'stars' ? 'stars' : null) : deckId} 
      deckTitle={deckTitle} 
      cards={rawCards}
      isSystemDeck={isSystemDeck}
    />
  );
}
