import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  submitRating,
  getOrderRatings,
  hasRatedOrder,
  getEntityRatingStats,
} from '@/services/rating.service'
import type { SubmitRatingParams } from '@/types/rating.types'

const mockRating = {
  id: 'rating-1',
  order_id: 'ord-1',
  customer_id: 'cust-1',
  rated_entity_id: 'hub-1',
  rated_entity_type: 'hub',
  stars: 4,
  tags: ['Clean', 'Fast'],
  review_text: 'Great service!',
  created_at: '2024-01-01T00:00:00Z',
}

const mockParams: SubmitRatingParams = {
  orderId: 'ord-1',
  customerId: 'cust-1',
  ratedEntityId: 'hub-1',
  ratedEntityType: 'hub',
  stars: 4,
  tags: ['Clean', 'Fast'],
  reviewText: 'Great service!',
}

// ── Chain factories ──────────────────────────────────────────────────────────

function makeInsertChain(returnValue: { data: unknown; error: Error | null }) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
  }
}

function makeSelectChain(data: unknown[], error: Error | null = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  return chain
}

// A silent no-op chain — used for fire-and-forget side-effect calls in submitRating
function makeSilentChain() {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    then: (resolve: (v: { data: null; error: null }) => void) =>
      resolve({ data: null, error: null }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── submitRating ─────────────────────────────────────────────────────────────

describe('submitRating', () => {
  it('inserts a rating and returns it', async () => {
    // First call: insert into order_ratings
    vi.mocked(supabase.from)
      .mockReturnValueOnce(
        makeInsertChain({ data: mockRating, error: null }) as unknown as ReturnType<
          typeof supabase.from
        >
      )
      // Subsequent calls are the fire-and-forget avg update (getEntityRatingStats + entity update)
      .mockReturnValue(
        makeSilentChain() as unknown as ReturnType<typeof supabase.from>
      )

    const result = await submitRating(mockParams)
    expect(result.id).toBe('rating-1')
    expect(result.stars).toBe(4)
    expect(result.rated_entity_type).toBe('hub')
  })

  it('throws when the insert fails', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeInsertChain({ data: null, error: new Error('Insert failed') }) as unknown as ReturnType<
        typeof supabase.from
      >
    )
    await expect(submitRating(mockParams)).rejects.toThrow('Insert failed')
  })
})

// ── getOrderRatings ──────────────────────────────────────────────────────────

describe('getOrderRatings', () => {
  it('returns all ratings for an order', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [mockRating], error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(
      chain as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getOrderRatings('ord-1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rating-1')
  })

  it('returns empty array when no ratings', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(
      chain as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getOrderRatings('ord-missing')
    expect(result).toHaveLength(0)
  })

  it('throws on database error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(
      chain as unknown as ReturnType<typeof supabase.from>
    )
    await expect(getOrderRatings('ord-1')).rejects.toThrow('DB error')
  })
})

// ── hasRatedOrder ─────────────────────────────────────────────────────────────

describe('hasRatedOrder', () => {
  it('returns true when customer has already rated the order', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain([{ id: 'rating-1' }]) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await hasRatedOrder('ord-1', 'cust-1')
    expect(result).toBe(true)
  })

  it('returns false when customer has not rated yet', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain([]) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await hasRatedOrder('ord-1', 'cust-1')
    expect(result).toBe(false)
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain([], new Error('DB error')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(hasRatedOrder('ord-1', 'cust-1')).rejects.toThrow('DB error')
  })
})

// ── getEntityRatingStats ──────────────────────────────────────────────────────

describe('getEntityRatingStats', () => {
  it('computes correct average and count from multiple ratings', async () => {
    const rows = [{ stars: 4 }, { stars: 5 }, { stars: 3 }]
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
    }
    chain.eq = vi.fn().mockReturnValue({
      ...chain,
      eq: vi.fn().mockResolvedValue({ data: rows, error: null }),
    })
    vi.mocked(supabase.from).mockReturnValueOnce(
      chain as unknown as ReturnType<typeof supabase.from>
    )

    const result = await getEntityRatingStats('hub-1', 'hub')
    expect(result.count).toBe(3)
    expect(result.avg).toBe(4) // (4+5+3)/3 = 4.0
  })

  it('returns avg 0 and count 0 when no ratings exist', async () => {
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
    }
    chain.eq = vi.fn().mockReturnValue({
      ...chain,
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })
    vi.mocked(supabase.from).mockReturnValueOnce(
      chain as unknown as ReturnType<typeof supabase.from>
    )

    const result = await getEntityRatingStats('hub-missing', 'hub')
    expect(result.avg).toBe(0)
    expect(result.count).toBe(0)
  })

  it('throws on database error', async () => {
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
    }
    chain.eq = vi.fn().mockReturnValue({
      ...chain,
      eq: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    })
    vi.mocked(supabase.from).mockReturnValueOnce(
      chain as unknown as ReturnType<typeof supabase.from>
    )

    await expect(getEntityRatingStats('hub-1', 'hub')).rejects.toThrow('DB error')
  })
})
