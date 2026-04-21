import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Vocabulary — AURA',
  description: 'Review words you captured during your practice sessions using spaced repetition.',
}

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
