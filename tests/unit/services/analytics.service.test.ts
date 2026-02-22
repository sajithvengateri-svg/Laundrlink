import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  getCustomerStats,
  getCustomerMonthlySpending,
  getHubDailyOrders,
  getProWeeklyJobs,
} from '@/services/analytics.service'

// ── Chain factory ─────────────────────────────────────────────────────────────

function makeChain(data: unknown, error: Error | null = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: Error | null }) => void) =>
      resolve({ data, error }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  return chain
}

const mockFrom = vi.mocked(supabase.from)

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getCustomerStats ──────────────────────────────────────────────────────────

describe('getCustomerStats', () => {
  it('returns zero stats when no orders', async () => {
    mockFrom.mockReturnValue(makeChain([]) as never)
    const stats = await getCustomerStats('cust-1')
    expect(stats.totalSpent).toBe(0)
    expect(stats.totalOrders).toBe(0)
    expect(stats.deliveredOrders).toBe(0)
    expect(stats.cancelledOrders).toBe(0)
    expect(stats.avgOrderValue).toBe(0)
    expect(stats.favouriteHub).toBeNull()
  })

  it('correctly sums delivered spend and ignores cancelled', async () => {
    const orders = [
      { status: 'delivered', total_cents: 2000, hub: { business_name: 'Bubble Wash' } },
      { status: 'delivered', total_cents: 3000, hub: { business_name: 'Bubble Wash' } },
      { status: 'cancelled', total_cents: 5000, hub: { business_name: 'Sudsy Hub' } },
    ]
    mockFrom.mockReturnValue(makeChain(orders) as never)
    const stats = await getCustomerStats('cust-1')
    expect(stats.totalSpent).toBe(5000)
    expect(stats.totalOrders).toBe(3)
    expect(stats.deliveredOrders).toBe(2)
    expect(stats.cancelledOrders).toBe(1)
    expect(stats.avgOrderValue).toBe(2500)
  })

  it('identifies favourite hub by order count', async () => {
    const orders = [
      { status: 'delivered', total_cents: 1000, hub: { business_name: 'Hub A' } },
      { status: 'delivered', total_cents: 1000, hub: { business_name: 'Hub B' } },
      { status: 'delivered', total_cents: 1000, hub: { business_name: 'Hub A' } },
    ]
    mockFrom.mockReturnValue(makeChain(orders) as never)
    const stats = await getCustomerStats('cust-1')
    expect(stats.favouriteHub).toBe('Hub A')
  })

  it('returns null favouriteHub when no hub data', async () => {
    const orders = [
      { status: 'delivered', total_cents: 1000, hub: null },
    ]
    mockFrom.mockReturnValue(makeChain(orders) as never)
    const stats = await getCustomerStats('cust-1')
    expect(stats.favouriteHub).toBeNull()
  })

  it('throws on db error', async () => {
    mockFrom.mockReturnValue(makeChain(null, new Error('db error')) as never)
    await expect(getCustomerStats('cust-1')).rejects.toThrow('db error')
  })
})

// ── getCustomerMonthlySpending ────────────────────────────────────────────────

describe('getCustomerMonthlySpending', () => {
  it('returns 6 buckets by default', async () => {
    mockFrom.mockReturnValue(makeChain([]) as never)
    const result = await getCustomerMonthlySpending('cust-1', 6)
    expect(result).toHaveLength(6)
  })

  it('sums spending into correct month bucket', async () => {
    const now = new Date()
    const thisMonthIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15T10:00:00Z`
    const orders = [
      { total_cents: 1500, created_at: thisMonthIso },
      { total_cents: 2500, created_at: thisMonthIso },
    ]
    mockFrom.mockReturnValue(makeChain(orders) as never)
    const result = await getCustomerMonthlySpending('cust-1', 6)
    const lastBucket = result[result.length - 1]
    expect(lastBucket.total).toBe(4000)
  })

  it('returns zero for months with no orders', async () => {
    mockFrom.mockReturnValue(makeChain([]) as never)
    const result = await getCustomerMonthlySpending('cust-1', 3)
    expect(result.every((m) => m.total === 0)).toBe(true)
  })

  it('each bucket has a month label string', async () => {
    mockFrom.mockReturnValue(makeChain([]) as never)
    const result = await getCustomerMonthlySpending('cust-1', 4)
    for (const b of result) {
      expect(typeof b.month).toBe('string')
      expect(b.month.length).toBeGreaterThan(0)
    }
  })
})

// ── getHubDailyOrders ─────────────────────────────────────────────────────────

describe('getHubDailyOrders', () => {
  it('returns N day buckets', async () => {
    mockFrom.mockReturnValue(makeChain([]) as never)
    const result = await getHubDailyOrders('hub-1', 14)
    expect(result).toHaveLength(14)
  })

  it('counts orders on correct day', async () => {
    const today = new Date().toISOString()
    const orders = [
      { created_at: today },
      { created_at: today },
    ]
    mockFrom.mockReturnValue(makeChain(orders) as never)
    const result = await getHubDailyOrders('hub-1', 14)
    const lastDay = result[result.length - 1]
    expect(lastDay.count).toBe(2)
  })

  it('queries by hub_id', async () => {
    const chain = makeChain([])
    mockFrom.mockReturnValue(chain as never)
    await getHubDailyOrders('hub-xyz', 7)
    expect(chain.eq).toHaveBeenCalledWith('hub_id', 'hub-xyz')
  })

  it('throws on db error', async () => {
    mockFrom.mockReturnValue(makeChain(null, new Error('db fail')) as never)
    await expect(getHubDailyOrders('hub-1', 7)).rejects.toThrow('db fail')
  })
})

// ── getProWeeklyJobs ──────────────────────────────────────────────────────────

describe('getProWeeklyJobs', () => {
  it('returns N week buckets', async () => {
    mockFrom.mockReturnValue(makeChain([]) as never)
    const result = await getProWeeklyJobs('pro-1', 8)
    expect(result).toHaveLength(8)
  })

  it('counts this week jobs in last bucket', async () => {
    const today = new Date().toISOString()
    const orders = [{ created_at: today }, { created_at: today }]
    mockFrom.mockReturnValue(makeChain(orders) as never)
    const result = await getProWeeklyJobs('pro-1', 8)
    const lastWeek = result[result.length - 1]
    expect(lastWeek.value).toBe(2)
  })

  it('queries correct statuses', async () => {
    const chain = makeChain([])
    mockFrom.mockReturnValue(chain as never)
    await getProWeeklyJobs('pro-1', 4)
    expect(chain.in).toHaveBeenCalledWith(
      'status',
      ['returned_to_hub', 'out_for_delivery', 'delivered']
    )
  })

  it('queries by pro_id', async () => {
    const chain = makeChain([])
    mockFrom.mockReturnValue(chain as never)
    await getProWeeklyJobs('pro-abc', 4)
    expect(chain.eq).toHaveBeenCalledWith('pro_id', 'pro-abc')
  })
})
