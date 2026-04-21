import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser();
    const resolvedParams = await params;
    
    // Attempt to verify the persona exists
    const personaId = resolvedParams.id;
    if (!personaId) {
      return new Response(JSON.stringify({ error: 'Missing persona ID' }), { status: 400 });
    }

    // Neural wipe: delete only non-global facts isolated to this persona
    const result = await prisma.userMemory.deleteMany({
      where: {
        userId: user.id,
        personaId: personaId,
        isGlobal: false,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Non-global memory wiped for this persona',
        deletedCount: result.count
      }), 
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[Memory Wipe API] Error:', err);
    return new Response(JSON.stringify({ error: 'Failed to wipe memory' }), { status: 500 });
  }
}
