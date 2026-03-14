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
  // Query 1: orders for this hub (excluding completed/cancelled)
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('hub_id', hubId)
    .not('status', 'in', '("delivered","cancelled")')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Hub queue lookup failed: ${error.message}`)
  if (!orders || orders.length === 0) return []

  // Query 2: customer profiles for all unique customer_ids
  const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean))] as string[]
  let customerMap: Record<string, { id: string; full_name: string; phone: string; avatar_url: string | null }> = {}
  if (customerIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone, avatar_url').in('id', customerIds)
    if (profiles) {
      customerMap = Object.fromEntries(profiles.map((p) => [p.id, { id: p.id, full_name: p.full_name ?? '', phone: p.phone ?? '', avatar_url: p.avatar_url }]))
    }
  }

  // Query 3: bags for all orders
  const orderIds = orders.map((o) => o.id)
  const bagMap: Record<string, Array<{ id: string; qr_code: string; current_status: string }>> = {}
  if (orderIds.length > 0) {
    const { data: bags } = await supabase
      .from('bags')
      .select('id, qr_code, current_status, current_order_id')
      .in('current_order_id', orderIds)
    if (bags) {
      for (const bag of bags) {
        const oid = bag.current_order_id as string
        if (!bagMap[oid]) bagMap[oid] = []
        bagMap[oid].push({ id: bag.id, qr_code: bag.qr_code, current_status: bag.current_status ?? '' })
      }
    }
  }

  return orders.map((order) => ({
    ...order,
    customer: order.customer_id && customerMap[order.customer_id]
      ? customerMap[order.customer_id]
      : null,
    bags: bagMap[order.id] ?? [],
  })) as OrderWithDetails[]
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
