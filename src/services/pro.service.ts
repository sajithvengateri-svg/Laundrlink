import { supabase } from '@/lib/supabase'
import type { Pro, ProUpdate, ProMetrics } from '@/types/pro.types'
import type { OrderWithDetails } from '@/types/hub.types'

const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProProfile(proId: string): Promise<Pro | null> {
  const { data, error } = await supabase
    .from('pros')
    .select('*')
    .eq('id', proId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updateProProfile(proId: string, updates: ProUpdate): Promise<Pro> {
  const { data, error } = await supabase
    .from('pros')
    .update(updates)
    .eq('id', proId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function setProAvailability(proId: string, isAvailable: boolean): Promise<void> {
  const { error } = await supabase
    .from('pros')
    .update({ is_available: isAvailable })
    .eq('id', proId)

  if (error) throw error
}

// ─── Jobs (orders assigned to this pro) ──────────────────────────────────────

export async function getProActiveJobs(proId: string): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:profiles!orders_customer_id_fkey(id, full_name, phone, avatar_url),
      hub:hubs!orders_hub_id_fkey(id, business_name),
      bags(id, qr_code, current_status)
    `)
    .eq('pro_id', proId)
    .in('status', ['assigned_to_pro', 'with_pro'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as OrderWithDetails[]) ?? []
}

export async function getProCompletedJobs(
  proId: string,
  since?: string
): Promise<OrderWithDetails[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      hub:hubs!orders_hub_id_fkey(id, business_name),
      bags(id, qr_code, current_status)
    `)
    .eq('pro_id', proId)
    .eq('status', 'returned_to_hub')
    .order('updated_at', { ascending: false })

  if (since) query = query.gte('updated_at', since)

  const { data, error } = await query
  if (error) throw error
  return (data as OrderWithDetails[]) ?? []
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export async function getProMetrics(proId: string): Promise<ProMetrics> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  weekStart.setHours(0, 0, 0, 0)

  const [todayResult, weekResult, profileResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, pro_payout_cents')
      .eq('pro_id', proId)
      .eq('status', 'returned_to_hub')
      .gte('updated_at', todayStart.toISOString()),

    supabase
      .from('orders')
      .select('id, pro_payout_cents')
      .eq('pro_id', proId)
      .eq('status', 'returned_to_hub')
      .gte('updated_at', weekStart.toISOString()),

    supabase
      .from('pros')
      .select('rating_avg, total_orders')
      .eq('id', proId)
      .single(),
  ])

  if (todayResult.error) throw todayResult.error
  if (weekResult.error) throw weekResult.error
  if (profileResult.error) throw profileResult.error

  const todays = todayResult.data ?? []
  const weeks = weekResult.data ?? []
  const pro = profileResult.data

  return {
    jobsToday: todays.length,
    earningsToday: todays.reduce((sum, o) => sum + (o.pro_payout_cents ?? 0), 0),
    earningsThisWeek: weeks.reduce((sum, o) => sum + (o.pro_payout_cents ?? 0), 0),
    ratingAvg: pro.rating_avg ?? 0,
    totalOrders: pro.total_orders ?? 0,
  }
}

// ─── Fit2Work (edge function) ─────────────────────────────────────────────────

export async function submitFit2WorkCheck(proId: string): Promise<{ reference: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${EDGE_FUNCTIONS_URL}/fit2work-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ pro_id: proId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error?: string }).error ?? 'fit2work-check failed')
  }

  return res.json() as Promise<{ reference: string }>
}
