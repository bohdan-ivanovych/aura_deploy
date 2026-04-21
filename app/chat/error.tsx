'use client';

import { ErrorScreen } from '@/components/ui/ErrorScreen';

export default function ChatError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen code="0xDEAD" title="Signal Lost" message={error?.message || 'Chat transmission failed at depth.'} onReset={reset} />;
}
