import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/api-utils';

const PatchSchema = z.object({
  status: z.enum(['ACCEPTED', 'BLOCKED']),
});

// PATCH /api/friends/[id] — accept or block a pending request
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getOrCreateUser();

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'status must be ACCEPTED or BLOCKED' }, { status: 400 });
    }

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only the receiver may accept or block
    if (friendship.receiverId !== me.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.friendship.update({
      where: { id },
      data: { status: parsed.data.status },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/friends/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/friends/[id] — remove or cancel a friendship
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const me = await getOrCreateUser();

    const friendship = await prisma.friendship.findUnique({ where: { id } });
    if (!friendship) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only sender or receiver may delete
    if (friendship.senderId !== me.id && friendship.receiverId !== me.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.friendship.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/friends/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
