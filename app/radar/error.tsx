'use client';

import { ErrorScreen } from '@/components/ui/ErrorScreen';

export default function RadarError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen code="0xDEAD" title="Sonar Failure" message={error?.message || 'Radar scan lost signal at depth.'} onReset={reset} />;
}
