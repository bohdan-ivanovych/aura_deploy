import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        text: true,
        sender: true,
        senderType: true,
        grammarCorrection: true,
        weaknessIdentified: true,
        bonusXP: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Room GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
