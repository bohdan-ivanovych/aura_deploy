'use client';

let _pusherClient: import('pusher-js').default | null = null;

export function getPusherClient() {
  if (typeof window === 'undefined') return null;
  if (_pusherClient) return _pusherClient;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!key || !cluster) return null;

  // Lazy import to avoid SSR issues
  const PusherClient = require('pusher-js') as typeof import('pusher-js').default;
  _pusherClient = new PusherClient(key, {
    cluster,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
  });
  return _pusherClient;
}

export const pusherClient = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_PUSHER_KEY
  ? getPusherClient()
  : null;
