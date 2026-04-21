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

    await prisma.message.deleteMany({ where: { chatSessionId: id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Clear messages error:', error);
    return NextResponse.json({ error: 'Failed to clear messages' }, { status: 500 });
  }
}
