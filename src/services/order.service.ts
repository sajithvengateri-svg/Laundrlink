import { supabase } from '@/lib/supabase'
import type { Json } from '@/types/database.types'
import type {
  Order,
  OrderInsert,
  OrderWithDetails,
  CreateOrderParams,
  NearbyHub,
} from '@/types/order.types'

// Human-readable order number: LL-2024-00001
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
  const seq = String((count ?? 0) + 1).padStart(5, '0')
  return `LL-${year}-${seq}`
}

export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const orderNumber = await generateOrderNumber()

  const total = params.items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0)
  // Hub gets 70%, platform keeps 30%
  const platformFeeCents = Math.round(total * 0.3)
  const hubAmountCents = total - platformFeeCents

  const orderData: OrderInsert = {
    order_number: orderNumber,
    customer_id: params.customerId,
    status: 'pending',
    service_type: params.serviceType,
    pickup_address: params.pickupAddress as unknown as Json,
    delivery_address: params.deliveryAddress as unknown as Json,
    pickup_scheduled_at: params.pickupDate,
    delivery_scheduled_at: params.deliveryDate,
    special_instructions: params.specialInstructions ?? null,
    subtotal_cents: total,
    total_cents: total,
    platform_fee_cents: platformFeeCents,
    hub_payout_cents: hubAmountCents,
    is_ndis: params.isNdis ?? false,
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single()

  if (orderError) throw orderError

  // Insert order items
  if (params.items.length > 0) {
    const items = params.items.map((item) => ({
      order_id: order.id,
      item_type: item.description,
      notes: null,
      quantity: item.quantity,
      unit_price_cents: item.price_cents,
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) throw itemsError
  }

  return order
}

export async function getOrderById(orderId: string): Promise<OrderWithDetails | null> {
  // Query 1: order row
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError) throw new Error(`Order lookup failed: ${orderError.message}`)
  if (!order) return null

  // Query 2-4 in parallel: customer, hub, items, handoffs
  const [customerRes, hubRes, itemsRes, handoffsRes] = await Promise.all([
    order.customer_id
      ? supabase.from('profiles').select('id, full_name, phone, avatar_url').eq('id', order.customer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    order.hub_id
      ? supabase.from('hubs').select('id, business_name, address').eq('id', order.hub_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from('order_items').select('*').eq('order_id', orderId),
    supabase.from('handoffs').select('id, step, photo_urls, created_at, scanned_by').eq('order_id', orderId).order('created_at', { ascending: true }),
  ])

  if (customerRes.error) console.warn('[getOrderById] customer lookup failed:', customerRes.error.message)
  if (hubRes.error) console.warn('[getOrderById] hub lookup failed:', hubRes.error.message)
  if (itemsRes.error) console.warn('[getOrderById] items lookup failed:', itemsRes.error.message)
  if (handoffsRes.error) console.warn('[getOrderById] handoffs lookup failed:', handoffsRes.error.message)

  const result: OrderWithDetails = {
    ...order,
    customer: customerRes.data
      ? { id: customerRes.data.id, full_name: customerRes.data.full_name ?? '', phone: customerRes.data.phone ?? '', avatar_url: customerRes.data.avatar_url }
      : null,
    hub: hubRes.data
      ? { id: hubRes.data.id, business_name: hubRes.data.business_name, address: hubRes.data.address as Record<string, unknown> }
      : null,
    items: (itemsRes.data ?? []) as OrderWithDetails['items'],
    handoffs: (handoffsRes.data ?? []) as OrderWithDetails['handoffs'],
  }

  console.log('[getOrderById] result:', { orderId, status: result.status, handoffCount: result.handoffs?.length })
  return result
}

export async function getCustomerOrders(customerId: string): Promise<OrderWithDetails[]> {
  // Query 1: orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Customer orders lookup failed: ${error.message}`)
  if (!orders || orders.length === 0) return []

  // Query 2: hub details for all unique hub_ids
  const hubIds = [...new Set(orders.map((o) => o.hub_id).filter(Boolean))] as string[]
  let hubMap: Record<string, { id: string; business_name: string }> = {}
  if (hubIds.length > 0) {
    const { data: hubs } = await supabase.from('hubs').select('id, business_name').in('id', hubIds)
    if (hubs) {
      hubMap = Object.fromEntries(hubs.map((h) => [h.id, h]))
    }
  }

  // Query 3: items for all orders
  const orderIds = orders.map((o) => o.id)
  const { data: allItems } = await supabase.from('order_items').select('*').in('order_id', orderIds)

  return orders.map((order) => ({
    ...order,
    hub: order.hub_id && hubMap[order.hub_id]
      ? { id: hubMap[order.hub_id].id, business_name: hubMap[order.hub_id].business_name, address: {} }
      : null,
    items: (allItems ?? []).filter((item) => item.order_id === order.id),
  })) as OrderWithDetails[]
}

export async function cancelOrder(orderId: string): Promise<void> {
  // Only allow cancellation in early statuses
  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .single()

  const cancelableStatuses = ['pending', 'pickup_scheduled']
  if (!order || !cancelableStatuses.includes(order.status ?? '')) {
    throw new Error('Order cannot be cancelled at this stage.')
  }

  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)

  if (error) throw error
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)

  if (error) throw error
}

// Get nearby hubs sorted by distance (needs lat/lng from customer address)
export async function getNearbyHubs(lat: number, lng: number, radiusKm = 20): Promise<NearbyHub[]> {
  // Try PostGIS RPC first (custom RPC not in generated types, cast required)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcData, error: rpcError } = await (supabase as any).rpc('find_nearest_hubs', {
    order_lat: lat,
    order_lng: lng,
    radius_km: radiusKm,
    result_limit: 10,
  })

  if (!rpcError && rpcData) {
    return (rpcData as NearbyHub[]).map((hub) => {
      const cap = hub.capacity ?? 50
      const load = hub.current_load ?? 0
      return {
        ...hub,
        available_capacity_pct: cap > 0 ? (cap - load) / cap : 0,
      }
    })
  }

  // Fallback: return all active hubs without distance filtering
  const { data, error } = await supabase
    .from('hubs')
    .select('id, business_name, address, capacity, current_load, rating_avg')
    .eq('is_active', true)
    .limit(10)

  if (error) throw error

  return (data ?? []).map((hub) => {
    const cap = hub.capacity ?? 50
    const load = hub.current_load ?? 0
    return {
      id: hub.id,
      business_name: hub.business_name,
      address: hub.address as Record<string, unknown>,
      distance_km: 0,
      rating: hub.rating_avg,
      capacity: hub.capacity,
      current_load: hub.current_load,
      available_capacity_pct: cap > 0 ? (cap - load) / cap : 0,
    }
  })
}
