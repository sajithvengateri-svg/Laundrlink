import { supabase } from '@/lib/supabase'
import type { Bag, BagWithOrder, AssignBagParams } from '@/types/bag.types'

export async function getBagByQR(qrCode: string): Promise<BagWithOrder | null> {
  const { data, error } = await supabase
    .from('bags')
    .select(
      `
      *,
      order:orders!bags_current_order_id_fkey (
        id,
        order_number,
        status,
        customer:profiles!orders_customer_id_fkey (
          full_name,
          phone
        )
      )
    `
    )
    .eq('qr_code', qrCode)
    .maybeSingle()

  if (error) throw error
  return data as BagWithOrder | null
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
