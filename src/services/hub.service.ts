import { supabase } from '@/lib/supabase'
import type { Hub, HubUpdate, OrderWithDetails, HubMetrics } from '@/types/hub.types'

export async function getHubByOwner(ownerId: string): Promise<Hub | null> {
  const { data, error } = await supabase
    .from('hubs')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getHubById(hubId: string): Promise<Hub | null> {
  const { data, error } = await supabase
    .from('hubs')
    .select('*')
    .eq('id', hubId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getHubQueue(hubId: string): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      customer:profiles!orders_customer_id_fkey (
        id,
        full_name,
        phone,
        avatar_url
      ),
      bags (
        id,
        qr_code,
        current_status
      ),
      handoffs (*)
    `
    )
    .eq('hub_id', hubId)
    .not('status', 'in', '("delivered","cancelled")')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as OrderWithDetails[]) ?? []
}

export async function getHubMetrics(hubId: string): Promise<HubMetrics> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [ordersResult, hubResult] = await Promise.all([
    supabase
      .from('orders')
      .select('status, created_at')
      .eq('hub_id', hubId)
      .gte('created_at', today.toISOString()),
    supabase
      .from('hubs')
      .select('capacity, current_load, rating_avg')
      .eq('id', hubId)
      .single(),
  ])

  if (ordersResult.error) throw ordersResult.error
  if (hubResult.error) throw hubResult.error

  const orders = ordersResult.data ?? []
  const hub = hubResult.data

  return {
    totalOrdersToday: orders.length,
    pendingOrders: orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length,
    completedToday: orders.filter((o) => o.status === 'delivered').length,
    capacityUsed: hub.current_load ?? 0,
    capacityMax: hub.capacity ?? 50,
    averageRating: hub.rating_avg ?? 0,
  }
}

export async function updateHubCapacity(hubId: string, delta: number): Promise<void> {
  // Use RPC to atomically increment/decrement current_load (custom RPC not in generated types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('increment_hub_load', { hub_id: hubId, delta })
  if (error) {
    // Fallback: fetch and update
    const hub = await getHubById(hubId)
    if (!hub) throw new Error('Hub not found')
    const newLoad = Math.max(0, (hub.current_load ?? 0) + delta)
    const { error: updateError } = await supabase
      .from('hubs')
      .update({ current_load: newLoad } as HubUpdate)
      .eq('id', hubId)
    if (updateError) throw updateError
  }
}

export async function updateHub(hubId: string, updates: HubUpdate): Promise<Hub> {
  const { data, error } = await supabase
    .from('hubs')
    .update(updates)
    .eq('id', hubId)
    .select()
    .single()

  if (error) throw error
  return data
}
