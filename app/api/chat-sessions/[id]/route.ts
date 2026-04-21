import { NextResponse, NextRequest } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  const { id } = await params;

  try {
    const session = await prisma.chatSession.findFirst({
      where: { id, participants: { some: { userId: user.id } } },
    });

    if (!session) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }

    await prisma.sessionPersona.deleteMany({ where: { sessionId: id } });
    await prisma.sessionParticipant.deleteMany({ where: { sessionId: id } });
    await prisma.message.deleteMany({ where: { chatSessionId: id } });
    await prisma.chatSession.deleteMany({ where: { id } });

    return NextResponse.json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Failed to delete chat session:', error);
    return NextResponse.json({ error: 'Failed to delete chat session' }, { status: 500 });
  }
}
