'use server';

import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { makeAIJsonCompletion } from '@/lib/ai/multi-groq';
import { createEmptyCard } from 'ts-fsrs';

export async function addCallGrammarToLearningList(
  mistake: string,
  correction: string,
  tip: string,
  sessionId: string,
) {
  const user = await getOrCreateUser();

  try {
    const prompt = `Analyze this ESL English mistake and correction.
Mistake: "${mistake}"
Correction: "${correction}"
Tip: "${tip}"

Extract or construct the following into JSON:
- mistake_sentence: the full sentence with the mistake
- correct_sentence: the full corrected sentence
- wrong_word: the specific word/phrase that is wrong (from mistake_sentence)
- correct_word: the corrected word/phrase
- distractor_word: a plausible but incorrect alternative word that an English learner might guess (must not be the correct_word).

Respond ONLY with valid JSON matching these 5 keys.`;

    const trimodalData = await makeAIJsonCompletion<{
      mistake_sentence: string;
      correct_sentence: string;
      wrong_word: string;
      correct_word: string;
      distractor_word: string;
    }>({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    // 1. Get or Create "My Mistakes" Deck
    let mistakesDeck = await prisma.deck.findFirst({
      where: { userId: user.id, title: 'My Mistakes' },
    });

    if (!mistakesDeck) {
      mistakesDeck = await prisma.deck.create({
        data: {
          userId: user.id,
          title: 'My Mistakes',
          description: 'Auto-generated trimodal flashcards from your conversation mistakes.',
        },
      });
    }

    const newCard = createEmptyCard(new Date());

    // 2. Create the Flashcard natively
    await prisma.flashcard.create({
      data: {
        userId: user.id,
        deckId: mistakesDeck.id,
        front: mistake,
        back: correction,
        englishExplanation: tip,
        contextSentence: `Created from a conversation mistake.`,
        type: 'trimodal',
        
        mistakeSentence: trimodalData.mistake_sentence,
        correctSentence: trimodalData.correct_sentence,
        wrongWord: trimodalData.wrong_word,
        correctWord: trimodalData.correct_word,
        distractorWord: trimodalData.distractor_word,
        judgeIsCorrect: Math.random() > 0.5,

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

    // 3. (Optional) Also log it in LearningItem for legacy tracking, but marked 'isPromoted' true
    await prisma.learningItem.create({
      data: {
        userId: user.id,
        original: mistake,
        corrected: correction,
        rule: 'Grammar Context',
        explanation: tip,
        sourceType: 'call',
        sessionId: sessionId,
        deckId: mistakesDeck.id,
        isPromoted: true,
      },
    });

    const { revalidatePath } = require('next/cache');
    revalidatePath('/flashcards');

    return { success: true };
  } catch (error) {
    console.error('Failed to add learning item:', error);
    throw new Error('Failed to save to Learning List');
  }
}

export async function promoteAIMessageToFlashcard(aiMessageId: string) {
  const user = await getOrCreateUser();

  const aiMessage = await prisma.message.findUnique({
    where: { id: aiMessageId, chatSessionId: { not: null } },
  });

  if (!aiMessage || aiMessage.sender !== 'AI') throw new Error('Invalid message');

  const prevUserMessage = await prisma.message.findFirst({
    where: {
      chatSessionId: aiMessage.chatSessionId,
      sender: 'USER',
      createdAt: { lte: aiMessage.createdAt },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!prevUserMessage) throw new Error('User message not found');

  const mistake = prevUserMessage.text;
  const correctionSpan = prevUserMessage.errorSpan as any;
  const correction = correctionSpan?.corrected || '';
  const tip = aiMessage.grammarCorrection || '';

  return await addCallGrammarToLearningList(mistake, correction, tip, aiMessage.chatSessionId!);
}
