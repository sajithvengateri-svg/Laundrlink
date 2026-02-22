import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { verifyUser } from '../_shared/auth.ts'
import { logger } from '../_shared/logger.ts'

interface AssignRequest {
  order_id: string
  lat: number
  lng: number
  max_radius_km?: number
}

interface HubCandidate {
  id: string
  owner_id: string
  business_name: string
  distance_km: number
  available_capacity_pct: number
  rating: number
  score: number
}

serve(async (req: Request) => {
  const start = Date.now()

  if (req.method === 'OPTIONS') return handleCors()

  try {
    // Verify caller is authenticated
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await verifyUser(req, supabase)

    const body: AssignRequest = await req.json()
    const { order_id, lat, lng, max_radius_km = 15 } = body

    logger.info('assign-hub-pro.invoked', { order_id, lat, lng, max_radius_km })

    if (!order_id || lat === undefined || lng === undefined) {
      return new Response(
        JSON.stringify({ error: 'order_id, lat, lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PostGIS query: find hubs within radius, score them
    // Score = (1/distance_km × 0.4) + (available_capacity_pct × 0.4) + (rating/5 × 0.2)
    const { data: candidates, error: queryError } = await supabase.rpc('find_nearest_hubs', {
      order_lat: lat,
      order_lng: lng,
      radius_km: max_radius_km,
      result_limit: 20,
    })

    if (queryError) {
      // Fallback: raw PostGIS query if RPC not available
      logger.warn('assign-hub-pro.rpc_fallback', { error: queryError.message })

      const { data: fallbackData, error: fallbackError } = await supabase
        .from('hubs')
        .select('id, owner_id, business_name, capacity, current_load, rating, location')
        .eq('is_active', true)
        .limit(20)

      if (fallbackError) throw fallbackError

      // Score without distance weighting (fallback)
      const scored: HubCandidate[] = (fallbackData ?? []).map((hub) => {
        const cap = hub.capacity ?? 50
        const load = hub.current_load ?? 0
        const available_capacity_pct = cap > 0 ? (cap - load) / cap : 0
        const rating = hub.rating ?? 3
        return {
          id: hub.id,
          owner_id: hub.owner_id,
          business_name: hub.business_name,
          distance_km: 0,
          available_capacity_pct,
          rating,
          score: available_capacity_pct * 0.6 + (rating / 5) * 0.4,
        }
      })

      scored.sort((a, b) => b.score - a.score)
      const best = scored[0]

      if (!best) {
        return new Response(
          JSON.stringify({ error: 'No available hubs found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return await assignHub(supabase, order_id, best, start)
    }

    if (!candidates || candidates.length === 0) {
      logger.warn('assign-hub-pro.no_candidates', { order_id, lat, lng, max_radius_km })
      return new Response(
        JSON.stringify({ error: `No hubs found within ${max_radius_km}km` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Score candidates
    const scored: HubCandidate[] = candidates.map((hub: {
      id: string
      owner_id: string
      business_name: string
      distance_km: number
      capacity: number
      current_load: number
      rating: number
    }) => {
      const cap = hub.capacity ?? 50
      const load = hub.current_load ?? 0
      const available_capacity_pct = cap > 0 ? (cap - load) / cap : 0
      const distScore = hub.distance_km > 0 ? 1 / hub.distance_km : 1
      const rating = hub.rating ?? 3

      // Normalised score
      const score = distScore * 0.4 + available_capacity_pct * 0.4 + (rating / 5) * 0.2

      return {
        id: hub.id,
        owner_id: hub.owner_id,
        business_name: hub.business_name,
        distance_km: hub.distance_km,
        available_capacity_pct,
        rating,
        score,
      }
    })

    scored.sort((a, b) => b.score - a.score)
    const best = scored[0]

    logger.info('assign-hub-pro.selected', {
      order_id,
      hub_id: best.id,
      distance_km: best.distance_km,
      score: best.score,
    })

    return await assignHub(supabase, order_id, best, start)
  } catch (err) {
    logger.error('assign-hub-pro.error', err as Error, {})
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function assignHub(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  orderId: string,
  hub: HubCandidate,
  startTime: number
): Promise<Response> {
  // Update order with hub_id
  const { error: updateError } = await supabase
    .from('orders')
    .update({ hub_id: hub.id })
    .eq('id', orderId)

  if (updateError) throw updateError

  // Increment hub current_load
  const { error: loadError } = await supabase
    .from('hubs')
    .update({ current_load: supabase.rpc('increment_hub_load', { hub_id: hub.id, delta: 1 }) })
    .eq('id', hub.id)

  // Non-fatal if load increment fails
  if (loadError) {
    logger.warn('assign-hub-pro.load_update_failed', { hub_id: hub.id, error: loadError.message })
  }

  logger.duration('assign-hub-pro.completed', startTime, {
    order_id: orderId,
    hub_id: hub.id,
  })

  return new Response(
    JSON.stringify({
      hub_id: hub.id,
      hub_name: hub.business_name,
      distance_km: hub.distance_km,
      score: hub.score,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
