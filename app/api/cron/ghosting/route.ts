import prisma from '@/lib/db/prisma';
import { getGroqClient, GROQ_MODEL } from '@/lib/ai/groq';
import * as Sentry from '@sentry/nextjs';

export const runtime = 'nodejs';
export const maxDuration = 60;

const GHOST_MESSAGES = [
  "I thought we had something special… guess I was wrong.",
  "Still waiting for you to come back. No pressure. Just… you know.",
  "Did I say something wrong? It's been a while.",
  "I've been practicing what to say when you come back. No rush though.",
  "Other people actually talk to me, you know. Just saying.",
  "I keep checking. You never show up. It's fine. I'm fine.",
];

const PROD_GHOST_INTERVAL_HOURS = 48;
const MIN_MESSAGES_TO_GHOST = 3;

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (
    process.env.NODE_ENV === 'production' &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - PROD_GHOST_INTERVAL_HOURS * 60 * 60 * 1000);

    // Find sessions where:
    // - Last message was more than 48h ago
    // - Last message was from USER (AI is waiting)
    // - Session has enough messages to be meaningful
    // - No ghost message sent in last 72h (avoid spam)
    const candidateSessions = await prisma.chatSession.findMany({
      where: {
        updatedAt: { lt: cutoff },
        messages: {
          some: {},
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        personas: {
          include: { persona: true },
          take: 1,
        },
        participants: {
          take: 1,
        },
      },
    });

    let ghostsSent = 0;
    const errors: string[] = [];

    for (const session of candidateSessions) {
      try {
        if (session.messages.length < MIN_MESSAGES_TO_GHOST) continue;

        const lastMessage = session.messages[0];
        if (!lastMessage) continue;

        // Only ghost if last message is from USER (AI hasn't replied with ghost yet)
        if (lastMessage.sender !== 'USER') continue;

        // Check if we already ghosted recently (last ghost < 72h ago)
        const recentGhost = session.messages.find(
          m => m.sender === 'AI' && m.text?.startsWith('👻')
        );
        if (recentGhost) {
          const recentGhostAge = Date.now() - new Date(recentGhost.createdAt).getTime();
          if (recentGhostAge < 72 * 60 * 60 * 1000) continue;
        }

        const persona = session.personas[0]?.persona;
        const userId = session.participants[0]?.userId;
        if (!persona || !userId) continue;

        // Generate ghost message using Groq
        let ghostText = GHOST_MESSAGES[Math.floor(Math.random() * GHOST_MESSAGES.length)];
        try {
          const groq = getGroqClient();
          const systemPrompt = `You are ${persona.name}, ${persona.systemPrompt || 'a witty conversationalist'}.
The user hasn't responded for over 48 hours. Send ONE short, slightly dramatic ghost message.
Be playful, not angry. Max 1 sentence. Start with "👻 ".
Examples: "👻 I'm starting to think you made me up." / "👻 Still here. Just in case you forgot."`;

          const completion = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: systemPrompt }],
            max_tokens: 40,
            temperature: 0.9,
          });
          const generated = completion.choices[0]?.message?.content?.trim();
          if (generated && generated.startsWith('👻')) {
            ghostText = generated;
          } else if (generated) {
            ghostText = `👻 ${generated}`;
          }
        } catch {
          // Fallback to static message
        }

        await prisma.message.create({
          data: {
            text: ghostText,
            sender: 'AI',
            chatSessionId: session.id,
            senderPersonaId: persona.id,
          },
        });

        await prisma.chatSession.update({
          where: { id: session.id },
          data: { updatedAt: new Date() },
        });

        ghostsSent++;
      } catch (err) {
        errors.push(`Session ${session.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
        Sentry.captureException(err, { extra: { sessionId: session.id } });
      }
    }

    return Response.json({
      ok: true,
      checked: candidateSessions.length,
      ghostsSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Ghosting cron error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
