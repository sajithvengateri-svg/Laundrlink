import { supabase } from '@/lib/supabase'
import type { PaymentIntentResponse } from '@/types/order.types'

const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

async function callEdgeFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${EDGE_FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `Edge function ${name} failed`)
  }

  return res.json() as Promise<T>
}

export async function createPaymentIntent(
  orderId: string,
  amountCents: number,
  hubStripeAccountId: string
): Promise<PaymentIntentResponse> {
  return callEdgeFunction<PaymentIntentResponse>('create-payment-intent', {
    order_id: orderId,
    amount_cents: amountCents,
    hub_stripe_account_id: hubStripeAccountId,
  })
}

export async function getStripeConnectOnboardingUrl(hubId: string): Promise<{ url: string }> {
  return callEdgeFunction<{ url: string }>('stripe-connect-onboard', { hub_id: hubId })
}

export async function assignHubToOrder(
  orderId: string,
  lat: number,
  lng: number
): Promise<{ hub_id: string; hub_name: string; distance_km: number }> {
  return callEdgeFunction('assign-hub-pro', { order_id: orderId, lat, lng })
}

export async function getPaymentLedger(orderId: string) {
  const { data, error } = await supabase
    .from('payment_ledger')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateOrderPaymentIntent(
  orderId: string,
  paymentIntentId: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ stripe_payment_intent_id: paymentIntentId })
    .eq('id', orderId)

  if (error) throw error
}
