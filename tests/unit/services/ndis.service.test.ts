import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import {
  getNdisInvoiceByOrder,
  getNdisInvoice,
} from '@/services/ndis.service'

// ── Chain factories ──────────────────────────────────────────────────────────

function makeSingleChain(data: unknown, error: Error | null = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

const mockFrom = vi.mocked(supabase.from)

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getNdisInvoiceByOrder ────────────────────────────────────────────────────

describe('getNdisInvoiceByOrder', () => {
  it('returns null when no invoice exists', async () => {
    mockFrom.mockReturnValue(makeSingleChain(null) as never)
    const result = await getNdisInvoiceByOrder('order-1')
    expect(result).toBeNull()
  })

  it('returns invoice record when found', async () => {
    const invoice = {
      id: 'inv-1',
      order_id: 'order-1',
      customer_id: 'cust-1',
      invoice_number: 'NDIS-20260222-ABC123',
      status: 'ready',
      pdf_url: 'https://storage.example.com/ndis-invoices/cust-1/NDIS-20260222-ABC123.txt',
    }
    mockFrom.mockReturnValue(makeSingleChain(invoice) as never)
    const result = await getNdisInvoiceByOrder('order-1')
    expect(result).toEqual(invoice)
    expect(mockFrom).toHaveBeenCalledWith('ndis_invoices')
  })

  it('queries by order_id', async () => {
    const chain = makeSingleChain(null)
    mockFrom.mockReturnValue(chain as never)
    await getNdisInvoiceByOrder('order-abc')
    expect(chain.eq).toHaveBeenCalledWith('order_id', 'order-abc')
  })

  it('throws on supabase error', async () => {
    const err = new Error('db error')
    mockFrom.mockReturnValue(makeSingleChain(null, err) as never)
    await expect(getNdisInvoiceByOrder('order-1')).rejects.toThrow('db error')
  })
})

// ── getNdisInvoice ───────────────────────────────────────────────────────────

describe('getNdisInvoice', () => {
  it('returns null when invoice not found', async () => {
    mockFrom.mockReturnValue(makeSingleChain(null) as never)
    const result = await getNdisInvoice('inv-999')
    expect(result).toBeNull()
  })

  it('returns invoice when found by id', async () => {
    const invoice = {
      id: 'inv-1',
      order_id: 'order-1',
      invoice_number: 'NDIS-20260222-ABC123',
      status: 'generating',
      pdf_url: null,
    }
    mockFrom.mockReturnValue(makeSingleChain(invoice) as never)
    const result = await getNdisInvoice('inv-1')
    expect(result?.status).toBe('generating')
    expect(result?.pdf_url).toBeNull()
  })

  it('queries by invoice id', async () => {
    const chain = makeSingleChain(null)
    mockFrom.mockReturnValue(chain as never)
    await getNdisInvoice('inv-xyz')
    expect(chain.eq).toHaveBeenCalledWith('id', 'inv-xyz')
  })

  it('throws on db error', async () => {
    const err = new Error('not found')
    mockFrom.mockReturnValue(makeSingleChain(null, err) as never)
    await expect(getNdisInvoice('inv-1')).rejects.toThrow('not found')
  })
})

// ── triggerNdisInvoice (fetch-based) ─────────────────────────────────────────

describe('triggerNdisInvoice', () => {
  it('calls generate-ndis-invoice edge function and returns response', async () => {
    const mockResponse = {
      status: 'generating',
      invoice_id: 'inv-new-1',
      invoice_number: 'NDIS-20260222-ABCDEF',
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { triggerNdisInvoice } = await import('@/services/ndis.service')
    const result = await triggerNdisInvoice('order-1')

    expect(result.status).toBe('generating')
    expect(result.invoice_id).toBe('inv-new-1')
    expect(mockFetch).toHaveBeenCalledOnce()

    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain('generate-ndis-invoice')
    expect(opts.method).toBe('POST')
    expect(JSON.parse(opts.body as string)).toEqual({ orderId: 'order-1' })

    vi.unstubAllGlobals()
  })

  it('throws when edge function returns non-ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ error: 'Order not NDIS-flagged' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const { triggerNdisInvoice } = await import('@/services/ndis.service')
    await expect(triggerNdisInvoice('order-1')).rejects.toThrow('Order not NDIS-flagged')

    vi.unstubAllGlobals()
  })
})
