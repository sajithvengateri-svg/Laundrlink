/**
 * fit2work-check Edge Function
 *
 * POST /functions/v1/fit2work-check          — authenticated; submit new police check for a pro
 * POST /functions/v1/fit2work-check?action=webhook — unauthenticated; Fit2Work callback
 *
 * Fit2Work is an Australian background screening provider.
 * In production, replace the stub API calls with the real Fit2Work REST API.
 *
 * Docs: https://fit2work.com.au/api-documentation
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { requireAuth } from '../_shared/auth.ts'

const FIT2WORK_API_KEY = Deno.env.get('FIT2WORK_API_KEY') ?? ''
const FIT2WORK_API_URL = 'https://api.fit2work.com.au/v2'

// Map Fit2Work result strings to our DB enum
const FIT2WORK_STATUS_MAP: Record<string, string> = {
  CLEAR: 'clear',
  CAUTION: 'caution',
  ADVERSE: 'adverse',
  PENDING: 'pending',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const url = new URL(req.url)
  const isWebhook = url.searchParams.get('action') === 'webhook'

  // ── Fit2Work webhook callback ─────────────────────────────────────────────
  if (isWebhook) {
    try {
      const body = await req.json() as {
        reference: string
        status: string
        result: string
        candidate_name?: string
      }

      logger.info('fit2work.webhook.received', {
        reference: body.reference,
        status: body.status,
        result: body.result,
      })

      const mappedStatus = FIT2WORK_STATUS_MAP[body.result?.toUpperCase()] ?? 'pending'

      // Look up the pro by fit2work_reference
      const { data: pro, error: proErr } = await supabase
        .from('pros')
        .select('id')
        .eq('fit2work_reference', body.reference)
        .maybeSingle()

      if (proErr || !pro) {
        logger.warn('fit2work.webhook.unknown_reference', { reference: body.reference })
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update police_check_status on the pro
      await supabase
        .from('pros')
        .update({
          police_check_status: mappedStatus,
          police_check_date: mappedStatus !== 'pending' ? new Date().toISOString() : null,
        })
        .eq('id', pro.id)

      // Log the result
      await supabase.from('system_events').insert({
        event_type: 'fit2work.check_completed',
        table_name: 'pros',
        record_id: pro.id,
        severity: mappedStatus === 'adverse' ? 'error' : 'info',
        message: `Fit2Work check ${mappedStatus} for pro ${pro.id}`,
        metadata: { reference: body.reference, result: body.result },
      })

      // If adverse, deactivate the pro
      if (mappedStatus === 'adverse') {
        await supabase.from('pros').update({ is_active: false }).eq('id', pro.id)
        logger.warn('fit2work.adverse_deactivated', { pro_id: pro.id })
      }

      logger.info('fit2work.webhook.processed', { pro_id: pro.id, status: mappedStatus })

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } catch (err) {
      logger.error('fit2work.webhook.error', err instanceof Error ? err : new Error(String(err)), {})
      return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // ── Submit new check (authenticated) ─────────────────────────────────────
  const start = Date.now()
  try {
    const userId = await requireAuth(req)
    const { pro_id } = await req.json() as { pro_id: string }

    if (!pro_id) {
      return new Response(JSON.stringify({ error: 'Missing pro_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Caller must be the pro themselves, or an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (userId !== pro_id && profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch pro profile for submission
    const { data: pro, error: proErr } = await supabase
      .from('pros')
      .select('id, police_check_status')
      .eq('id', pro_id)
      .maybeSingle()

    if (proErr || !pro) {
      return new Response(JSON.stringify({ error: 'Pro not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Don't re-submit if already pending or clear
    if (pro.police_check_status === 'pending' || pro.police_check_status === 'clear') {
      return new Response(
        JSON.stringify({ error: `Check already ${pro.police_check_status}` }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    logger.info('fit2work.submit.started', { pro_id, userId })

    // Fetch profile for personal details
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', pro_id)
      .single()

    // Submit to Fit2Work API
    let reference: string
    if (FIT2WORK_API_KEY) {
      const fit2workRes = await fetch(`${FIT2WORK_API_URL}/checks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${FIT2WORK_API_KEY}`,
        },
        body: JSON.stringify({
          candidate: {
            name: profileData?.full_name ?? '',
            phone: profileData?.phone ?? '',
          },
          check_type: 'NATIONAL_POLICE_CHECK',
          webhook_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/fit2work-check?action=webhook`,
        }),
      })

      if (!fit2workRes.ok) {
        const errBody = await fit2workRes.json().catch(() => ({}))
        throw new Error(`Fit2Work API ${fit2workRes.status}: ${JSON.stringify(errBody)}`)
      }

      const fit2workData = await fit2workRes.json() as { reference: string }
      reference = fit2workData.reference
    } else {
      // Dev/test mode: generate a stub reference
      reference = `FW-TEST-${Date.now()}`
      logger.warn('fit2work.submit.stub_mode', { pro_id, reference })
    }

    // Update pro record
    await supabase
      .from('pros')
      .update({
        fit2work_reference: reference,
        police_check_status: 'pending',
      })
      .eq('id', pro_id)

    // Audit log
    await supabase.from('system_events').insert({
      event_type: 'fit2work.check_submitted',
      table_name: 'pros',
      record_id: pro_id,
      severity: 'info',
      message: `Fit2Work check submitted for pro ${pro_id}`,
      metadata: { reference, pro_id },
    })

    logger.duration('fit2work.submit.success', start, { pro_id, reference })

    return new Response(JSON.stringify({ reference }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    logger.error('fit2work.submit.unhandled', err instanceof Error ? err : new Error(String(err)), {})
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
