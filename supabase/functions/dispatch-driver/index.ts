import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { requireAuth } from '../_shared/auth.ts'

const UBER_DIRECT_CUSTOMER_ID = Deno.env.get('UBER_DIRECT_CUSTOMER_ID') ?? ''
const UBER_DIRECT_CLIENT_SECRET = Deno.env.get('UBER_DIRECT_CLIENT_SECRET') ?? ''
const DOORDASH_DEVELOPER_ID = Deno.env.get('DOORDASH_DEVELOPER_ID') ?? ''
const DOORDASH_KEY_ID = Deno.env.get('DOORDASH_KEY_ID') ?? ''
const DOORDASH_SIGNING_SECRET = Deno.env.get('DOORDASH_SIGNING_SECRET') ?? ''

// Circuit breaker: how many provider failures in the last window before giving up
const CIRCUIT_BREAKER_THRESHOLD = 3
const CIRCUIT_BREAKER_WINDOW_MINUTES = 5

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const start = Date.now()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Require authenticated caller (hub staff or admin)
    const userId = await requireAuth(req)

    const { order_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } = await req.json()

    if (!order_id || pickup_lat == null || pickup_lng == null || dropoff_lat == null || dropoff_lng == null) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    logger.info('dispatch.started', { order_id, userId })

    // Fetch order details for addresses
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, order_number, pickup_address, delivery_address')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 1. Try UberDirect ─────────────────────────────────────────────────────
    if (UBER_DIRECT_CLIENT_SECRET && !await isCircuitOpen(supabase, 'uberdirect')) {
      try {
        const uberResult = await tryUberDirect(order, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)

        const { data: job, error: jobErr } = await supabase
          .from('dispatch_jobs')
          .insert({
            order_id,
            provider: 'uberdirect',
            external_job_id: uberResult.id,
            status: 'accepted',
            pickup_address: order.pickup_address,
            dropoff_address: order.delivery_address,
            estimated_eta: uberResult.pickup.eta,
          })
          .select()
          .single()

        if (jobErr) throw jobErr

        await supabase
          .from('orders')
          .update({ dispatch_provider: 'uberdirect', dispatch_order_id: uberResult.id })
          .eq('id', order_id)

        logger.duration('dispatch.uberdirect.success', start, { order_id, external_job_id: uberResult.id })

        return new Response(
          JSON.stringify({
            dispatch_provider: 'uberdirect',
            dispatch_job_id: job.id,
            driver_id: null,
            external_job_id: uberResult.id,
            estimated_eta: uberResult.pickup.eta,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (err) {
        logger.warn('dispatch.uberdirect.failed', { order_id, error: String(err) })
        await recordProviderFailure(supabase, 'uberdirect', order_id, String(err))
      }
    }

    // ── 2. Try DoorDash Drive ─────────────────────────────────────────────────
    if (DOORDASH_DEVELOPER_ID && !await isCircuitOpen(supabase, 'doordash')) {
      try {
        const dashResult = await tryDoorDash(order, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng)

        const { data: job, error: jobErr } = await supabase
          .from('dispatch_jobs')
          .insert({
            order_id,
            provider: 'doordash',
            external_job_id: dashResult.external_delivery_id,
            status: 'accepted',
            pickup_address: order.pickup_address,
            dropoff_address: order.delivery_address,
            estimated_eta: dashResult.pickup_time_estimated,
          })
          .select()
          .single()

        if (jobErr) throw jobErr

        await supabase
          .from('orders')
          .update({ dispatch_provider: 'doordash', dispatch_order_id: dashResult.external_delivery_id })
          .eq('id', order_id)

        logger.duration('dispatch.doordash.success', start, { order_id, external_job_id: dashResult.external_delivery_id })

        return new Response(
          JSON.stringify({
            dispatch_provider: 'doordash',
            dispatch_job_id: job.id,
            driver_id: null,
            external_job_id: dashResult.external_delivery_id,
            estimated_eta: dashResult.pickup_time_estimated,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (err) {
        logger.warn('dispatch.doordash.failed', { order_id, error: String(err) })
        await recordProviderFailure(supabase, 'doordash', order_id, String(err))
      }
    }

    // ── 3. Native driver pool (PostGIS proximity) ─────────────────────────────
    logger.info('dispatch.native.attempting', { order_id })

    const { data: drivers, error: driversErr } = await supabase.rpc('find_nearest_drivers', {
      hub_lat: pickup_lat,
      hub_lng: pickup_lng,
      radius_km: 20,
      result_limit: 5,
    })

    if (driversErr || !drivers || (drivers as unknown[]).length === 0) {
      // Fallback: pick any available verified driver
      const { data: fallbackDrivers } = await supabase
        .from('drivers')
        .select('id')
        .eq('is_available', true)
        .eq('is_verified', true)
        .eq('is_active', true)
        .limit(1)

      if (!fallbackDrivers || fallbackDrivers.length === 0) {
        logger.error('dispatch.no_drivers', new Error('No available drivers'), { order_id })
        return new Response(JSON.stringify({ error: 'No available drivers' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const assignedDriverId = fallbackDrivers[0].id
      const { data: job, error: jobErr } = await supabase
        .from('dispatch_jobs')
        .insert({
          order_id,
          provider: 'native',
          driver_id: assignedDriverId,
          status: 'accepted',
          pickup_address: order.pickup_address,
          dropoff_address: order.delivery_address,
        })
        .select()
        .single()

      if (jobErr) throw jobErr

      await supabase
        .from('orders')
        .update({ dispatch_provider: 'native', dispatch_order_id: job.id })
        .eq('id', order_id)

      await supabase.from('drivers').update({ is_available: false }).eq('id', assignedDriverId)

      logger.duration('dispatch.native.success', start, { order_id, driver_id: assignedDriverId })

      return new Response(
        JSON.stringify({
          dispatch_provider: 'native',
          dispatch_job_id: job.id,
          driver_id: assignedDriverId,
          external_job_id: null,
          estimated_eta: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const nearestDriver = (drivers as Array<{ id: string }>)[0]

    const { data: job, error: jobErr } = await supabase
      .from('dispatch_jobs')
      .insert({
        order_id,
        provider: 'native',
        driver_id: nearestDriver.id,
        status: 'accepted',
        pickup_address: order.pickup_address,
        dropoff_address: order.delivery_address,
      })
      .select()
      .single()

    if (jobErr) throw jobErr

    await supabase
      .from('orders')
      .update({ dispatch_provider: 'native', dispatch_order_id: job.id })
      .eq('id', order_id)

    // Mark driver as on-run (not available for new jobs)
    await supabase.from('drivers').update({ is_available: false }).eq('id', nearestDriver.id)

    logger.duration('dispatch.native.success', start, { order_id, driver_id: nearestDriver.id })

    return new Response(
      JSON.stringify({
        dispatch_provider: 'native',
        dispatch_job_id: job.id,
        driver_id: nearestDriver.id,
        external_job_id: null,
        estimated_eta: null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    logger.error('dispatch.unhandled', err instanceof Error ? err : new Error(String(err)), {})
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── UberDirect ───────────────────────────────────────────────────────────────

async function tryUberDirect(
  order: { order_number: string },
  pickupLat: number, pickupLng: number,
  dropoffLat: number, dropoffLng: number
): Promise<{ id: string; pickup: { eta: string } }> {
  const res = await fetch(
    `https://api.uber.com/v1/customers/${UBER_DIRECT_CUSTOMER_ID}/deliveries`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${UBER_DIRECT_CLIENT_SECRET}`,
      },
      body: JSON.stringify({
        pickup: {
          name: 'LaundrLink Hub',
          address: `${pickupLat},${pickupLng}`,
          latitude: pickupLat,
          longitude: pickupLng,
        },
        dropoff: {
          name: 'Customer',
          address: `${dropoffLat},${dropoffLng}`,
          latitude: dropoffLat,
          longitude: dropoffLng,
        },
        manifest_reference: order.order_number,
      }),
    }
  )

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`UberDirect ${res.status}: ${JSON.stringify(body)}`)
  }

  return res.json()
}

// ─── DoorDash Drive ───────────────────────────────────────────────────────────

async function tryDoorDash(
  order: { order_number: string },
  pickupLat: number, pickupLng: number,
  dropoffLat: number, dropoffLng: number
): Promise<{ external_delivery_id: string; pickup_time_estimated: string }> {
  // DoorDash JWT: header.payload.signature (simplified — use DD SDK in production)
  const res = await fetch('https://openapi.doordash.com/drive/v2/deliveries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${DOORDASH_DEVELOPER_ID}:${DOORDASH_KEY_ID}:${DOORDASH_SIGNING_SECRET}`,
    },
    body: JSON.stringify({
      external_delivery_id: `laundrlink-${order.order_number}`,
      pickup_address: `${pickupLat},${pickupLng}`,
      dropoff_address: `${dropoffLat},${dropoffLng}`,
      order_value: 1000,
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(`DoorDash ${res.status}: ${JSON.stringify(body)}`)
  }

  return res.json()
}

// ─── Circuit breaker helpers ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function isCircuitOpen(supabase: any, provider: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - CIRCUIT_BREAKER_WINDOW_MINUTES * 60 * 1000)

  const { count } = await supabase
    .from('system_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', `dispatch.${provider}.failed`)
    .gte('created_at', windowStart.toISOString())

  const isOpen = (count ?? 0) >= CIRCUIT_BREAKER_THRESHOLD
  if (isOpen) {
    logger.warn(`dispatch.circuit_open.${provider}`, { count, threshold: CIRCUIT_BREAKER_THRESHOLD })
  }
  return isOpen
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recordProviderFailure(supabase: any, provider: string, orderId: string, error: string): Promise<void> {
  await supabase.from('system_events').insert({
    event_type: `dispatch.${provider}.failed`,
    table_name: 'orders',
    record_id: orderId,
    severity: 'warning',
    message: `${provider} dispatch failed for order ${orderId}: ${error}`,
    metadata: { provider, error },
  })

  // Check if we just tripped the circuit breaker — alert admin
  const isOpen = await isCircuitOpen(supabase, provider)
  if (isOpen) {
    await supabase.from('system_events').insert({
      event_type: `dispatch.circuit_breaker_tripped`,
      severity: 'critical',
      message: `${provider} circuit breaker tripped: ${CIRCUIT_BREAKER_THRESHOLD} failures in ${CIRCUIT_BREAKER_WINDOW_MINUTES} min`,
      metadata: { provider },
    })
  }
}
