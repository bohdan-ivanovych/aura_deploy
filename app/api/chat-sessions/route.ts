import { handleApiError, createSuccessResponse, createErrorResponse, getOrCreateUser } from '@/lib/auth/api-utils';
import { getChatSessions, createOrGetChatSession } from '@/lib/data/chat';
import { rateLimit } from '@/lib/utils/rate-limit';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sessions = await getChatSessions();
    return createSuccessResponse({ sessions });
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'Failed to fetch chat sessions');
    return createErrorResponse(errorMessage, status);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();
    const allowed = await rateLimit(`sessions:${user.id}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please slow down.' }, { status: 429 });
    }
    const body = await req.json();
    const personaId = typeof body?.personaId === 'string' ? body.personaId : undefined;
    const session = await createOrGetChatSession(personaId);
    return createSuccessResponse({ session });
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'Failed to initialize chat session');
    return createErrorResponse(errorMessage, status);
  }
}
