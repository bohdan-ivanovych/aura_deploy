"use server";

import prisma from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { fsrs, Rating, createEmptyCard, Card as FSRSCard } from 'ts-fsrs';

const f = fsrs({});

// --- DECK ACTIONS ---

export async function createDeck(userId: string, title: string, description?: string, isPublic = false) {
  const deck = await prisma.deck.create({
    data: { userId, title, description, isPublic },
  });
  revalidatePath('/flashcards');
  return deck;
}

export async function updateDeck(deckId: string, userId: string, data: { title?: string; description?: string; isPublic?: boolean }) {
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw new Error('Deck not found');
  
  const updated = await prisma.deck.update({
    where: { id: deckId },
    data,
  });
  revalidatePath('/flashcards');
  return updated;
}

export async function deleteDeck(deckId: string, userId: string) {
  const deck = await prisma.deck.findFirst({ where: { id: deckId, userId } });
  if (!deck) throw new Error('Deck not found');
  
  await prisma.deck.delete({ where: { id: deckId } });
  revalidatePath('/flashcards');
}

export async function importPublicDeck(userId: string, publicDeckId: string) {
  const publicDeck = await prisma.deck.findUnique({ 
    where: { id: publicDeckId },
    include: { cards: true }
  });
  if (!publicDeck || !publicDeck.isPublic) throw new Error('Deck not available');

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  const nativeLanguage = currentUser?.nativeLanguage || 'en';

  // Initialize FSRS state for every card
  const emptyCard = createEmptyCard(new Date());

  const finalCards = [];
  for (const card of publicDeck.cards) {
    let translatedBack = card.back;
    
    // Translate to user's native language if needed
    if (nativeLanguage && nativeLanguage !== 'en') {
      try {
        const gRes = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${nativeLanguage}&dt=t&q=${encodeURIComponent(card.back)}`
        );
        if (gRes.ok) {
          const tData = await gRes.json();
          if (tData && tData[0] && tData[0][0]) {
            translatedBack = tData[0][0][0];
          }
        }
      } catch (e) {
        console.error('Failed to translate card:', e);
      }
    }

    finalCards.push({
      userId,
      front: card.front,
      back: translatedBack,
      englishExplanation: card.englishExplanation,
      type: card.type,
      contextSentence: card.contextSentence,
      deckId: null, // Add to Main Collection
      // Standalone FSRS fields — initialized fresh for this user
      fsrsState: emptyCard.state,
      fsrsStability: emptyCard.stability,
      fsrsDifficulty: emptyCard.difficulty,
      fsrsElapsedDays: emptyCard.elapsed_days,
      fsrsScheduledDays: emptyCard.scheduled_days,
      fsrsReps: emptyCard.reps,
      fsrsLapses: emptyCard.lapses,
      nextReview: emptyCard.due,
    });
  }

  // Add all cards to Main Collection (deckId = null)
  await prisma.flashcard.createMany({
    data: finalCards,
    skipDuplicates: true,
  });

  revalidatePath('/flashcards');
  return { success: true, importedCount: finalCards.length };
}

export async function toggleDeckLike(userId: string, deckId: string) {
  const existingLike = await prisma.deckLike.findUnique({
    where: { userId_deckId: { userId, deckId } }
  });

  if (existingLike) {
    await prisma.deckLike.delete({ where: { id: existingLike.id } });
    await prisma.deck.update({ where: { id: deckId }, data: { likesCount: { decrement: 1 } } });
  } else {
    await prisma.deckLike.create({ data: { userId, deckId } });
    await prisma.deck.update({ where: { id: deckId }, data: { likesCount: { increment: 1 } } });
  }
}

// --- FLASHCARD ACTIONS ---

export async function createFlashcard(
  userId: string | null,
  front: string,
  back: string,
  type: string,
  contextSentence: string | null,
  englishExplanation?: string | null,
  deckId?: string | null
) {
  let user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (!user) user = await prisma.user.findFirst();
  if (!user) user = await prisma.user.create({ data: { email: 'demo@local', name: 'Demo User' } });

  const existing = await prisma.flashcard.findFirst({
    where: { userId: user.id, front, deckId: deckId || null },
  });

  if (existing) {
    throw new Error('Word already in this deck');
  }

  const newCard = createEmptyCard(new Date());

  const card = await prisma.flashcard.create({
    data: {
      userId: user.id,
      deckId: deckId || null,
      front,
      back: back ?? '',
      type: type ?? 'translation',
      contextSentence: contextSentence ?? null,
      englishExplanation: englishExplanation ?? null,
      
      fsrsState: newCard.state,
      fsrsStability: newCard.stability,
      fsrsDifficulty: newCard.difficulty,
      fsrsElapsedDays: newCard.elapsed_days,
      fsrsScheduledDays: newCard.scheduled_days,
      fsrsReps: newCard.reps,
      fsrsLapses: newCard.lapses,
      nextReview: newCard.due,
    },
  });

  revalidatePath('/flashcards');
  return card;
}

export async function updateFlashcard(
  id: string,
  userId: string | null,
  data: { front?: string; back?: string; englishExplanation?: string | null; isStarred?: boolean; status?: string }
) {
  if (!userId) throw new Error('Unauthorized');

  const card = await prisma.flashcard.findFirst({ where: { id, userId } });
  if (!card) throw new Error('Flashcard not found or unauthorized');

  const updated = await prisma.flashcard.update({
    where: { id },
    data,
  });
  
  revalidatePath('/flashcards');
  return updated;
}

export async function toggleStar(id: string, userId: string) {
  const card = await prisma.flashcard.findFirst({ where: { id, userId } });
  if (!card) throw new Error('Not found');
  await prisma.flashcard.update({ where: { id }, data: { isStarred: !card.isStarred }});
  revalidatePath('/flashcards');
}

export async function updateFlashcardStatus(id: string, userId: string, status: string) {
  const card = await prisma.flashcard.findFirst({ where: { id, userId } });
  if (!card) throw new Error('Not found');
  await prisma.flashcard.update({ where: { id }, data: { status }});
}

export async function deleteFlashcard(id: string, userId: string | null) {
  if (!userId) throw new Error('Unauthorized');

  const card = await prisma.flashcard.findFirst({ where: { id, userId } });
  if (!card) throw new Error('Flashcard not found or unauthorized');

  await prisma.flashcard.delete({ where: { id } });
  revalidatePath('/flashcards');
}

export async function binaryReviewFlashcard(id: string, isCorrect: boolean, userId?: string) {
  const card = await prisma.flashcard.findUnique({ where: { id } });
  if (!card) throw new Error('Flashcard not found');

  if (userId && card.userId !== userId) {
    throw new Error('Unauthorized');
  }

  const currentFSRSCard = {
    due: card.nextReview,
    stability: card.fsrsStability,
    difficulty: card.fsrsDifficulty,
    elapsed_days: card.fsrsElapsedDays,
    scheduled_days: card.fsrsScheduledDays,
    reps: card.fsrsReps,
    lapses: card.fsrsLapses,
    state: card.fsrsState,
    last_review: card.lastReview || undefined,
  } as unknown as FSRSCard;

  const rating = isCorrect ? Rating.Good : Rating.Again;
  const schedulingCards = f.repeat(currentFSRSCard, new Date());
  
  // Use casting to any first to bypass complex type constraints in ts-fsrs for mapping
  const nextCard = (schedulingCards as any)[rating].card as FSRSCard;

  const newErrorCount = isCorrect ? card.errorCount : card.errorCount + 1;
  const isZombie = newErrorCount >= 3;
  const status = isZombie ? 'zombie' : (nextCard.scheduled_days >= 21 ? 'known' : 'learning');

  const updatedCard = await prisma.flashcard.update({
    where: { id },
    data: {
      fsrsState: nextCard.state,
      fsrsStability: nextCard.stability,
      fsrsDifficulty: nextCard.difficulty,
      fsrsElapsedDays: nextCard.elapsed_days,
      fsrsScheduledDays: nextCard.scheduled_days,
      fsrsReps: nextCard.reps,
      fsrsLapses: nextCard.lapses,
      nextReview: nextCard.due,
      lastReview: new Date(),
      errorCount: newErrorCount,
      status: status,
    },
  });

  if (isCorrect) {
    await prisma.user.update({
      where: { id: card.userId },
      data: { xp: { increment: 3 } },
    });
  }

  return updatedCard;
}
