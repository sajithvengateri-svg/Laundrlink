import { supabase } from '@/lib/supabase'

const EDGE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

export interface NdisInvoice {
  id: string
  order_id: string
  customer_id: string
  invoice_number: string
  participant_name: string
  ndis_number: string
  plan_manager: string | null
  support_item_number: string
  amount_cents: number
  gst_cents: number
  service_date: string
  pdf_url: string | null
  status: 'generating' | 'ready' | 'draft'
  created_at: string
}

export interface TriggerNdisResponse {
  status: 'generating' | 'ready'
  invoice_id: string
  invoice_number?: string
  pdf_url?: string | null
}

export async function triggerNdisInvoice(orderId: string): Promise<TriggerNdisResponse> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${EDGE_FUNCTIONS_URL}/generate-ndis-invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ orderId }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Failed to trigger NDIS invoice generation')
  }

  return res.json() as Promise<TriggerNdisResponse>
}

export async function getNdisInvoiceByOrder(orderId: string): Promise<NdisInvoice | null> {
  const { data, error } = await supabase
    .from('ndis_invoices')
    .select('*')
    .eq('order_id', orderId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data as NdisInvoice | null
}

export async function getNdisInvoice(invoiceId: string): Promise<NdisInvoice | null> {
  const { data, error } = await supabase
    .from('ndis_invoices')
    .select('*')
    .eq('id', invoiceId)
    .maybeSingle()

  if (error) throw error
  return data as NdisInvoice | null
}
