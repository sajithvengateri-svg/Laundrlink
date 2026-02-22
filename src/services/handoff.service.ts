import { supabase } from '@/lib/supabase'
import { storage } from '@/lib/supabase'
import type { Handoff, HandoffInsert, CreateHandoffParams, HandoffStep } from '@/types/hub.types'
import type { Database } from '@/types/database.types'

type BagStatus = Database['public']['Tables']['bags']['Update']['current_status']
type OrderStatusVal = Database['public']['Tables']['orders']['Update']['status']

// Customer-facing status messages sent via SMS after each handoff
const STEP_SMS_MESSAGES: Record<HandoffStep, string> = {
  customer_to_driver: '🚗 Your laundry has been picked up! We\'ll keep you updated.',
  driver_to_hub: '🏭 Your laundry has arrived at the hub and is being processed.',
  hub_to_pro: '🧺 A laundry pro has started washing your clothes.',
  pro_to_hub: '✅ Your laundry is clean and ready for delivery!',
  hub_to_driver: '🚗 Your laundry is out for delivery. Expect it soon!',
  driver_to_customer: '🎉 Your laundry has been delivered. Thanks for using LaundrLink!',
}

// Fire-and-forget SMS to customer after handoff (non-blocking)
async function notifyCustomerViaSMS(orderId: string, step: HandoffStep): Promise<void> {
  try {
    const { data: order } = await supabase
      .from('orders')
      .select('customer_id, order_number, customer:profiles!orders_customer_id_fkey(phone)')
      .eq('id', orderId)
      .single()

    const phone = (order?.customer as { phone?: string | null } | null)?.phone
    if (!phone) return

    const message = `LaundrLink (${order?.order_number}): ${STEP_SMS_MESSAGES[step]}`
    await supabase.functions.invoke('send-sms', {
      body: { to: phone, message },
    })
  } catch {
    // SMS failures must never block handoff completion
  }
}

// Valid status transitions per handoff step
const STEP_STATUS_TRANSITIONS: Record<HandoffStep, { bagStatus: BagStatus; orderStatus: OrderStatusVal }> = {
  customer_to_driver: { bagStatus: 'in_transit_to_hub', orderStatus: 'picked_up_by_driver' },
  driver_to_hub:      { bagStatus: 'at_hub',              orderStatus: 'at_hub' },
  hub_to_pro:         { bagStatus: 'with_pro',            orderStatus: 'with_pro' },
  pro_to_hub:         { bagStatus: 'at_hub',              orderStatus: 'returned_to_hub' },
  hub_to_driver:      { bagStatus: 'in_transit_to_customer', orderStatus: 'out_for_delivery' },
  driver_to_customer: { bagStatus: 'delivered',           orderStatus: 'delivered' },
}

export async function createHandoff(params: CreateHandoffParams): Promise<Handoff> {
  if (!params.photoUrls || params.photoUrls.length === 0) {
    throw new Error('At least one photo is required for handoff verification')
  }

  const transition = STEP_STATUS_TRANSITIONS[params.step]

  // Insert handoff record (UNIQUE constraint on bag_id + step + order_id prevents duplicates)
  const handoffData: HandoffInsert = {
    order_id: params.orderId,
    bag_id: params.bagId,
    step: params.step,
    from_user_id: params.fromUserId,
    to_user_id: params.toUserId,
    scanned_by: params.scannedById,
    photo_urls: params.photoUrls,
    signature_url: params.signatureUrl ?? null,
    location_lat: params.locationLat ?? null,
    location_lng: params.locationLng ?? null,
  }

  const { data: handoff, error: handoffError } = await supabase
    .from('handoffs')
    .insert(handoffData)
    .select()
    .single()

  if (handoffError) throw handoffError

  // Update bag status (atomically with the handoff)
  const { error: bagError } = await supabase
    .from('bags')
    .update({
      current_status: transition.bagStatus,
      current_holder_id: params.toUserId,
    })
    .eq('id', params.bagId)

  if (bagError) throw bagError

  // Update order status
  const { error: orderError } = await supabase
    .from('orders')
    .update({ status: transition.orderStatus })
    .eq('id', params.orderId)

  if (orderError) throw orderError

  // Notify customer via SMS — fire-and-forget, never blocks handoff
  void notifyCustomerViaSMS(params.orderId, params.step)

  return handoff
}

export async function uploadHandoffPhoto(
  file: File,
  orderId: string,
  handoffId: string,
  index: number
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${orderId}/${handoffId}/${index}.${ext}`

  const { error } = await storage.handoffPhotos.upload(path, file, {
    contentType: file.type,
    upsert: true,
  })

  if (error) throw error

  const { data } = storage.handoffPhotos.getPublicUrl(path)
  return data.publicUrl
}

export async function uploadSignature(
  file: File,
  orderId: string
): Promise<string> {
  const path = `${orderId}/signature.png`

  const { error } = await storage.signatures.upload(path, file, {
    contentType: 'image/png',
    upsert: true,
  })

  if (error) throw error

  const { data } = storage.signatures.getPublicUrl(path)
  return data.publicUrl
}

export async function getHandoffsByOrder(orderId: string): Promise<Handoff[]> {
  const { data, error } = await supabase
    .from('handoffs')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}
