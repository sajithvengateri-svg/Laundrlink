import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  getLoyaltyProfile,
  getLoyaltyTransactions,
  getReferrals,
  getReferralStats,
} from '@/services/loyalty.service'

// ── Chain factories ──────────────────────────────────────────────────────────

function makeSelectChain(data: unknown, error: Error | null = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: (v: { data: unknown; error: Error | null }) => void) =>
      resolve({ data, error }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getLoyaltyProfile ─────────────────────────────────────────────────────────

describe('getLoyaltyProfile', () => {
  it('returns mapped loyalty profile', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain({
        loyalty_points: 750,
        loyalty_tier: 'bronze',
        referral_code: 'LLTEST1',
      }) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getLoyaltyProfile('user-1')
    expect(result?.points).toBe(750)
    expect(result?.tier).toBe('bronze')
    expect(result?.referralCode).toBe('LLTEST1')
  })

  it('returns null when profile not found', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain(null) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getLoyaltyProfile('user-missing')
    expect(result).toBeNull()
  })

  it('defaults to bronze tier when loyalty_tier is null', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain({
        loyalty_points: null,
        loyalty_tier: null,
        referral_code: null,
      }) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getLoyaltyProfile('user-1')
    expect(result?.points).toBe(0)
    expect(result?.tier).toBe('bronze')
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain(null, new Error('DB error')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(getLoyaltyProfile('user-1')).rejects.toThrow('DB error')
  })
})

// ── getLoyaltyTransactions ────────────────────────────────────────────────────

describe('getLoyaltyTransactions', () => {
  const mockTx = [
    { id: 'tx-1', profile_id: 'user-1', points: 150, balance_after: 150, type: 'order_earn', description: 'Earned 150 pts', created_at: '2024-01-01T00:00:00Z', order_id: 'ord-1' },
    { id: 'tx-2', profile_id: 'user-1', points: 1000, balance_after: 1150, type: 'referral_reward', description: 'Referral bonus', created_at: '2024-01-02T00:00:00Z', order_id: null },
  ]

  it('returns transactions in reverse-chronological order', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain(mockTx) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getLoyaltyTransactions('user-1')
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('order_earn')
  })

  it('returns empty array when no transactions', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain([]) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getLoyaltyTransactions('user-1')
    expect(result).toHaveLength(0)
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain(null, new Error('DB error')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(getLoyaltyTransactions('user-1')).rejects.toThrow('DB error')
  })
})

// ── getReferrals ──────────────────────────────────────────────────────────────

describe('getReferrals', () => {
  const mockReferrals = [
    { id: 'ref-1', referrer_id: 'user-1', referee_id: 'user-2', status: 'rewarded', reward_points: 1000, rewarded_at: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
    { id: 'ref-2', referrer_id: 'user-1', referee_id: 'user-3', status: 'pending', reward_points: 1000, rewarded_at: null, created_at: '2024-01-02T00:00:00Z' },
  ]

  it('returns all referrals for a referrer', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain(mockReferrals) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getReferrals('user-1')
    expect(result).toHaveLength(2)
  })

  it('returns empty array when no referrals', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain([]) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getReferrals('user-1')
    expect(result).toHaveLength(0)
  })
})

// ── getReferralStats ──────────────────────────────────────────────────────────

describe('getReferralStats', () => {
  it('computes stats correctly', async () => {
    const mockReferrals = [
      { id: 'ref-1', referrer_id: 'u1', referee_id: 'u2', status: 'rewarded', reward_points: 1000, rewarded_at: '2024-01-01T00:00:00Z', created_at: '2024-01-01T00:00:00Z' },
      { id: 'ref-2', referrer_id: 'u1', referee_id: 'u3', status: 'pending', reward_points: 1000, rewarded_at: null, created_at: '2024-01-02T00:00:00Z' },
    ]
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain(mockReferrals) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getReferralStats('u1')
    expect(result.total).toBe(2)
    expect(result.rewarded).toBe(1)
    expect(result.pendingPoints).toBe(1000)
  })

  it('returns zeroes when no referrals', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain([]) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getReferralStats('u1')
    expect(result.total).toBe(0)
    expect(result.rewarded).toBe(0)
    expect(result.pendingPoints).toBe(0)
  })
})
