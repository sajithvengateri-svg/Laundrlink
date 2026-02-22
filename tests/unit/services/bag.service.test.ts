import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  storage: {
    handoffPhotos: { upload: vi.fn(), getPublicUrl: vi.fn() },
    signatures: { upload: vi.fn(), getPublicUrl: vi.fn() },
  },
}))

import { supabase } from '@/lib/supabase'
import { getBagByQR, assignBagToOrder, updateBagStatus } from '@/services/bag.service'

const mockBag = {
  id: 'bag-1',
  qr_code: 'LL-BAG-001',
  current_status: 'unassigned',
  current_order_id: null,
  current_holder_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

function makeChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBagByQR', () => {
  it('returns null for unknown QR code', async () => {
    const chain = makeChain({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await getBagByQR('UNKNOWN-QR')
    expect(result).toBeNull()
  })

  it('returns bag with order details when found', async () => {
    const bagWithOrder = { ...mockBag, order: { id: 'ord-1', order_number: 'LL-001', status: 'at_hub' } }
    const chain = makeChain({ data: bagWithOrder, error: null })
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await getBagByQR('LL-BAG-001')
    expect(result).not.toBeNull()
    expect(result?.qr_code).toBe('LL-BAG-001')
  })

  it('throws on database error', async () => {
    const chain = makeChain({ data: null, error: new Error('DB error') })
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(getBagByQR('LL-BAG-001')).rejects.toThrow('DB error')
  })
})

describe('assignBagToOrder', () => {
  it('throws when bag is not found', async () => {
    const chain = makeChain({ data: null, error: null })
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(
      assignBagToOrder({ qrCode: 'MISSING', orderId: 'ord-1', holderId: 'user-1' })
    ).rejects.toThrow('Bag QR code not found: MISSING')
  })

  it('throws when bag is already assigned to a different order', async () => {
    const assignedBag = { ...mockBag, current_order_id: 'ord-OTHER' }
    const chain = makeChain({ data: assignedBag, error: null })
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(
      assignBagToOrder({ qrCode: 'LL-BAG-001', orderId: 'ord-NEW', holderId: 'user-1' })
    ).rejects.toThrow('already assigned')
  })
})

describe('updateBagStatus', () => {
  it('updates status and returns updated bag', async () => {
    const updatedBag = { ...mockBag, current_status: 'at_hub' }
    const chain = makeChain({ data: updatedBag, error: null })
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await updateBagStatus('bag-1', 'at_hub')
    expect(result.current_status).toBe('at_hub')
  })
})
