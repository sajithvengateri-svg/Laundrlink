import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}))

import { supabase } from '@/lib/supabase'
import {
  getProProfile,
  updateProProfile,
  setProAvailability,
  getProActiveJobs,
  getProCompletedJobs,
  getProMetrics,
  submitFit2WorkCheck,
} from '@/services/pro.service'

const SUPABASE_URL = 'https://eozguawwmpkaouzantie.supabase.co'

const mockPro = {
  id: 'pro-1',
  is_available: true,
  is_active: true,
  tier: 'rookie' as const,
  police_check_status: 'not_submitted' as const,
  fit2work_reference: null,
  quiz_passed: false,
  pledge_signed: false,
  id_verified: false,
  services: ['Washing', 'Drying'],
  machine_type: 'front_loader',
  machine_capacity_kg: 7,
  has_dryer: true,
  has_iron: false,
  detergent_type: null,
  price_per_bag: 1200,
  express_price_per_bag: null,
  max_bags_per_day: 10,
  affiliated_hub_id: null,
  stripe_connect_id: null,
  stripe_onboarding_complete: false,
  setup_photo_url: null,
  rating_avg: 4.7,
  rating_count: 5,
  total_orders: 12,
  abn: null,
  bio: null,
  availability: null,
  address: null,
  paused: false,
  handles_own_delivery: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockOrder = {
  id: 'ord-1',
  order_number: 'LL-2024-00001',
  status: 'with_pro',
  pro_id: 'pro-1',
  pro_payout_cents: 1200,
  hub: { id: 'hub-1', business_name: 'City Hub' },
  bags: [{ id: 'bag-1', qr_code: 'QR001', current_status: 'with_pro' }],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

// Chain factories
function makeSelectChain(returnValue: { data: unknown; error: Error | null }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(returnValue),
    single: vi.fn().mockResolvedValue(returnValue),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeUpdateChain(error: Error | null = null): any {
  const chain: Record<string, unknown> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockPro, error }),
    then: (resolve: (v: { error: Error | null }) => void) => resolve({ error }),
  }
  ;(chain.update as ReturnType<typeof vi.fn>).mockReturnValue(chain)
  ;(chain.eq as ReturnType<typeof vi.fn>).mockReturnValue(chain)
  ;(chain.select as ReturnType<typeof vi.fn>).mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
})

// ── getProProfile ─────────────────────────────────────────────────────────────

describe('getProProfile', () => {
  it('returns pro profile when found', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain({ data: mockPro, error: null }) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getProProfile('pro-1')
    expect(result?.id).toBe('pro-1')
    expect(result?.price_per_bag).toBe(1200)
  })

  it('returns null when not found', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain({ data: null, error: null }) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getProProfile('unknown')
    expect(result).toBeNull()
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain({ data: null, error: new Error('DB error') }) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(getProProfile('pro-1')).rejects.toThrow('DB error')
  })
})

// ── updateProProfile ──────────────────────────────────────────────────────────

describe('updateProProfile', () => {
  it('returns updated pro', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    const result = await updateProProfile('pro-1', { bio: 'Test bio' })
    expect(result.id).toBe('pro-1')
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith({ bio: 'Test bio' })
  })

  it('throws on error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain(new Error('Update failed')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(updateProProfile('pro-1', { is_available: true })).rejects.toThrow('Update failed')
  })
})

// ── setProAvailability ────────────────────────────────────────────────────────

describe('setProAvailability', () => {
  it('sets available without throwing', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await expect(setProAvailability('pro-1', true)).resolves.toBeUndefined()
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith({ is_available: true })
  })

  it('sets offline without throwing', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await expect(setProAvailability('pro-1', false)).resolves.toBeUndefined()
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith({ is_available: false })
  })

  it('throws on update error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain(new Error('Failed')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(setProAvailability('pro-1', true)).rejects.toThrow('Failed')
  })
})

// ── getProActiveJobs ──────────────────────────────────────────────────────────

describe('getProActiveJobs', () => {
  it('returns active jobs when found', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [mockOrder], error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(chain as unknown as ReturnType<typeof supabase.from>)
    const result = await getProActiveJobs('pro-1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('ord-1')
    expect(chain.in).toHaveBeenCalledWith('status', ['assigned_to_pro', 'with_pro'])
  })

  it('returns empty array when no jobs', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(chain as unknown as ReturnType<typeof supabase.from>)
    const result = await getProActiveJobs('pro-1')
    expect(result).toEqual([])
  })
})

// ── getProCompletedJobs ───────────────────────────────────────────────────────

describe('getProCompletedJobs', () => {
  it('returns completed jobs', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [mockOrder], error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(chain as unknown as ReturnType<typeof supabase.from>)
    const result = await getProCompletedJobs('pro-1', '2024-01-01')
    expect(result).toHaveLength(1)
  })

  it('returns empty when no completed jobs', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(chain as unknown as ReturnType<typeof supabase.from>)
    const result = await getProCompletedJobs('pro-1')
    expect(result).toEqual([])
  })
})

// ── getProMetrics ─────────────────────────────────────────────────────────────

describe('getProMetrics', () => {
  it('returns zero metrics when no orders today', async () => {
    const todayChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const weekChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { rating_avg: 4.7, total_orders: 12 }, error: null }),
    }
    vi.mocked(supabase.from)
      .mockReturnValueOnce(todayChain as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(weekChain as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(profileChain as unknown as ReturnType<typeof supabase.from>)

    const result = await getProMetrics('pro-1')
    expect(result.jobsToday).toBe(0)
    expect(result.earningsToday).toBe(0)
    expect(result.ratingAvg).toBe(4.7)
    expect(result.totalOrders).toBe(12)
  })

  it('sums pro_payout_cents correctly', async () => {
    const orders = [
      { id: 'o1', pro_payout_cents: 1200 },
      { id: 'o2', pro_payout_cents: 1500 },
    ]
    const todayChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: orders, error: null }) }
    const weekChain  = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: orders, error: null }) }
    const profileChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { rating_avg: 5, total_orders: 20 }, error: null }) }

    vi.mocked(supabase.from)
      .mockReturnValueOnce(todayChain as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(weekChain as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(profileChain as unknown as ReturnType<typeof supabase.from>)

    const result = await getProMetrics('pro-1')
    expect(result.jobsToday).toBe(2)
    expect(result.earningsToday).toBe(2700)
    expect(result.earningsThisWeek).toBe(2700)
  })
})

// ── submitFit2WorkCheck (edge function) ───────────────────────────────────────

describe('submitFit2WorkCheck', () => {
  it('returns reference on success', async () => {
    const result = await submitFit2WorkCheck('pro-1')
    expect(result.reference).toBe('FW-TEST-123456')
  })

  it('throws when edge function returns error', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/fit2work-check`, () =>
        HttpResponse.json({ error: 'Pro not found' }, { status: 404 })
      )
    )
    await expect(submitFit2WorkCheck('pro-1')).rejects.toThrow('Pro not found')
  })
})
