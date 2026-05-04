import { NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import prisma from '@/lib/db/prisma';
import { makeAICompletion } from '@/lib/ai/multi-groq';
import { INJECTION_GUARD } from '@/lib/ai/prompt-guard';

/**
 * POST /api/chat-sessions/[id]/greet
 * Triggers a persona-personalized opening message for a brand-new session.
 * Only fires if the session has 0 messages.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const user = await getOrCreateUser();

    // Fetch session with persona
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        persona: true,
      },
    });

    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Only greet if session is empty
    const messageCount = await prisma.message.count({
      where: { chatSessionId: sessionId },
    });
    if (messageCount > 0) {
      return NextResponse.json({ skipped: true });
    }

    const persona = session.persona;
    if (!persona) {
      return NextResponse.json({ error: 'No persona' }, { status: 400 });
    }

    // Build a lightweight greeting prompt based purely on persona character
    const systemPrompt = [
      INJECTION_GUARD,
      persona.systemPrompt
        ? `PERSONA: ${persona.systemPrompt}`
        : `PERSONA: You are ${persona.name}. ${persona.description || 'A unique conversational personality.'}`,
      `You are opening a brand-new conversation with someone you've just met online.`,
      `Write a single short opening message (1-2 sentences) that is 100% in-character.`,
      `Do NOT ask for their name, age, or language ability. Do NOT introduce yourself by saying "Hi, I'm ...".`,
      `Just speak naturally — start the conversation YOUR way, based on your personality.`,
      `Return ONLY valid JSON: {"bubbles": ["your opening message"]}`,
      `[SYSTEM]: You must output ONLY a valid JSON object matching the required schema. Start your response with {`
    ].filter(Boolean).join('\n');

    const rawContent = await makeAICompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '[new conversation starts]' },
      ],
      temperature: 0.9,
      maxTokens: 150,
      responseFormat: { type: 'json_object' },
      timeoutMs: 12_000,
    });

    // Parse response
    let greetingText: string;
    try {
      const parsed = JSON.parse(rawContent);
      const bubbles = Array.isArray(parsed.bubbles) ? parsed.bubbles : [parsed.reply || parsed.message || rawContent];
      greetingText = String(bubbles[0] || '').trim();
    } catch {
      // Strip JSON artifacts if any
      const match = rawContent.match(/["']([^"']{10,})['"]/);
      greetingText = match ? match[1] : rawContent.slice(0, 200);
    }

    if (!greetingText) {
      return NextResponse.json({ skipped: true });
    }

    // Save as AI message
    const aiMsg = await prisma.message.create({
      data: {
        text: greetingText,
        sender: 'AI',
        chatSessionId: sessionId,
        senderPersonaId: persona.id,
      },
    });

    return NextResponse.json({
      message: {
        id: aiMsg.id,
        text: aiMsg.text,
        sender: 'AI',
        senderPersonaId: persona.id,
        senderName: persona.name,
        senderAvatar: persona.avatarUrl,
        createdAt: aiMsg.createdAt,
        grammarCorrection: null,
        weaknessIdentified: null,
        xpReward: 0,
      },
    });
  } catch (error) {
    console.error('[greet] error:', error);
    return NextResponse.json({ error: 'Failed to generate greeting' }, { status: 500 });
  }
}
