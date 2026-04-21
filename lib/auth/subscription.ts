import prisma from '@/lib/db/prisma'

export const FREE_LIMITS = {
  messagesPerDay: 20,
  reelsPerDay: 1,
} as const

export async function checkMessageLimit(userId: string): Promise<{
  allowed: boolean
  remaining: number
  isPro: boolean
  resetAt: string | null
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      dailyMessageCount: true,
      dailyMessageResetAt: true,
    },
  })

  // Helper: midnight tonight (start of next day) for countdown
  const nextMidnight = new Date()
  nextMidnight.setHours(24, 0, 0, 0)
  const resetAt = nextMidnight.toISOString()

  if (!user) return { allowed: false, remaining: 0, isPro: false, resetAt }
  if (user.plan === 'pro') return { allowed: true, remaining: 999, isPro: true, resetAt: null }

  const isNewDay =
    new Date(user.dailyMessageResetAt).toISOString().split('T')[0] !== new Date().toISOString().split('T')[0]

  if (isNewDay) {
    await prisma.user.update({
      where: { id: userId },
      data: { dailyMessageCount: 0, dailyMessageResetAt: new Date() },
    })
    return { allowed: true, remaining: FREE_LIMITS.messagesPerDay, isPro: false, resetAt }
  }

  const remaining = FREE_LIMITS.messagesPerDay - user.dailyMessageCount
  return { allowed: remaining > 0, remaining, isPro: false, resetAt }
}

export async function requirePro(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  })
  return user?.plan === 'pro'
}

export async function incrementMessageCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { dailyMessageCount: { increment: 1 } },
  })
}
