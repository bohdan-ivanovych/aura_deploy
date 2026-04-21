'use client';

import { ErrorScreen } from '@/components/ui/ErrorScreen';

export default function RoomError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen code="0xDEAD" title="Arena Offline" message={error?.message || 'Deathmatch connection terminated.'} onReset={reset} />;
}
