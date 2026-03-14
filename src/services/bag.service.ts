import { supabase } from '@/lib/supabase'
import type { Bag, BagWithOrder, AssignBagParams } from '@/types/bag.types'

export async function getBagByQR(qrCode: string): Promise<BagWithOrder | null> {
  // Query 1: bag only — no joins
  const { data: bag, error: bagError } = await supabase
    .from('bags')
    .select('*')
    .eq('qr_code', qrCode)
    .maybeSingle()

  if (bagError) throw new Error(`Bag lookup failed: ${bagError.message}`)
  if (!bag) return null

  // Query 2: order (if bag is assigned)
  let order: { id: string; order_number: string; status: string | null; customer_id: string | null } | null = null
  if (bag.current_order_id) {
    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, customer_id')
      .eq('id', bag.current_order_id)
      .maybeSingle()
    if (error) console.warn('[getBagByQR] order lookup failed:', error.message)
    if (data) order = data
  }

  // Query 3: customer profile (if order has customer_id)
  let customer: { full_name: string; phone: string } | undefined
  if (order?.customer_id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.customer_id)
      .maybeSingle()
    if (error) console.warn('[getBagByQR] profile lookup failed:', error.message)
    if (data) customer = { full_name: data.full_name ?? '', phone: data.phone ?? '' }
  }

  const result: BagWithOrder = {
    ...bag,
    order: order
      ? { id: order.id, order_number: order.order_number, status: order.status, customer }
      : null,
  }

  console.log('[getBagByQR] result:', { qrCode, bagId: result.id, orderId: result.current_order_id, order: result.order })
  return result
}

export async function assignBagToOrder(params: AssignBagParams): Promise<Bag> {
  // Verify bag isn't already assigned to a different active order
  const existing = await getBagByQR(params.qrCode)
  if (!existing) throw new Error(`Bag QR code not found: ${params.qrCode}`)
  if (existing.current_order_id && existing.current_order_id !== params.orderId) {
    throw new Error(`Bag ${params.qrCode} is already assigned to order ${existing.current_order_id}`)
  }

  const { data, error } = await supabase
    .from('bags')
    .update({
      current_order_id: params.orderId,
      current_holder_id: params.holderId,
      current_status: 'in_transit_to_hub',
    })
    .eq('qr_code', params.qrCode)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateBagStatus(
  bagId: string,
  status: Bag['current_status'],
  holderId?: string
): Promise<Bag> {
  const update: Partial<Bag> = { current_status: status }
  if (holderId !== undefined) update.current_holder_id = holderId

  const { data, error } = await supabase
    .from('bags')
    .update(update)
    .eq('id', bagId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getBagsByOrder(orderId: string): Promise<Bag[]> {
  const { data, error } = await supabase
    .from('bags')
    .select('*')
    .eq('current_order_id', orderId)

  if (error) throw error
  return data ?? []
}

export async function getUnassignedBags(): Promise<Bag[]> {
  const { data, error } = await supabase
    .from('bags')
    .select('*')
    .eq('current_status', 'unassigned')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data ?? []
}
