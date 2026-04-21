/**
 * Pusher Server — lazy singleton.
 *
 * WHY LAZY: The old version imported 'pusher' at module level, which meant
 * every serverless function that transitively imported this file paid the ~30KB
 * cost even if it never used realtime. Now we only load Pusher when actually needed.
 */

let _pusherInstance: import('pusher') | null | undefined;

export async function getPusherServer() {
  if (_pusherInstance !== undefined) return _pusherInstance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!appId || !key || !secret || !cluster ||
      key === 'your_pusher_app_key_here') {
    console.warn('Pusher: Missing env vars. Real-time features disabled.');
    _pusherInstance = null;
    return null;
  }

  const { default: PusherServer } = await import('pusher');
  _pusherInstance = new PusherServer({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  return _pusherInstance;
}

// Backward compat: synchronous export for callers that check `if (pusher)`.
// This will be null until getPusherServer() is called.
// Callers in hot paths should migrate to `await getPusherServer()`.
export const pusher = null as import('pusher') | null;
