import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  getAdminKpis,
  getAdminUsers,
  setUserActive,
  getAdminOrders,
  getOrderScanChain,
  getPendingVerifications,
  approveEntity,
  rejectEntity,
  getPricingConfig,
  updatePricingConfig,
} from '@/services/admin.service'

// ── Chain factories ──────────────────────────────────────────────────────────

function makeCountChain(count: number, error: Error | null = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error }),
    single: vi.fn().mockResolvedValue({ data: null, error }),
    // Make the chain itself awaitable (for .select('id', { count: 'exact', head: true }) pattern)
    then: (resolve: (v: { count: number; data: null; error: Error | null }) => void) =>
      resolve({ count, data: null, error }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.ilike = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

function makeDataChain(data: unknown[], error: Error | null = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: data[0] ?? null, error }),
    single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error }),
    then: (resolve: (v: { data: unknown[]; error: Error | null }) => void) =>
      resolve({ data, error }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.ilike = vi.fn().mockReturnValue(chain)
  chain.or = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

function makeUpdateChain(data: unknown = null, error: Error | null = null) {
  const chain: Record<string, unknown> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    then: (resolve: (v: { data: unknown; error: Error | null }) => void) =>
      resolve({ data, error }),
  }
  chain.update = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.select = vi.fn().mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getAdminKpis ──────────────────────────────────────────────────────────────

describe('getAdminKpis', () => {
  it('returns zeroed KPIs when all queries return empty', async () => {
    // getAdminKpis calls Promise.all with 7 supabase.from calls
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeCountChain(10) as unknown as ReturnType<typeof supabase.from>) // customers
      .mockReturnValueOnce(makeCountChain(3) as unknown as ReturnType<typeof supabase.from>)  // hubs
      .mockReturnValueOnce(makeCountChain(5) as unknown as ReturnType<typeof supabase.from>)  // pros
      .mockReturnValueOnce(makeCountChain(2) as unknown as ReturnType<typeof supabase.from>)  // drivers
      .mockReturnValueOnce(makeCountChain(4) as unknown as ReturnType<typeof supabase.from>)  // ordersToday
      .mockReturnValueOnce(makeDataChain([{ amount_cents: 5000 }]) as unknown as ReturnType<typeof supabase.from>) // ledgerToday
      .mockReturnValueOnce(
        makeDataChain([
          { amount_cents: 20000, type: 'charge' },
          { amount_cents: 6000, type: 'platform_fee' },
        ]) as unknown as ReturnType<typeof supabase.from>
      ) // ledgerMonth

    const result = await getAdminKpis()
    expect(result.totalCustomers).toBe(10)
    expect(result.totalHubs).toBe(3)
    expect(result.totalPros).toBe(5)
    expect(result.totalDrivers).toBe(2)
    expect(result.ordersToday).toBe(4)
    expect(result.gmvToday).toBe(5000)
    expect(result.gmvThisMonth).toBe(20000)
    expect(result.platformRevenueThisMonth).toBe(6000)
  })
})

// ── getAdminUsers ──────────────────────────────────────────────────────────────

describe('getAdminUsers', () => {
  const mockUsers = [
    { id: 'u1', full_name: 'Alice', phone: '0400000001', role: 'customer', is_active: true, created_at: '2024-01-01T00:00:00Z', stripe_customer_id: null },
  ]

  it('returns users for the given role', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeDataChain(mockUsers) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getAdminUsers('customer')
    expect(result).toHaveLength(1)
    expect(result[0].full_name).toBe('Alice')
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeDataChain([], new Error('DB error')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(getAdminUsers('customer')).rejects.toThrow('DB error')
  })
})

// ── setUserActive ─────────────────────────────────────────────────────────────

describe('setUserActive', () => {
  it('updates is_active without error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await expect(setUserActive('u1', false)).resolves.toBeUndefined()
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain(null, new Error('Update failed')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(setUserActive('u1', false)).rejects.toThrow('Update failed')
  })
})

// ── getAdminOrders ────────────────────────────────────────────────────────────

describe('getAdminOrders', () => {
  const mockRaw = [
    {
      id: 'ord-1',
      order_number: 'LL-2024-00001',
      status: 'delivered',
      created_at: '2024-01-01T00:00:00Z',
      total_cents: 4500,
      platform_fee_cents: 1350,
      is_ndis: false,
      customer: { full_name: 'Alice' },
      hub: { business_name: 'City Hub' },
    },
  ]

  it('maps raw rows to AdminOrderRow shape', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeDataChain(mockRaw) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getAdminOrders()
    expect(result).toHaveLength(1)
    expect(result[0].order_number).toBe('LL-2024-00001')
    expect(result[0].customer_name).toBe('Alice')
    expect(result[0].hub_name).toBe('City Hub')
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeDataChain([], new Error('DB error')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(getAdminOrders()).rejects.toThrow('DB error')
  })
})

// ── getOrderScanChain ─────────────────────────────────────────────────────────

describe('getOrderScanChain', () => {
  it('returns handoff steps for an order', async () => {
    const steps = [
      { id: 'h1', step: 'customer_to_driver', photo_urls: [], created_at: '2024-01-01T01:00:00Z', scanned_by: 'd1' },
    ]
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeDataChain(steps) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getOrderScanChain('ord-1')
    expect(result).toHaveLength(1)
    expect(result[0].step).toBe('customer_to_driver')
  })
})

// ── getPendingVerifications ───────────────────────────────────────────────────

describe('getPendingVerifications', () => {
  it('combines pending hubs, pros, and drivers', async () => {
    const mockHub = { id: 'hub-1', owner_id: 'owner-1', business_name: 'New Hub', phone: '0400000001', created_at: '2024-01-01T00:00:00Z', is_verified: false }
    const mockPro = { id: 'pro-1', police_check_status: 'clear', is_active: false, created_at: '2024-01-01T00:00:00Z' }
    const mockDriver = { id: 'drv-1', police_check_status: 'pending', is_verified: false, is_active: false, created_at: '2024-01-01T00:00:00Z' }

    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeDataChain([mockHub]) as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(makeDataChain([mockPro]) as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(makeDataChain([mockDriver]) as unknown as ReturnType<typeof supabase.from>)

    const result = await getPendingVerifications()
    expect(result).toHaveLength(3)
    expect(result.find((r) => r.type === 'hub')?.name).toBe('New Hub')
    expect(result.find((r) => r.type === 'pro')?.entityId).toBe('pro-1')
    expect(result.find((r) => r.type === 'driver')?.entityId).toBe('drv-1')
  })

  it('returns empty array when no pending items', async () => {
    vi.mocked(supabase.from)
      .mockReturnValueOnce(makeDataChain([]) as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(makeDataChain([]) as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(makeDataChain([]) as unknown as ReturnType<typeof supabase.from>)

    const result = await getPendingVerifications()
    expect(result).toHaveLength(0)
  })
})

// ── approveEntity + rejectEntity ──────────────────────────────────────────────

describe('approveEntity', () => {
  it('updates hub is_verified and is_active', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await expect(approveEntity('hub', 'hub-1')).resolves.toBeUndefined()
  })

  it('throws on error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain(null, new Error('Update failed')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(approveEntity('pro', 'pro-1')).rejects.toThrow('Update failed')
  })
})

describe('rejectEntity', () => {
  it('sets is_active to false', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await expect(rejectEntity('driver', 'drv-1')).resolves.toBeUndefined()
  })
})

// ── getPricingConfig ──────────────────────────────────────────────────────────

describe('getPricingConfig', () => {
  it('returns the config row', async () => {
    const config = { id: 'cfg-1', individual_bag_cents: 1500, hub_share_percent: 70 }
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeDataChain([config]) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getPricingConfig()
    expect(result?.id).toBe('cfg-1')
  })

  it('returns null when no config exists', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeDataChain([]) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getPricingConfig()
    expect(result).toBeNull()
  })
})

// ── updatePricingConfig ───────────────────────────────────────────────────────

describe('updatePricingConfig', () => {
  it('returns updated config', async () => {
    const updated = { id: 'cfg-1', individual_bag_cents: 1800 }
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain(updated) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await updatePricingConfig('cfg-1', { individual_bag_cents: 1800 })
    expect(result.id).toBe('cfg-1')
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain(null, new Error('Update failed')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(
      updatePricingConfig('cfg-1', { individual_bag_cents: 1800 })
    ).rejects.toThrow('Update failed')
  })
})
