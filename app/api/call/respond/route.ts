import { getOrCreateUser } from '@/lib/auth/api-utils';
import { makeAIJsonCompletion, GROQ_MODEL } from '@/lib/ai/multi-groq';
import { rateLimit } from '@/lib/utils/rate-limit';
import prisma from '@/lib/db/prisma';
import * as Sentry from '@sentry/nextjs';

import {
  FREE_CALL_MINUTES,
  CALL_RATE_LIMIT,
  CALL_RATE_WINDOW_MS,
  CALL_MAX_COMPLETION_TOKENS,
  CALL_MAX_CONTEXT_MESSAGES,
  CALL_AI_TIMEOUT_MS,
  CALL_DEPTH_PER_EXCHANGE,
  MAX_DEPTH,
} from '@/src/config/gameplayConfig';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    const allowed = await rateLimit(`call-respond:${user.id}`, CALL_RATE_LIMIT, CALL_RATE_WINDOW_MS);
    if (!allowed) {
      return Response.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body = await req.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : null;
    const personaId = typeof body?.personaId === 'string' ? body.personaId : null;

    if (!text) {
      return Response.json({ error: 'Missing text' }, { status: 400 });
    }

    const userRecord = await prisma.user.findUnique({ where: { id: user.id } });
    if (!userRecord) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // UTC-based daily reset for call minutes
    const nowISO = new Date().toISOString().split('T')[0];
    const resetISO = userRecord.callMinutesResetAt
      ? new Date(userRecord.callMinutesResetAt).toISOString().split('T')[0]
      : null;

    let callMinutes = userRecord.callMinutesToday;
    if (resetISO !== nowISO) {
      callMinutes = 0;
      await prisma.user.update({
        where: { id: user.id },
        data: { callMinutesToday: 0, callMinutesResetAt: new Date() },
      });
    }

    // Rate limit call minutes for free users
    if (userRecord.plan !== 'pro' && callMinutes >= FREE_CALL_MINUTES) {
      return Response.json({
        error: 'daily_call_limit',
        message: `You've used your ${FREE_CALL_MINUTES} free call minutes today. Upgrade for unlimited calls.`,
      }, { status: 402 });
    }

    let persona = personaId
      ? await prisma.persona.findUnique({ where: { id: personaId } })
      : await prisma.persona.findFirst();

    if (!persona) {
      return Response.json({ error: 'Persona not found' }, { status: 404 });
    }

    let session: { id: string } | null = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!session) {
      const existing = await prisma.chatSession.findUnique({
        where: { userId_personaId: { userId: user.id, personaId: persona.id } },
      });
      if (existing) {
        session = existing;
      } else {
        session = await prisma.chatSession.create({
          data: {
            userId: user.id,
            personaId: persona.id,
            participants: { create: { userId: user.id } },
            personas: { create: { personaId: persona.id } },
          },
        });
      }
    }

    // Get recent call context
    const history = await prisma.message.findMany({
      where: { chatSessionId: session.id },
      orderBy: { createdAt: 'desc' },
      take: CALL_MAX_CONTEXT_MESSAGES,
      select: { text: true, sender: true },
    });
    history.reverse();

    const historyText = history
      .map(m => `${m.sender === 'USER' ? 'User' : persona!.name}: ${m.text}`)
      .join('\n');

    const systemPrompt = [
      `You are ${persona.name}.`,
      persona.systemPrompt || `You are a confident, witty conversationalist.`,
      `You're on a voice call with someone learning English. This is a SPOKEN conversation.`,
      `Roast their grammar, NEVER the person. Be arrogant about English, but never attack personal worth. Max 2 short sentences. NO markdown. NO emojis.`,
      `User depth level: ${userRecord.diveDepth ?? 0}/${MAX_DEPTH}`,
      `\nYou MUST return raw JSON in exactly this format:`,
      `{`,
      `  "reply": "Your 1-2 sentence spoken reply.",`,
      `  "errorSpan": { "original": "exact wrong phrase used", "corrected": "how it should be" } | null,`,
      `  "grammarCorrection": "Very short 1 sentence tip/rule about the mistake" | null`,
      `}`,
      `If their grammar was perfect, set errorSpan and grammarCorrection to null.`
    ].join('\n');

    const userPrompt = historyText
      ? `${historyText}\nUser: ${text}`
      : `User: ${text}`;

    // Route through circuit breaker (Cerebras → Groq → Gemini)
    const aiData = await makeAIJsonCompletion<{
      reply: string;
      errorSpan: { original: string; corrected: string } | null;
      grammarCorrection: string | null;
    }>({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      maxTokens: CALL_MAX_COMPLETION_TOKENS,
      timeoutMs: CALL_AI_TIMEOUT_MS,
    });

    const reply = aiData.reply?.trim() || 'I see. Tell me more.';
    const errorSpan = aiData.errorSpan?.original && aiData.errorSpan?.corrected ? aiData.errorSpan : null;
    const grammarCorrection = aiData.grammarCorrection;

    // HP and depth calculation (call exchanges always award HP)
    const diveDepth = userRecord.diveDepth ?? 0;
    const newDepth = Math.min(MAX_DEPTH, diveDepth + CALL_DEPTH_PER_EXCHANGE);
    const newPersonalBest = newDepth > (userRecord.personalBestDepth ?? 0) ? newDepth : userRecord.personalBestDepth;

    // Save user message — hidden from chat UI, included in LLM sliding window
    await prisma.message.create({
      data: {
        text,
        sender: 'USER',
        chatSessionId: session.id,
        senderUserId: user.id,
        isAudio: true,
        isHiddenFromChat: true,
      },
    });

    // Save AI reply — hidden from chat UI, included in LLM sliding window
    await prisma.message.create({
      data: {
        text: reply,
        sender: 'AI',
        chatSessionId: session.id,
        senderPersonaId: persona.id,
        isAudio: true,
        isHiddenFromChat: true,
        grammarCorrection: grammarCorrection || null,
        weaknessIdentified: null,
        errorSpan: errorSpan as any,
        xpReward: errorSpan ? 0 : 1,
      },
    });

    // Increment call minutes (~30s per exchange = 0.5 min, rounded to 1)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        callMinutesToday: { increment: 1 },
        diveDepth: newDepth,
        personalBestDepth: newPersonalBest ?? 0,
        lastActiveAt: new Date(),
      },
    });

    return Response.json({
      reply,
      sessionId: session.id,
      depthChange: newDepth - diveDepth,
      callMinutesLeft: Math.max(0, FREE_CALL_MINUTES - callMinutes - 1),
      isPro: userRecord.plan === 'pro',
      errorSpan,
      grammarCorrection,
    });
  } catch (error) {
    Sentry.captureException(error, { extra: { route: '/api/call/respond' } });
    console.error('Call respond error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return Response.json(
      { error: msg.includes('timed out') || msg.includes('timeout') ? 'AI response timed out' : 'Failed to generate response' },
      { status: 500 }
    );
  }
}
