import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { updateFlashcard, deleteFlashcard } from '@/app/actions/flashcard';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser();
    const { id } = await params;
    const body = await req.json();
    const card = await updateFlashcard(id, user.id, {
      front: body.front,
      back: body.back,
      englishExplanation: body.englishExplanation,
    });
    return NextResponse.json(card);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to update';
    const status = msg.includes('Unauthorized') || msg.includes('not found') ? 403 : 500;
    console.error('flashcard PATCH error', error);
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser();
    const { id } = await params;
    await deleteFlashcard(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to delete';
    const status = msg.includes('Unauthorized') || msg.includes('not found') ? 403 : 500;
    console.error('flashcard DELETE error', error);
    return NextResponse.json({ error: msg }, { status });
  }
}

