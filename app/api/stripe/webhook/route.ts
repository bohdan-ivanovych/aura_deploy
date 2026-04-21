import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import prisma from '@/lib/db/prisma'
import { trackServer } from '@/lib/services/analytics.server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const stripe = new Stripe(stripeKey)
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error('[stripe/webhook] Invalid signature:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: sub.status === 'active' ? 'pro' : 'free',
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
          },
        })
        if (sub.status === 'active') {
          await trackServer(userId, 'subscription_started')
        }
        break
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Prefer metadata.userId (set by our checkout route), fall back to
        // client_reference_id which we also set as a belt-and-suspenders measure.
        const userId = session.metadata?.userId ?? session.client_reference_id
        const customerId = session.customer as string
        if (userId && customerId) {
          // Save customerId AND eagerly set plan=pro.
          // The subscription webhook will confirm this, but doing it here too
          // ensures Pro access is instant even if the subscription event is delayed.
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: customerId,
              plan: 'pro',
              subscriptionStatus: 'active',
            },
          })
          await trackServer(userId, 'checkout_completed')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (!userId) break
        await prisma.user.update({
          where: { id: userId },
          data: { plan: 'free', subscriptionStatus: 'canceled' },
        })
        await trackServer(userId, 'subscription_cancelled')
        break
      }
    }
  } catch (err) {
    console.error('[stripe/webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
