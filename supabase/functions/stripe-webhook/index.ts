import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { corsHeaders } from '../_shared/cors.ts'
import { getStripe } from '../_shared/stripe.ts'
import { logger } from '../_shared/logger.ts'

serve(async (req: Request) => {
  const start = Date.now()

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event

  try {
    const stripe = getStripe()
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    logger.error('stripe-webhook.signature_failed', err as Error, {})
    return new Response('Invalid signature', { status: 400 })
  }

  logger.info('stripe-webhook.received', { type: event.type, id: event.id })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id

        if (!orderId) {
          logger.warn('stripe-webhook.missing_order_id', { payment_intent_id: pi.id })
          break
        }

        const amountCents = pi.amount
        const platformFeeCents = Math.round(amountCents * 0.3)
        const hubAmountCents = amountCents - platformFeeCents

        // Update order to pickup_scheduled
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            status: 'pickup_scheduled',
            stripe_payment_intent_id: pi.id,
          })
          .eq('id', orderId)

        if (orderError) throw orderError

        // Record charge in payment_ledger
        await supabase.from('payment_ledger').insert({
          order_id: orderId,
          type: 'charge',
          amount_cents: amountCents,
          platform_fee_cents: platformFeeCents,
          hub_amount_cents: hubAmountCents,
          stripe_payment_intent_id: pi.id,
          status: 'completed',
        })

        // Get order details for hub notification
        const { data: order } = await supabase
          .from('orders')
          .select('hub_id, pickup_address, customer:profiles!orders_customer_id_fkey(full_name, phone)')
          .eq('id', orderId)
          .single()

        // If hub assigned, trigger assign-hub-pro if not already done
        if (!order?.hub_id) {
          const addr = order?.pickup_address as Record<string, number> | null
          if (addr?.lat && addr?.lng) {
            await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/assign-hub-pro`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ order_id: orderId, lat: addr.lat, lng: addr.lng }),
              }
            )
          }
        }

        logger.duration('stripe-webhook.payment_succeeded', start, { order_id: orderId, amount_cents: amountCents })
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata.order_id
        if (orderId) {
          await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', orderId)
            .eq('status', 'pending')
        }
        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (account.charges_enabled) {
          // Find hub with this Stripe account and mark as active
          await supabase
            .from('hubs')
            .update({ is_active: true, stripe_account_id: account.id })
            .eq('stripe_account_id', account.id)
        }
        break
      }

      default:
        logger.info('stripe-webhook.unhandled', { type: event.type })
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    logger.error('stripe-webhook.handler_error', err as Error, { event_type: event.type })
    return new Response(
      JSON.stringify({ error: 'Handler error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
