/**
 * generate-ndis-invoice — async NDIS tax invoice PDF generation.
 *
 * Flow:
 *  1. Create ndis_invoices row immediately (status: 'generating')
 *  2. Return {status: 'generating', invoice_id} to caller (don't block)
 *  3. EdgeRuntime.waitUntil: generate PDF, upload to ndis-invoices bucket,
 *     update pdf_url, set status: 'ready', create notification
 *
 * Invoice contains: LaundrLink ABN, participant NDIS number,
 * support item code 01_020_0120_1_1, line items with GST breakdown.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'

const LAUNDRLINK_ABN = '12 345 678 901'
const SUPPORT_ITEM_NUMBER = '01_020_0120_1_1'
const GST_RATE = 0.10

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const startTime = Date.now()
  const fn = 'generate-ndis-invoice'

  try {
    const { orderId } = await req.json() as { orderId: string }
    logger.info('function.invoked', { function: fn, orderId })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Load order + customer profile
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        *,
        customer:profiles!orders_customer_id_fkey (
          id, full_name, ndis_number, ndis_plan_manager
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderErr || !order) throw new Error('Order not found')
    if (!order.is_ndis) throw new Error('Order is not NDIS-flagged')

    const customer = order.customer as {
      id: string; full_name: string | null
      ndis_number: string | null; ndis_plan_manager: string | null
    } | null

    if (!customer?.ndis_number) throw new Error('Customer NDIS number not set')

    // Check idempotency
    const { data: existing } = await supabase
      .from('ndis_invoices')
      .select('id, status, pdf_url')
      .eq('order_id', orderId)
      .limit(1)

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ status: existing[0].status, invoice_id: existing[0].id, pdf_url: existing[0].pdf_url }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate amounts
    const subtotal = order.subtotal_cents ?? order.total_cents ?? 0
    const gstCents = Math.round(subtotal * GST_RATE)

    // Generate invoice number: NDIS-YYYYMMDD-XXXXXX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const invoiceNumber = `NDIS-${today}-${orderId.slice(0, 6).toUpperCase()}`

    // Create DB row immediately
    const { data: invoice, error: insertErr } = await supabase
      .from('ndis_invoices')
      .insert({
        order_id: orderId,
        customer_id: customer.id,
        invoice_number: invoiceNumber,
        participant_name: customer.full_name ?? 'Participant',
        ndis_number: customer.ndis_number,
        plan_manager: customer.ndis_plan_manager,
        support_item_number: SUPPORT_ITEM_NUMBER,
        amount_cents: subtotal,
        gst_cents: gstCents,
        service_date: order.completed_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        status: 'generating',
      })
      .select()
      .single()

    if (insertErr || !invoice) throw insertErr ?? new Error('Failed to create invoice record')

    // Fire-and-forget: generate PDF, upload, update record
    const generateAndStore = async () => {
      try {
        const pdfContent = buildInvoicePdf({
          invoiceNumber,
          participantName: customer.full_name ?? 'Participant',
          ndisNumber: customer.ndis_number!,
          planManager: customer.ndis_plan_manager,
          supportItemNumber: SUPPORT_ITEM_NUMBER,
          orderNumber: order.order_number,
          serviceDate: invoice.service_date ?? '',
          subtotalCents: subtotal,
          gstCents,
          totalCents: subtotal + gstCents,
          abn: LAUNDRLINK_ABN,
        })

        const pdfBytes = new TextEncoder().encode(pdfContent)
        const path = `${customer.id}/${invoiceNumber}.txt`

        const { error: uploadErr } = await supabase.storage
          .from('ndis-invoices')
          .upload(path, pdfBytes, { contentType: 'text/plain', upsert: true })

        if (uploadErr) throw uploadErr

        const { data: { publicUrl } } = supabase.storage
          .from('ndis-invoices')
          .getPublicUrl(path)

        await supabase
          .from('ndis_invoices')
          .update({ pdf_url: publicUrl, status: 'ready' })
          .eq('id', invoice.id)

        // Notify customer
        await supabase.from('notifications').insert({
          profile_id: customer.id,
          type: 'ndis_invoice_ready',
          title: 'NDIS Invoice Ready',
          body: `Your NDIS invoice ${invoiceNumber} is ready to download.`,
          channel: 'in_app',
          order_id: orderId,
        })

        logger.info('invoice.generated', { function: fn, invoiceId: invoice.id, invoiceNumber })
      } catch (err) {
        logger.error('invoice.generation_failed', err as Error, { function: fn, invoiceId: invoice.id })
        await supabase
          .from('ndis_invoices')
          .update({ status: 'draft' })
          .eq('id', invoice.id)
      }
    }

    // Use waitUntil if available (Deno Deploy), otherwise run synchronously
    // deno-lint-ignore no-explicit-any
    if (typeof (globalThis as any).EdgeRuntime !== 'undefined') {
      // deno-lint-ignore no-explicit-any
      ;(globalThis as any).EdgeRuntime.waitUntil(generateAndStore())
    } else {
      await generateAndStore()
    }

    logger.duration('function.responded', startTime, { function: fn, invoiceId: invoice.id })

    return new Response(
      JSON.stringify({ status: 'generating', invoice_id: invoice.id, invoice_number: invoiceNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    logger.error('function.error', err as Error, { function: fn })
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

interface InvoiceData {
  invoiceNumber: string
  participantName: string
  ndisNumber: string
  planManager: string | null
  supportItemNumber: string
  orderNumber: string
  serviceDate: string
  subtotalCents: number
  gstCents: number
  totalCents: number
  abn: string
}

function centsToAud(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/** Generates a plain-text invoice (production would use @react-pdf/renderer). */
function buildInvoicePdf(d: InvoiceData): string {
  return [
    '==================================================',
    '        LaundrLink Pty Ltd — NDIS Tax Invoice',
    '==================================================',
    `ABN: ${d.abn}`,
    '',
    `Invoice Number : ${d.invoiceNumber}`,
    `Service Date   : ${d.serviceDate}`,
    `Order Number   : ${d.orderNumber}`,
    '',
    '--- Participant Details --------------------------',
    `Name           : ${d.participantName}`,
    `NDIS Number    : ${d.ndisNumber}`,
    ...(d.planManager ? [`Plan Manager   : ${d.planManager}`] : []),
    '',
    '--- Support Item --------------------------------',
    `Item Number    : ${d.supportItemNumber}`,
    `Description    : Laundry and Household Support`,
    '',
    '--- Amounts -------------------------------------',
    `Subtotal (excl. GST) : ${centsToAud(d.subtotalCents)}`,
    `GST (10%)            : ${centsToAud(d.gstCents)}`,
    `Total (incl. GST)    : ${centsToAud(d.totalCents)}`,
    '',
    '==================================================',
    'This document is a valid NDIS Tax Invoice.',
    'Issued by LaundrLink Pty Ltd',
    '==================================================',
  ].join('\n')
}
