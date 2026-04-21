'use client';

import { ErrorScreen } from '@/components/ui/ErrorScreen';

export default function FriendsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen code="0xDEAD" title="Crew Offline" message={error?.message || 'Could not reach your dive crew.'} onReset={reset} />;
}
