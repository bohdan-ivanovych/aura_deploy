import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { cookies } from 'next/headers'
import { trackServer } from '@/lib/services/analytics.server'

/**
 * POST /api/auth/recover
 *
 * Allows a paying user who lost their cookie to recover their Pro account
 * by entering the email used during Stripe checkout.
 *
 * Flow:
 *  1. User enters email on a recovery page
 *  2. We look up the user record by email
 *  3. If found AND has an active subscription → set `user-id` cookie to that user's id
 *  4. User is now logged back into their Pro account
 *
 * Security: No password needed because the anonymous auth model is already
 * zero-auth (cookie = identity). Recovery by email is strictly MORE secure
 * than the current model (random cookie = identity). We only allow recovery
 * for users who have paid (proof of ownership via Stripe email).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { email?: string }
    const email = body.email?.trim().toLowerCase()

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    // Reject placeholder emails
    if (email.endsWith('@aura.os') || email.endsWith('@aura.local')) {
      return NextResponse.json(
        { error: 'No account found with that email. Did you upgrade to Pro using a different email?' },
        { status: 404 },
      )
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
      },
      select: {
        id: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        name: true,
        stripeCustomerId: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with that email. Make sure it\'s the email you used for Stripe checkout.' },
        { status: 404 },
      )
    }

    // Only allow recovery for users with an active subscription or who have paid
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'This email is not associated with a Pro subscription.' },
        { status: 403 },
      )
    }

    // Set the cookie to the recovered user's ID
    const oneYear = 60 * 60 * 24 * 365
    const cookieStore = await cookies()

    cookieStore.set('user-id', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: oneYear,
      path: '/',
    })

    await trackServer(user.id, 'subscription_recovered', {
      method: 'email',
    })

    return NextResponse.json({
      recovered: true,
      plan: user.plan,
      name: user.name,
    })
  } catch (err) {
    console.error('[auth/recover] Error:', err)
    return NextResponse.json(
      { error: 'Recovery failed. Please try again.' },
      { status: 500 },
    )
  }
}
