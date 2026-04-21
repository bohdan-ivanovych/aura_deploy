'use client'

import posthog from 'posthog-js'

let initialized = false

export const initAnalytics = () => {
  if (typeof window === 'undefined') return
  if (initialized) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  posthog.init(key, {
    api_host: 'https://app.posthog.com',
    capture_pageview: false,
    autocapture: false,
    persistence: 'localStorage',
  })
  initialized = true
}

export const track = (event: string, props?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  try {
    posthog.capture(event, props)
  } catch {}
}

export const identify = (userId: string, traits?: Record<string, unknown>) => {
  if (typeof window === 'undefined') return
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  try {
    posthog.identify(userId, traits)
  } catch {}
}
