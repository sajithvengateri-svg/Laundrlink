import { supabase } from '@/lib/supabase'
import type {
  Driver,
  DriverUpdate,
  DriverMetrics,
  DispatchJob,
  DispatchJobWithOrder,
  DispatchOrderParams,
  DispatchOrderResult,
} from '@/types/driver.types'

const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getDriverProfile(driverId: string): Promise<Driver | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateDriverProfile(
  driverId: string,
  updates: DriverUpdate
): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .update(updates)
    .eq('id', driverId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function setDriverAvailability(
  driverId: string,
  isAvailable: boolean
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({ is_available: isAvailable })
    .eq('id', driverId)

  if (error) throw error
}

// ─── Location ─────────────────────────────────────────────────────────────────
// PostGIS EWKT format: 'SRID=4326;POINT(lng lat)' (longitude first)

export async function updateDriverLocation(
  driverId: string,
  lat: number,
  lng: number
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update({ location: `SRID=4326;POINT(${lng} ${lat})` } as any)
    .eq('id', driverId)

  if (error) throw error
}

// ─── Dispatch Jobs ────────────────────────────────────────────────────────────

export async function getActiveDispatchJob(
  driverId: string
): Promise<DispatchJobWithOrder | null> {
  const { data, error } = await supabase
    .from('dispatch_jobs')
    .select(
      `
      *,
      order:orders!dispatch_jobs_order_id_fkey (
        id,
        order_number,
        status,
        hub_id,
        pickup_address,
        delivery_address,
        customer:profiles!orders_customer_id_fkey (
          id, full_name, phone
        ),
        hub:hubs!orders_hub_id_fkey (
          id, business_name, address
        ),
        bags (
          id, qr_code, current_status
        )
      )
    `
    )
    .eq('driver_id', driverId)
    .in('status', ['accepted', 'en_route_to_pickup', 'picked_up', 'en_route_to_customer'])
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (error) throw error
  return data as DispatchJobWithOrder | null
}

export async function getDriverRuns(
  driverId: string,
  since?: string
): Promise<DispatchJobWithOrder[]> {
  let query = supabase
    .from('dispatch_jobs')
    .select(
      `
      *,
      order:orders!dispatch_jobs_order_id_fkey (
        id, order_number, status, delivery_address
      )
    `
    )
    .eq('driver_id', driverId)
    .eq('status', 'delivered')
    .order('completed_at', { ascending: false })

  if (since) query = query.gte('completed_at', since)

  const { data, error } = await query
  if (error) throw error
  return (data as DispatchJobWithOrder[]) ?? []
}

export async function updateDispatchJobStatus(
  jobId: string,
  status: string
): Promise<DispatchJob> {
  const update: Partial<DispatchJob> = { status }
  if (status === 'delivered') update.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('dispatch_jobs')
    .update(update)
    .eq('id', jobId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function acceptNativeJob(
  jobId: string,
  driverId: string
): Promise<DispatchJob> {
  const { data, error } = await supabase
    .from('dispatch_jobs')
    .update({ driver_id: driverId, status: 'accepted' })
    .eq('id', jobId)
    .eq('status', 'pending')
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function getDriverMetrics(driverId: string): Promise<DriverMetrics> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const [todayResult, weekResult, profileResult] = await Promise.all([
    supabase
      .from('dispatch_jobs')
      .select('id, cost_cents')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .gte('completed_at', todayStart.toISOString()),

    supabase
      .from('dispatch_jobs')
      .select('id, cost_cents')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .gte('completed_at', weekStart.toISOString()),

    supabase
      .from('drivers')
      .select('rating_avg, total_runs')
      .eq('id', driverId)
      .single(),
  ])

  if (todayResult.error) throw todayResult.error
  if (weekResult.error) throw weekResult.error
  if (profileResult.error) throw profileResult.error

  const todays = todayResult.data ?? []
  const weeks = weekResult.data ?? []
  const driver = profileResult.data

  return {
    runsToday: todays.length,
    earningsToday: todays.reduce((sum, j) => sum + (j.cost_cents ?? 0), 0),
    earningsThisWeek: weeks.reduce((sum, j) => sum + (j.cost_cents ?? 0), 0),
    ratingAvg: driver.rating_avg ?? 0,
    totalRuns: driver.total_runs ?? 0,
  }
}

// ─── Dispatch (edge function) ─────────────────────────────────────────────────

export async function dispatchOrder(
  params: DispatchOrderParams
): Promise<DispatchOrderResult> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${EDGE_FUNCTIONS_URL}/dispatch-driver`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      order_id: params.orderId,
      pickup_lat: params.pickupLat,
      pickup_lng: params.pickupLng,
      dropoff_lat: params.dropoffLat,
      dropoff_lng: params.dropoffLng,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'dispatch-driver failed')
  }

  return res.json() as Promise<DispatchOrderResult>
}
