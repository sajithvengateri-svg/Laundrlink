/**
 * update-loyalty-points — awards loyalty points after order delivery.
 *
 * Called by the stripe-webhook or handoff trigger when an order reaches
 * 'delivered' status.
 *
 * Rules:
 *  - 10 points per $1 spent (total_cents / 10)
 *  - Also auto-generates referral_code for the customer if they don't have one
 *  - Updates loyalty_tier based on cumulative points:
 *    Bronze: 0–999 | Silver: 1000–4999 | Gold: 5000+
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'

const POINTS_PER_DOLLAR_CENTS = 10  // 10 pts per 100 cents = 10 pts per $1

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const startTime = Date.now()
  const fn = 'update-loyalty-points'

  try {
    const { orderId, customerId } = await req.json() as { orderId: string; customerId: string }
    logger.info('function.invoked', { function: fn, orderId, customerId })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Load order total
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('total_cents')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) throw new Error('Order not found')

    // Check idempotency — don't award twice for same order
    const { data: existing } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('order_id', orderId)
      .eq('type', 'order_earn')
      .limit(1)

    if (existing && existing.length > 0) {
      logger.info('already_awarded', { function: fn, orderId })
      return new Response(JSON.stringify({ skipped: true, reason: 'already_awarded' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Calculate points earned
    const pointsEarned = Math.floor((order.total_cents ?? 0) / POINTS_PER_DOLLAR_CENTS)
    if (pointsEarned <= 0) {
      return new Response(JSON.stringify({ skipped: true, reason: 'zero_points' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Load customer profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('loyalty_points, referral_code')
      .eq('id', customerId)
      .single()

    const currentPoints = profile?.loyalty_points ?? 0
    const newPoints = currentPoints + pointsEarned
    const newTier = pointsToTier(newPoints)

    // Generate referral code if they don't have one yet
    const referralCode = profile?.referral_code ?? generateReferralCode(customerId)

    // Update profile
    await supabase
      .from('profiles')
      .update({
        loyalty_points: newPoints,
        loyalty_tier: newTier,
        referral_code: referralCode,
      })
      .eq('id', customerId)

    // Insert transaction
    await supabase.from('loyalty_transactions').insert({
      profile_id: customerId,
      order_id: orderId,
      points: pointsEarned,
      balance_after: newPoints,
      type: 'order_earn',
      description: `Earned ${pointsEarned} pts for order delivery`,
    })

    logger.duration('function.completed', startTime, {
      function: fn,
      orderId,
      pointsEarned,
      newPoints,
      newTier,
    })

    return new Response(
      JSON.stringify({ success: true, pointsEarned, newPoints, newTier, referralCode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    logger.error('function.error', err as Error, { function: fn })
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function pointsToTier(points: number): string {
  if (points >= 5000) return 'gold'
  if (points >= 1000) return 'silver'
  return 'bronze'
}

function generateReferralCode(userId: string): string {
  // Take first 8 chars of userId and make uppercase alphanumeric
  const part = userId.replace(/-/g, '').slice(0, 6).toUpperCase()
  return `LL${part}`
}
