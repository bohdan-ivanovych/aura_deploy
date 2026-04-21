import * as Sentry from '@sentry/nextjs';
import { getOrCreateUser } from '@/lib/auth/api-utils';
import { rateLimit, getRateLimitHeaders } from '@/lib/utils/rate-limit';
import { sanitizeText, assertNonEmpty } from '@/lib/utils/validation';
import { checkMessageLimit, incrementMessageCount } from '@/lib/auth/subscription';
import { trackServer } from '@/lib/services/analytics.server';
import { sendMessageStream } from '@/app/actions/chat';

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60_000;

export async function POST(req: Request) {
  try {
    const user = await getOrCreateUser();

    Sentry.setUser({ id: user.id });

    const allowed = await rateLimit(`send:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many messages. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...(await getRateLimitHeaders(`send:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS)),
          },
        }
      );
    }

    const limit = await checkMessageLimit(user.id);
    if (!limit.allowed) {
      await trackServer(user.id, 'upgrade_prompt_shown', { trigger: 'daily_limit' });
      return new Response(
        JSON.stringify({
          error: 'daily_limit_reached',
          limitReached: true,
          upgradeRequired: true,
          remaining: 0,
          resetAt: limit.resetAt,
        }),
        { status: 402, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const rawText = sanitizeText(body?.text);
    assertNonEmpty(rawText, 'Message');

    const chatSessionId = typeof body?.chatSessionId === 'string' ? body.chatSessionId : null;
    const personaId = typeof body?.personaId === 'string' ? body.personaId : null;
    // Last AI message reaction — for LLM injection
    const lastReaction = typeof body?.lastReaction === 'string' ? body.lastReaction : null;
    const isTikTok = body?.isTikTok === true;

    if (!limit.isPro) {
      await incrementMessageCount(user.id);
    }

    // Return SSE stream
    const stream = await sendMessageStream(chatSessionId, user.id, rawText, personaId, lastReaction, isTikTok);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    Sentry.captureException(error, { extra: { route: '/api/send-message' } });
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const isUserError = msg.includes('empty') || msg.includes('Missing');
    return new Response(
      JSON.stringify({ error: isUserError ? msg : 'Failed to send message' }),
      { status: isUserError ? 400 : 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
