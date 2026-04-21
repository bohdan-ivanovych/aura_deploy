import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Skill Map — AURA',
  description: 'Unlock English grammar skills as you dive deeper. From basic tenses to advanced collocations.',
}

export default function SkillTreeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
