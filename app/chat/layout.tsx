import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Practice English — AURA',
  description: 'Have a real conversation in English with an AI coach. Get instant grammar corrections and track your progress.',
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
