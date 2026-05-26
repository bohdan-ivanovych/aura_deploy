import { getOrCreateUser, createSuccessResponse, createErrorResponse } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personaId } = await params;
    const user = await getOrCreateUser();

    // Verify ownership before deleting
    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      select: { creatorId: true, botUserId: true },
    });

    if (!persona) {
      return createErrorResponse('Persona not found', 404);
    }

    if (persona.creatorId !== user.id) {
      return createErrorResponse('Not authorized to delete this persona', 403);
    }

    // Manual cascade: Delete related items to prevent foreign key constraint violations
    await prisma.sessionPersona.deleteMany({ where: { personaId } });
    await prisma.message.deleteMany({ where: { senderPersonaId: personaId } });
    await prisma.chatSession.deleteMany({ where: { personaId } });
    await prisma.userMemory.deleteMany({ where: { personaId } });

    // Delete persona
    await prisma.persona.delete({ where: { id: personaId } });

    // Clean up orphaned bot user if it exists
    if (persona.botUserId) {
      await prisma.user.delete({ where: { id: persona.botUserId } }).catch(() => {
        // Ignore if bot user is referenced elsewhere
      });
    }

    return createSuccessResponse({ deleted: true });
  } catch (error) {
    console.error('Delete persona error:', error);
    return createErrorResponse('Failed to delete persona', 500);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: personaId } = await params;
    const user = await getOrCreateUser();
    const body = await req.json();

    const persona = await prisma.persona.findUnique({
      where: { id: personaId },
      select: { creatorId: true },
    });

    if (!persona) return createErrorResponse('Persona not found', 404);
    if (persona.creatorId !== user.id) return createErrorResponse('Not authorized', 403);

    const updated = await prisma.persona.update({
      where: { id: personaId },
      data: {
        ...(typeof body.name === 'string' && body.name.trim() ? { name: body.name.trim() } : {}),
        ...(typeof body.description === 'string' ? { description: body.description.trim() } : {}),
        ...(typeof body.isPublic === 'boolean' ? { isPublic: body.isPublic } : {}),
        ...(typeof body.avatarUrl === 'string' && body.avatarUrl.trim() ? { avatarUrl: body.avatarUrl.trim() } : {}),
      },
    });

    return createSuccessResponse({ ...updated, isOwn: true });
  } catch (error) {
    console.error('Update persona error:', error);
    return createErrorResponse('Failed to update persona', 500);
  }
}
