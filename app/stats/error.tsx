'use client';

import { ErrorScreen } from '@/components/ui/ErrorScreen';

export default function StatsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen code="0xDEAD" title="Diagnostics Failed" message={error?.message || 'Depth profile scan interrupted.'} onReset={reset} />;
}
