import { getOrCreateUser, handleApiError, createSuccessResponse, createErrorResponse } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const user = await getOrCreateUser();

    const personas = await prisma.persona.findMany({
      where: {
        OR: [
          { creatorId: null },
          { creatorId: user.id },
          { isPublic: true },
        ],
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: 'asc' },
    });

    const result = personas.map((p) => ({
      ...p,
      creatorName: p.creator
        ? (p.creator.name || p.creator.email?.split('@')[0] || 'Unknown')
        : null,
      isOwn: p.creatorId === user.id,
    }));

    return createSuccessResponse(result);
  } catch (error) {
    const { error: errorMessage, status } = handleApiError(error, 'personas GET error');
    return createErrorResponse(errorMessage, status);
  }
}

function extractPrismaErrorMessage(error: unknown): string {
  const err = error as { code?: string; meta?: { target?: string[] }; message?: string };
  if (err?.code === 'P2002') {
    const target = err?.meta?.target;
    return target?.length
      ? `A persona with this ${(target as string[]).join(', ')} already exists.`
      : 'A persona with these details already exists.';
  }
  if (err?.code === 'P2003') return 'Invalid user reference. Please refresh and try again.';
  if (typeof err?.message === 'string' && err.message) return err.message;
  return 'Failed to create persona';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await getOrCreateUser();

    const name = String(body?.name ?? '').trim() || 'Untitled';
    const description = String(body?.description ?? '').trim() || '';
    const avatarUrl = body?.avatarUrl && String(body.avatarUrl).trim() ? body.avatarUrl : null;
    const systemPrompt = body?.systemPrompt && String(body.systemPrompt).trim() ? body.systemPrompt : null;
    const voiceId = body?.voiceId && typeof body.voiceId === 'string' ? body.voiceId.trim() : null;
    const voiceIdUS = body?.voiceIdUS && typeof body.voiceIdUS === 'string' ? body.voiceIdUS.trim() : null;
    const voiceIdGB = body?.voiceIdGB && typeof body.voiceIdGB === 'string' ? body.voiceIdGB.trim() : null;
    const isPublic = body?.isPublic === true;

    // ── Deduplication guard ────────────────────────────────────────────────
    // Check if this user already has a persona with the same name.
    // This prevents duplicate creation when "Launch" is clicked multiple times.
    const existing = await prisma.persona.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        creatorId: user.id,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    if (existing) {
      return createSuccessResponse({
        ...existing,
        creatorName: existing.creator
          ? (existing.creator.name || existing.creator.email?.split('@')[0] || 'Unknown')
          : null,
        isOwn: true,
      });
    }

    const effectiveVoiceId = voiceIdUS ?? voiceId;
    const voiceSettings = (voiceIdUS || voiceIdGB)
      ? { us: voiceIdUS ?? voiceId, gb: voiceIdGB ?? voiceId }
      : undefined;

    // Create a bot user for this persona (foundation for multiplayer)
    const botUser = await prisma.user.create({
      data: {
        email: `bot_${Date.now()}@aura.bot`,
        name,
      },
    });

    const persona = await prisma.persona.create({
      data: {
        name,
        description,
        avatarUrl,
        systemPrompt,
        creatorId: user.id,
        category: 'custom',
        isPublic,
        botUserId: botUser.id,
        ...(effectiveVoiceId ? { voiceId: effectiveVoiceId } : {}),
        ...(voiceSettings ? { voiceSettings } : {}),
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return createSuccessResponse({
      ...persona,
      creatorName: persona.creator
        ? (persona.creator.name || persona.creator.email?.split('@')[0] || 'Unknown')
        : null,
      isOwn: true,
    });
  } catch (error) {
    const message = extractPrismaErrorMessage(error);
    return createErrorResponse(message);
  }
}
