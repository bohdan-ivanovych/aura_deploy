import type { Metadata } from 'next'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export const metadata: Metadata = {
  title: 'Your Progress — AURA',
  description: 'Track your dive depth, HP, XP and streaks as your English fluency grows.',
}

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary fallbackLabel="STATS">{children}</ErrorBoundary>;
}
