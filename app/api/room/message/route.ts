import { NextResponse } from 'next/server';
import { sendRoomMessage } from '@/app/actions/room';

export async function POST(req: Request) {
  try {
    const { roomId, text, senderType, userId } = await req.json();
    if (!roomId || !text?.trim() || !senderType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const result = await sendRoomMessage(
      String(roomId),
      String(userId ?? 'anonymous'),
      String(text).trim(),
      senderType as 'USER_A' | 'USER_B'
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error('Room message error', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
