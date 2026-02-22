import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { verifyUser } from '../_shared/auth.ts'
import { getStripe } from '../_shared/stripe.ts'
import { logger } from '../_shared/logger.ts'

serve(async (req: Request) => {
  const start = Date.now()
  if (req.method === 'OPTIONS') return handleCors()

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const user = await verifyUser(req, supabase)
    const { hub_id } = await req.json()

    logger.info('stripe-connect-onboard.invoked', { hub_id, user_id: user.id })

    const { data: hub, error: hubError } = await supabase
      .from('hubs')
      .select('id, stripe_account_id, owner_id')
      .eq('id', hub_id)
      .single()

    if (hubError || !hub) {
      return new Response(JSON.stringify({ error: 'Hub not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (hub.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const stripe = getStripe()
    let accountId = hub.stripe_account_id

    // Create Stripe Express account if not yet created
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'AU',
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { hub_id },
      })
      accountId = account.id

      await supabase.from('hubs').update({ stripe_account_id: accountId }).eq('id', hub_id)
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'https://laundrlink.com.au'

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/hub/settings?stripe=refresh`,
      return_url: `${appUrl}/hub/settings?stripe=success`,
      type: 'account_onboarding',
    })

    logger.duration('stripe-connect-onboard.completed', start, { hub_id, account_id: accountId })

    return new Response(JSON.stringify({ url: accountLink.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    logger.error('stripe-connect-onboard.error', err as Error, {})
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
