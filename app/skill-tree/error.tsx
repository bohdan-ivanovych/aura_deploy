'use client';

import { ErrorScreen } from '@/components/ui/ErrorScreen';

export default function SkillTreeError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorScreen code="0xDEAD" title="Neural Map Lost" message={error?.message || 'Skill tree failed to render.'} onReset={reset} />;
}
