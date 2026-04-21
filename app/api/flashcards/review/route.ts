import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { binaryReviewFlashcard } from '@/app/actions/flashcard';

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    let body: { id?: string; remembered?: boolean };
    try {
      const text = await req.text();
      body = text ? (JSON.parse(text) as { id?: string; remembered?: boolean }) : {};
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { id, remembered } = body;
    if (!id || typeof remembered !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload: id and remembered (boolean) required' }, { status: 400 });
    }

    const card = await binaryReviewFlashcard(id, remembered, user.id);
    return NextResponse.json(card);
  } catch (error) {
    const msg = (error as Error).message || 'Failed to review';
    const status = msg === 'Unauthorized' ? 403 : 500;
    console.error('flashcard review error', error);
    return NextResponse.json({ error: msg }, { status });
  }
}
