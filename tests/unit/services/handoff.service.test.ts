import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HandoffStep } from '@/types/hub.types'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
  storage: {
    handoffPhotos: {
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/photo.jpg' } }),
    },
    signatures: {
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/sig.png' } }),
    },
  },
}))

import { supabase, storage } from '@/lib/supabase'
import { createHandoff, uploadHandoffPhoto, uploadSignature, getHandoffsByOrder } from '@/services/handoff.service'
import type { CreateHandoffParams } from '@/types/hub.types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockHandoff = {
  id: 'handoff-1',
  order_id: 'ord-1',
  bag_id: 'bag-1',
  step: 'driver_to_hub' as HandoffStep,
  from_user_id: 'driver-1',
  to_user_id: 'hub-1',
  scanned_by: 'hub-1',
  photo_urls: ['https://cdn.example.com/photo.jpg'],
  signature_url: null,
  location_lat: null,
  location_lng: null,
  created_at: '2024-01-01T00:00:00Z',
}

const validParams: CreateHandoffParams = {
  orderId: 'ord-1',
  bagId: 'bag-1',
  step: 'driver_to_hub',
  fromUserId: 'driver-1',
  toUserId: 'hub-1',
  scannedById: 'hub-1',
  photoUrls: ['https://cdn.example.com/photo.jpg'],
}

// ─── Chain factories ──────────────────────────────────────────────────────────

// handoffs INSERT → SELECT → SINGLE
function makeInsertChain(returnValue: { data: unknown; error: Error | null }) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
  }
}

// bags/orders UPDATE → EQ
function makeUpdateChain(error: Error | null = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error }),
  }
}

// orders SELECT → EQ → SINGLE (used by fire-and-forget notifyCustomerViaSMS)
function makeSmsQueryChain() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}

// handoffs SELECT → EQ → ORDER (used by getHandoffsByOrder)
function makeSelectOrderChain(returnValue: { data: unknown; error: Error | null }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(returnValue),
  }
}

// Wires up the 3 awaited calls in createHandoff + optional 4th for SMS query
function mockCreateHandoffSuccess(handoff = mockHandoff) {
  vi.mocked(supabase.from)
    .mockReturnValueOnce(makeInsertChain({ data: handoff, error: null }) as unknown as ReturnType<typeof supabase.from>)
    .mockReturnValueOnce(makeUpdateChain() as unknown as ReturnType<typeof supabase.from>)
    .mockReturnValueOnce(makeUpdateChain() as unknown as ReturnType<typeof supabase.from>)
    .mockReturnValueOnce(makeSmsQueryChain() as unknown as ReturnType<typeof supabase.from>)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── createHandoff ─────────────────────────────────────────────────────────────

describe('createHandoff', () => {
  it('throws when photoUrls is empty', async () => {
    await expect(
      createHandoff({ ...validParams, photoUrls: [] })
    ).rejects.toThrow('At least one photo is required')
  })

  it('throws when photoUrls is undefined', async () => {
    const params = { ...validParams }
    delete params.photoUrls
    await expect(createHandoff(params)).rejects.toThrow('At least one photo is required')
  })

  it('inserts handoff record and returns it', async () => {
    mockCreateHandoffSuccess()
    const result = await createHandoff(validParams)
    expect(result.id).toBe('handoff-1')
    expect(result.step).toBe('driver_to_hub')
  })

  it('calls from() on handoffs, bags, and orders in sequence', async () => {
    mockCreateHandoffSuccess()
    await createHandoff(validParams)
    expect(supabase.from).toHaveBeenNthCalledWith(1, 'handoffs')
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'bags')
    expect(supabase.from).toHaveBeenNthCalledWith(3, 'orders')
  })

  it('sets current_holder_id to toUserId on bag update', async () => {
    mockCreateHandoffSuccess()
    await createHandoff({ ...validParams, toUserId: 'hub-99' })
    const bagChain = vi.mocked(supabase.from).mock.results[1]?.value as ReturnType<typeof makeUpdateChain>
    expect(bagChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ current_holder_id: 'hub-99' })
    )
  })

  it('throws when handoff insert fails (duplicate scan)', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeInsertChain({ data: null, error: new Error('Duplicate handoff') }) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(createHandoff(validParams)).rejects.toThrow('Duplicate handoff')
  })

  it('throws when bag status update fails', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeInsertChain({ data: mockHandoff, error: null }) as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(makeUpdateChain(new Error('Bag update failed')) as unknown as ReturnType<typeof supabase.from>)
    await expect(createHandoff(validParams)).rejects.toThrow('Bag update failed')
  })

  it('throws when order status update fails', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeInsertChain({ data: mockHandoff, error: null }) as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(makeUpdateChain() as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(makeUpdateChain(new Error('Order update failed')) as unknown as ReturnType<typeof supabase.from>)
    await expect(createHandoff(validParams)).rejects.toThrow('Order update failed')
  })

  it('passes optional fields (signature, location) through to insert', async () => {
    mockCreateHandoffSuccess()
    await createHandoff({
      ...validParams,
      signatureUrl: 'https://cdn.example.com/sig.png',
      locationLat: -33.8688,
      locationLng: 151.2093,
    })
    const handoffChain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeInsertChain>
    expect(handoffChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        signature_url: 'https://cdn.example.com/sig.png',
        location_lat: -33.8688,
        location_lng: 151.2093,
      })
    )
  })

  it('sets signature_url to null when not provided', async () => {
    mockCreateHandoffSuccess()
    await createHandoff(validParams)
    const handoffChain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeInsertChain>
    expect(handoffChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ signature_url: null })
    )
  })
})

// ── Step → status transition matrix ──────────────────────────────────────────

describe('createHandoff — step status transitions', () => {
  const stepCases: Array<[HandoffStep, string, string]> = [
    ['customer_to_driver', 'in_transit_to_hub',       'picked_up_by_driver'],
    ['driver_to_hub',      'at_hub',                   'at_hub'],
    ['hub_to_pro',         'with_pro',                 'with_pro'],
    ['pro_to_hub',         'at_hub',                   'returned_to_hub'],
    ['hub_to_driver',      'in_transit_to_customer',   'out_for_delivery'],
    ['driver_to_customer', 'delivered',                'delivered'],
  ]

  it.each(stepCases)(
    'step=%s → bagStatus=%s, orderStatus=%s',
    async (step, expectedBagStatus, expectedOrderStatus) => {
      const handoff = { ...mockHandoff, step }
      vi.mocked(supabase.from)
        .mockReturnValueOnce(makeInsertChain({ data: handoff, error: null }) as unknown as ReturnType<typeof supabase.from>)
        .mockReturnValueOnce(makeUpdateChain() as unknown as ReturnType<typeof supabase.from>)
        .mockReturnValueOnce(makeUpdateChain() as unknown as ReturnType<typeof supabase.from>)
        .mockReturnValueOnce(makeSmsQueryChain() as unknown as ReturnType<typeof supabase.from>)

      await createHandoff({ ...validParams, step })

      const bagChain = vi.mocked(supabase.from).mock.results[1]?.value as ReturnType<typeof makeUpdateChain>
      expect(bagChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ current_status: expectedBagStatus })
      )

      const orderChain = vi.mocked(supabase.from).mock.results[2]?.value as ReturnType<typeof makeUpdateChain>
      expect(orderChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: expectedOrderStatus })
      )
    }
  )
})

// ── uploadHandoffPhoto ────────────────────────────────────────────────────────

describe('uploadHandoffPhoto', () => {
  it('uploads to correct path and returns public URL', async () => {
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    const url = await uploadHandoffPhoto(file, 'ord-1', 'handoff-1', 0)
    expect(url).toBe('https://cdn.example.com/photo.jpg')
    expect(storage.handoffPhotos.upload).toHaveBeenCalledWith(
      'ord-1/handoff-1/0.jpg',
      file,
      expect.objectContaining({ contentType: 'image/jpeg', upsert: true })
    )
  })

  it('uses file index in path for multiple photos', async () => {
    const file = new File(['data'], 'photo.png', { type: 'image/png' })
    await uploadHandoffPhoto(file, 'ord-99', 'handoff-99', 2)
    expect(storage.handoffPhotos.upload).toHaveBeenCalledWith(
      'ord-99/handoff-99/2.png',
      file,
      expect.anything()
    )
  })

  it('uses full filename as extension when no dot is present', async () => {
    // 'photo'.split('.').pop() === 'photo' — service uses the whole name as ext
    const file = new File(['data'], 'photo', { type: 'image/jpeg' })
    await uploadHandoffPhoto(file, 'ord-1', 'handoff-1', 0)
    expect(storage.handoffPhotos.upload).toHaveBeenCalledWith(
      'ord-1/handoff-1/0.photo',
      expect.anything(),
      expect.anything()
    )
  })

  it('throws when storage upload returns an error', async () => {
    vi.mocked(storage.handoffPhotos.upload).mockResolvedValueOnce(
      { error: new Error('Storage quota exceeded'), data: null } as never
    )
    const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' })
    await expect(uploadHandoffPhoto(file, 'ord-1', 'handoff-1', 0)).rejects.toThrow('Storage quota exceeded')
  })
})

// ── uploadSignature ───────────────────────────────────────────────────────────

describe('uploadSignature', () => {
  it('uploads to orderId/signature.png and returns URL', async () => {
    const file = new File(['data'], 'sig.png', { type: 'image/png' })
    const url = await uploadSignature(file, 'ord-1')
    expect(url).toBe('https://cdn.example.com/sig.png')
    expect(storage.signatures.upload).toHaveBeenCalledWith(
      'ord-1/signature.png',
      file,
      expect.objectContaining({ contentType: 'image/png', upsert: true })
    )
  })

  it('throws when signature upload fails', async () => {
    vi.mocked(storage.signatures.upload).mockResolvedValueOnce(
      { error: new Error('Upload failed'), data: null } as never
    )
    const file = new File(['data'], 'sig.png', { type: 'image/png' })
    await expect(uploadSignature(file, 'ord-1')).rejects.toThrow('Upload failed')
  })
})

// ── getHandoffsByOrder ────────────────────────────────────────────────────────

describe('getHandoffsByOrder', () => {
  it('returns empty array when no handoffs exist', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectOrderChain({ data: null, error: null }) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getHandoffsByOrder('ord-none')
    expect(result).toEqual([])
  })

  it('returns all handoffs for the order', async () => {
    const handoffs = [
      mockHandoff,
      { ...mockHandoff, id: 'handoff-2', step: 'hub_to_pro' as HandoffStep },
    ]
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectOrderChain({ data: handoffs, error: null }) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getHandoffsByOrder('ord-1')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('handoff-1')
    expect(result[1].id).toBe('handoff-2')
  })

  it('orders results ascending by created_at', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectOrderChain({ data: [mockHandoff], error: null }) as unknown as ReturnType<typeof supabase.from>
    )
    await getHandoffsByOrder('ord-1')
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeSelectOrderChain>
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectOrderChain({ data: null, error: new Error('Connection failed') }) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(getHandoffsByOrder('ord-1')).rejects.toThrow('Connection failed')
  })
})
