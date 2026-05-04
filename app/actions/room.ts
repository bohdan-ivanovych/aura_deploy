"use server";

import prisma from '@/lib/db/prisma';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/groq';

import { parseAIReply } from '@/lib/ai/ai-utils';
import {
  INJECTION_GUARD,
  sanitizeUserInput,
  buildConversationXml,
  buildPromptReminder,
} from '@/lib/ai/prompt-guard';

interface RoomAIResponse {
  reply: string;
  targetUser: 'USER_A' | 'USER_B';
  grammarCorrection: string | null;
  weaknessIdentified: string | null;
  xpReward: number;
}

const ROOM_SYSTEM_PROMPT_BODY = `You are Aura, a sharp referee/moderator in a high-stakes English Grammar Deathmatch between two users.
You MUST always stay in character as Aura. Your output must be STRICT JSON — no text before or after.

JSON SHAPE:
{
  "reply": "natural reply addressing the users",
  "targetUser": "USER_A" | "USER_B",
  "grammarCorrection": null | "short correction text",
  "weaknessIdentified": null | "short name of the core grammar rule",
  "xpReward": number
}

Rules:
- Address the users as USER_A and USER_B.
- Roast or praise them based on their English proficiency.
- Set "targetUser" to the user who last spoke or the one you are primarily addressing.
- Provide grammar corrections as needed.
- xpReward: 2 only when a user produces a genuinely impressive sentence. Otherwise 1. 0 for errors.
`;

export async function sendRoomMessage(
  roomId: string,
  userId: string,
  text: string,
  senderType: 'USER_A' | 'USER_B'
) {
  const groq = getGroqClient();

  const message = await prisma.message.create({
    data: {
      text,
      sender: senderType,
      senderType,
      roomId,
    },
  });

  const { getPusherServer } = await import('@/lib/services/pusher');
  const pusherInstance = await getPusherServer();
  await pusherInstance?.trigger(`room-${roomId}`, 'new-message', message);

  const history = await prisma.message.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const fullSystemPrompt = [INJECTION_GUARD, '', ROOM_SYSTEM_PROMPT_BODY].join('\n');
  const safeText = sanitizeUserInput(text);
  const conversationXml = buildConversationXml(
    history.map((m: any) => ({ sender: m.senderType, senderType: m.senderType, text: m.text }))
  );
  const reminder = buildPromptReminder('Aura');
  const userPrompt = `${conversationXml}\n\n<user_message sender="${senderType}">${safeText}</user_message>${reminder}`;

  try {
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 400,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const parsed = parseAIReply<RoomAIResponse>(String(rawContent));

    const aiMessage = await prisma.message.create({
      data: {
        text: parsed.reply,
        sender: 'AI',
        senderType: 'AI_PERSONA',
        roomId,
        grammarCorrection: parsed.grammarCorrection,
        weaknessIdentified: parsed.weaknessIdentified,
        xpReward: typeof parsed.xpReward === 'number' ? parsed.xpReward : (parsed.weaknessIdentified ? 0 : 1),
      },
    });

    await pusherInstance?.trigger(`room-${roomId}`, 'new-message', aiMessage);

    return { success: true, message: aiMessage };
  } catch (error) {
    console.error('Room AI error', error);
    throw error;
  }
}
