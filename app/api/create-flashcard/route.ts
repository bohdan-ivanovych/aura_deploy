import { NextResponse } from 'next/server';
import { createFlashcard } from '@/app/actions/flashcard';
import { getOrCreateUser } from '@/lib/auth/api-utils';

export async function POST(req: Request) {
  try {
    // Always use the authenticated user — never trust userId from the body
    const user = await getOrCreateUser();
    const body = await req.json();
    const { front, back, type, contextSentence, englishExplanation, deckId } = body;

    if (!front?.trim()) {
      return NextResponse.json({ error: 'Missing word' }, { status: 400 });
    }

    const card = await createFlashcard(
      user.id,
      front ?? '',
      back ?? '',
      type ?? 'translation',
      contextSentence ?? null,
      englishExplanation ?? null,
      deckId ?? null,
    );
    return NextResponse.json(card);
  } catch (error) {
    const msg = (error as Error).message || 'Unknown';
    const isAlreadyExists = msg.includes('already in');
    return NextResponse.json({ error: msg }, { status: isAlreadyExists ? 409 : 500 });
  }
}
