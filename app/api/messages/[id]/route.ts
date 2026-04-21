import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

async function assertMessageOwnership(messageId: string, userId: string) {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    include: { chatSession: { include: { participants: { select: { userId: true } } } } },
  });
  if (!msg) return null;
  const isParticipant = msg.chatSession?.participants.some((p) => p.userId === userId);
  return isParticipant ? msg : false;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;
  const { text, reaction } = await req.json();

  if (text === undefined && reaction === undefined) {
    return NextResponse.json({ error: 'Text or reaction required' }, { status: 400 });
  }

  const existing = await assertMessageOwnership(id, user.id);
  if (existing === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing === false) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data: any = {};
  if (text !== undefined) {
    data.text = text.trim();
    data.edited = true;
    data.originalText = existing.originalText ?? existing.text;
  }
  if (reaction !== undefined) {
    data.reaction = reaction === null ? null : reaction;
  }

  const updated = await prisma.message.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateUser();
  const { id } = await params;

  const existing = await assertMessageOwnership(id, user.id);
  if (existing === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing === false) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
