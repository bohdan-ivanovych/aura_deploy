import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';

const MESSAGE_SELECT = {
  id: true,
  text: true,
  sender: true,
  senderType: true,
  senderPersonaId: true,
  grammarCorrection: true,
  weaknessIdentified: true,
  bonusXP: true,
  createdAt: true,
  edited: true,
  originalText: true,
  blockedBy: true,
  errorSpan: true,
  reaction: true,
  isAudio: true,
  audioDuration: true,
  isHiddenFromChat: true,
  senderPersona: {
    select: { id: true, name: true, avatarUrl: true },
  },
} as const;

const PERSONA_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  voiceId: true,
  voiceSettings: true,
} as const;

export async function getChatSessions() {
  const user = await getOrCreateUser();

  const sessions = await prisma.chatSession.findMany({
    where: {
      userId: user.id,
    },
    include: {
      persona: { select: PERSONA_SELECT },
      messages: {
        where: { isHiddenFromChat: false },
        select: MESSAGE_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      personas: {
        include: {
          persona: { select: PERSONA_SELECT },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Filter out ghost sessions (0 messages) so they don't clutter the history
  return sessions
    .filter(s => s.messages.length > 0)
    .map(s => {
      const multiPersona = s.personas.length > 1;
      return {
        ...s,
        persona: s.persona ?? s.personas[0]?.persona ?? { id: '', name: 'Unknown', avatarUrl: null, voiceId: null, voiceSettings: null },
        multiPersona,
      };
    });
}

export async function createOrGetChatSession(personaId?: string) {
  const user = await getOrCreateUser();

  let targetPersonaId = personaId;
  if (!targetPersonaId) {
     const firstPersona = await prisma.persona.findFirst();
     if (!firstPersona) throw new Error('No personas found in the database');
     targetPersonaId = firstPersona.id;
  }

  const persona = await prisma.persona.findUnique({
    where: { id: targetPersonaId },
    select: PERSONA_SELECT,
  });

  if (!persona) throw new Error('Persona not found');

  // Try to find existing 1:1 session via the unique constraint
  const existing = await prisma.chatSession.findUnique({
    where: {
      userId_personaId: { userId: user.id, personaId: targetPersonaId },
    },
    include: {
      persona: { select: PERSONA_SELECT },
      messages: {
        where: { isHiddenFromChat: false },
        select: MESSAGE_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      personas: {
        include: { persona: { select: PERSONA_SELECT } },
      },
    },
  });

  if (existing) {
    // Mark unread as read on open
    if (existing.unreadCount > 0) {
      await prisma.chatSession.update({
        where: { id: existing.id },
        data: { unreadCount: 0 },
      });
    }
    return {
      ...existing,
      persona: existing.persona ?? persona,
      multiPersona: existing.personas.length > 1,
    };
  }

  // Create new 1:1 session
  const session = await prisma.chatSession.create({
    data: {
      userId: user.id,
      personaId: targetPersonaId,
      participants: { create: { userId: user.id } },
      personas: { create: { personaId: targetPersonaId } },
    },
    include: {
      persona: { select: PERSONA_SELECT },
      messages: {
        where: { isHiddenFromChat: false },
        select: MESSAGE_SELECT,
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      personas: {
        include: { persona: { select: PERSONA_SELECT } },
      },
    },
  });

  return {
    ...session,
    persona: session.persona ?? persona,
    multiPersona: false,
  };
}
