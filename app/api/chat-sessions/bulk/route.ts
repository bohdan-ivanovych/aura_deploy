import { getOrCreateUser, createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

export async function DELETE(req: Request) {
  try {
    const user = await getOrCreateUser();
    const body = await req.json();
    const { sessionIds } = body;

    if (!Array.isArray(sessionIds)) {
      return createErrorResponse('sessionIds must be an array', 400);
    }

    // verify ownership
    await prisma.chatSession.deleteMany({
      where: {
        id: { in: sessionIds },
        userId: user.id
      }
    });

    return createSuccessResponse({ success: true, deletedIds: sessionIds });
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'Failed to delete chat sessions');
    return createErrorResponse(errorMessage, status);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getOrCreateUser();
    const body = await req.json();
    const { sessionIds, isPinned } = body;

    if (!Array.isArray(sessionIds) || typeof isPinned !== 'boolean') {
      return createErrorResponse('Invalid request body', 400);
    }

    await prisma.chatSession.updateMany({
      where: {
        id: { in: sessionIds },
        userId: user.id
      },
      data: {
        isPinned
      }
    });

    return createSuccessResponse({ success: true, pinnedIds: sessionIds, isPinned });
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'Failed to update chat sessions');
    return createErrorResponse(errorMessage, status);
  }
}
