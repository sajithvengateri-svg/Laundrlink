import { supabase } from '@/lib/supabase'

export function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export async function setOrderOTP(orderId: string, type: 'pickup' | 'delivery'): Promise<string> {
  const otp = generateOTP()
  const column = type === 'pickup' ? 'pickup_otp' : 'delivery_otp'
  await supabase.from('orders').update({ [column]: otp }).eq('id', orderId)
  return otp
}

export async function verifyOrderOTP(orderId: string, type: 'pickup' | 'delivery', enteredOtp: string): Promise<boolean> {
  const column = type === 'pickup' ? 'pickup_otp' : 'delivery_otp'
  const { data } = await supabase
    .from('orders')
    .select(column)
    .eq('id', orderId)
    .single()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.[column] === enteredOtp
}

export async function findOrderByOTP(otp: string): Promise<{ orderId: string; type: 'pickup' | 'delivery' } | null> {
  // Check pickup_otp first
  const { data: pickupMatch } = await supabase
    .from('orders')
    .select('id')
    .eq('pickup_otp', otp)
    .not('status', 'in', '("delivered","cancelled")')
    .limit(1)
    .maybeSingle()

  if (pickupMatch) return { orderId: pickupMatch.id, type: 'pickup' }

  // Check delivery_otp
  const { data: deliveryMatch } = await supabase
    .from('orders')
    .select('id')
    .eq('delivery_otp', otp)
    .not('status', 'in', '("delivered","cancelled")')
    .limit(1)
    .maybeSingle()

  if (deliveryMatch) return { orderId: deliveryMatch.id, type: 'delivery' }

  return null
}

export async function getVerificationMethods(hubId?: string): Promise<string[]> {
  const fallback = ['qr', 'otp', 'manual']

  if (hubId) {
    const { data: hub } = await supabase
      .from('hubs')
      .select('verification_methods')
      .eq('id', hubId)
      .maybeSingle()
    if (hub?.verification_methods && hub.verification_methods.length > 0) {
      return hub.verification_methods
    }
  }

  // Try platform config
  const { data } = await supabase
    .from('pricing_config')
    .select('default_verification_methods')
    .limit(1)
    .maybeSingle()

  return data?.default_verification_methods ?? fallback
}
