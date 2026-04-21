'use client'

import { useEffect } from 'react'
import { initAnalytics } from '@/lib/services/analytics'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics()
  }, [])
  return <>{children}</>
}
