import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

function getClient(): PostHog | null {
  const key = process.env.POSTHOG_KEY
  if (!key) return null
  if (!_client) {
    _client = new PostHog(key, {
      host: 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _client
}

export const trackServer = async (
  userId: string,
  event: string,
  props?: Record<string, unknown>
) => {
  const client = getClient()
  if (!client) return
  try {
    client.capture({ distinctId: userId, event, properties: props })
    await client.flush()
  } catch {}
}
