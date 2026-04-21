import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import QuizletPracticeClient from './QuizletPracticeClient';

export const dynamic = 'force-dynamic';

export default async function PracticePage({ params }: { params: Promise<{ deckId: string }> }) {
  const user = await getOrCreateUser();
  const resolvedParams = await params;
  const { deckId } = resolvedParams;

  let deckTitle = 'Main Collection';

  if (deckId === 'stars') {
    deckTitle = 'Polar Stars';
  } else if (deckId !== 'main') {
    const deck = await prisma.deck.findFirst({
      where: { id: deckId, userId: user.id },
    });
    if (!deck) return notFound();
    deckTitle = deck.title;
  }

  // Fetch cards
  const cards = await prisma.flashcard.findMany({
    where: {
      userId: user.id,
      ...(deckId === 'main' ? { deckId: null } : deckId === 'stars' ? { isStarred: true } : { deckId }),
    },
    select: { id: true, front: true, back: true, englishExplanation: true, isStarred: true, status: true }
  });

  return <QuizletPracticeClient userId={user.id} deckId={deckId} deckTitle={deckTitle} cards={cards} />;
}
