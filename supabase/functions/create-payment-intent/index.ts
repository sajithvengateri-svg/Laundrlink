import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { verifyUser } from '../_shared/auth.ts'
import { getStripe } from '../_shared/stripe.ts'
import { logger } from '../_shared/logger.ts'

interface PaymentIntentRequest {
  order_id: string
  amount_cents: number
  hub_stripe_account_id?: string
}

serve(async (req: Request) => {
  const start = Date.now()
  if (req.method === 'OPTIONS') return handleCors()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const user = await verifyUser(req, supabase)
    const body: PaymentIntentRequest = await req.json()
    const { order_id, amount_cents, hub_stripe_account_id } = body

    logger.info('create-payment-intent.invoked', { order_id, amount_cents, user_id: user.id })

    if (!order_id || !amount_cents || amount_cents < 50) {
      return new Response(
        JSON.stringify({ error: 'order_id and amount_cents (min 50) are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripe = getStripe()

    // Platform fee = 30% of total
    const platformFeeCents = Math.round(amount_cents * 0.3)

    const paymentIntentParams: Parameters<typeof stripe.paymentIntents.create>[0] = {
      amount: amount_cents,
      currency: 'aud',
      metadata: { order_id, user_id: user.id },
      automatic_payment_methods: { enabled: true },
    }

    // If hub has a Stripe Connect account, transfer 70% to them
    if (hub_stripe_account_id) {
      paymentIntentParams.transfer_data = {
        destination: hub_stripe_account_id,
      }
      paymentIntentParams.application_fee_amount = platformFeeCents
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    // Record intent on order
    const { error: updateError } = await supabase
      .from('orders')
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq('id', order_id)

    if (updateError) {
      logger.warn('create-payment-intent.order_update_failed', { order_id, error: updateError.message })
    }

    logger.duration('create-payment-intent.completed', start, {
      payment_intent_id: paymentIntent.id,
      amount_cents,
    })

    return new Response(
      JSON.stringify({
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: amount_cents,
        hub_amount: amount_cents - platformFeeCents,
        platform_fee: platformFeeCents,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    logger.error('create-payment-intent.error', err as Error, {})
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
