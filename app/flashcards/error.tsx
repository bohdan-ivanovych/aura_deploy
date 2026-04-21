'use client';

import { ErrorScreen } from '@/components/ui/ErrorScreen';

export default function FlashcardsError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen code="0xDEAD" title="Memory Corrupted" message={error?.message || 'Flashcard deck failed to surface.'} onReset={reset} />;
}
