/**
 * process-referral — awards referral bonus points after a referee's first order.
 *
 * Called by stripe-webhook after payment_intent.succeeded when the paying
 * customer has a `referred_by` value set on their profile.
 *
 * Flow:
 *  1. Load customer profile → check referred_by is set
 *  2. Check no existing referral row (prevents double-rewarding)
 *  3. Insert referrals row with status 'rewarded'
 *  4. Award 1000 points to referrer (+ update loyalty_tier)
 *  5. Award 1000 points to referee (first-order bonus + update loyalty_tier)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'

const REFERRAL_BONUS_POINTS = 1000  // = $10 credit

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const startTime = Date.now()
  const fn = 'process-referral'

  try {
    const { orderId, customerId } = await req.json() as { orderId: string; customerId: string }
    logger.info('function.invoked', { function: fn, orderId, customerId })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Load customer profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, referred_by, loyalty_points, loyalty_tier')
      .eq('id', customerId)
      .single()

    if (profileErr || !profile) {
      logger.warn('profile.not_found', { function: fn, customerId })
      return new Response(JSON.stringify({ skipped: true, reason: 'profile_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!profile.referred_by) {
      logger.info('no_referral', { function: fn, customerId })
      return new Response(JSON.stringify({ skipped: true, reason: 'no_referral' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Check for existing referral row (idempotency)
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', profile.referred_by)
      .eq('referee_id', customerId)
      .limit(1)

    if (existing && existing.length > 0) {
      logger.info('referral.already_processed', { function: fn, customerId })
      return new Response(JSON.stringify({ skipped: true, reason: 'already_processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Insert referrals row
    const { error: refErr } = await supabase.from('referrals').insert({
      referrer_id: profile.referred_by,
      referee_id: customerId,
      status: 'rewarded',
      reward_points: REFERRAL_BONUS_POINTS,
      rewarded_at: new Date().toISOString(),
    })

    if (refErr) throw refErr

    // 4. Award points to referrer
    await awardPoints(supabase, profile.referred_by, REFERRAL_BONUS_POINTS, 'referral_reward', orderId)

    // 5. Award points to referee (first-order welcome bonus)
    await awardPoints(supabase, customerId, REFERRAL_BONUS_POINTS, 'referral_welcome', orderId)

    logger.duration('function.completed', startTime, { function: fn, orderId })
    return new Response(
      JSON.stringify({ success: true, pointsAwarded: REFERRAL_BONUS_POINTS }),
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

async function awardPoints(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  profileId: string,
  points: number,
  type: string,
  orderId: string
) {
  // Get current points
  const { data: profile } = await supabase
    .from('profiles')
    .select('loyalty_points')
    .eq('id', profileId)
    .single()

  const currentPoints = profile?.loyalty_points ?? 0
  const newPoints = currentPoints + points
  const newTier = pointsToTier(newPoints)

  // Update profile points + tier
  await supabase
    .from('profiles')
    .update({ loyalty_points: newPoints, loyalty_tier: newTier })
    .eq('id', profileId)

  // Insert transaction record
  await supabase.from('loyalty_transactions').insert({
    profile_id: profileId,
    order_id: orderId,
    points,
    balance_after: newPoints,
    type,
    description: type === 'referral_reward'
      ? 'Referral reward — your friend placed their first order'
      : 'Welcome bonus — you joined via a referral',
  })
}

function pointsToTier(points: number): string {
  if (points >= 5000) return 'gold'
  if (points >= 1000) return 'silver'
  return 'bronze'
}
