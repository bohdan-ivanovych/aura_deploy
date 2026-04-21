import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrCreateUser } from '@/lib/auth/api-utils'

export async function POST() {
  try {
    const user = await getOrCreateUser()

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      return NextResponse.json({ error: 'Payments not configured' }, { status: 503 })
    }

    const stripe = new Stripe(stripeKey)

    const priceId = process.env.STRIPE_PRO_PRICE_ID
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured' }, { status: 503 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://auraenglish.app'

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/?upgraded=true`,
      cancel_url: `${appUrl}/upgrade`,
      client_reference_id: user.id,
      // Metadata on the session itself (for checkout.session.completed)
      metadata: { userId: user.id },
      // ← CRITICAL: also copy to subscription so subscription.created/updated
      // events carry the userId — without this sub.metadata.userId is undefined.
      subscription_data: {
        metadata: { userId: user.id },
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('[stripe/checkout]', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
