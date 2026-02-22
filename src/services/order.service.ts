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
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      customer:profiles!orders_customer_id_fkey (
        id, full_name, phone, avatar_url
      ),
      hub:hubs!orders_hub_id_fkey (
        id, business_name, address
      ),
      items:order_items (*),
      handoffs (
        id, step, photo_urls, created_at, scanned_by
      )
    `
    )
    .eq('id', orderId)
    .maybeSingle()

  if (error) throw error
  return data as OrderWithDetails | null
}

export async function getCustomerOrders(customerId: string): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      *,
      hub:hubs!orders_hub_id_fkey (
        id, business_name
      ),
      items:order_items (*)
    `
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as OrderWithDetails[]) ?? []
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
