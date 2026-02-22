import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/services/notification.service'

// ── Chain factories ───────────────────────────────────────────────────────────

function makeListChain(data: unknown, error: Error | null = null) {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: unknown; error: Error | null }) => void) =>
      resolve({ data, error }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

function makeCountChain(count: number, error: Error | null = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { count: number | null; error: Error | null }) => void) =>
      resolve({ count, error }),
  }
}

function makeUpdateChain(error: Error | null = null) {
  const chain: Record<string, unknown> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: (resolve: (v: { data: null; error: Error | null }) => void) =>
      resolve({ data: null, error }),
  }
  chain.eq = vi.fn().mockReturnValue(chain)
  return chain
}

const mockFrom = vi.mocked(supabase.from)

beforeEach(() => {
  vi.clearAllMocks()
})

// ── getNotifications ──────────────────────────────────────────────────────────

describe('getNotifications', () => {
  it('returns empty array when no notifications', async () => {
    mockFrom.mockReturnValue(makeListChain([]) as never)
    const result = await getNotifications('profile-1')
    expect(result).toEqual([])
  })

  it('returns notification list ordered by created_at desc', async () => {
    const notifications = [
      { id: 'n2', title: 'Invoice Ready', is_read: false, created_at: '2026-02-22T10:00:00Z' },
      { id: 'n1', title: 'Order Delivered', is_read: true, created_at: '2026-02-21T09:00:00Z' },
    ]
    mockFrom.mockReturnValue(makeListChain(notifications) as never)
    const result = await getNotifications('profile-1')
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('n2')
  })

  it('queries by profile_id', async () => {
    const chain = makeListChain([])
    mockFrom.mockReturnValue(chain as never)
    await getNotifications('profile-abc')
    expect(chain.eq).toHaveBeenCalledWith('profile_id', 'profile-abc')
  })

  it('applies limit', async () => {
    const chain = makeListChain([])
    mockFrom.mockReturnValue(chain as never)
    await getNotifications('profile-1', 10)
    expect(chain.limit).toHaveBeenCalledWith(10)
  })

  it('throws on db error', async () => {
    mockFrom.mockReturnValue(makeListChain(null, new Error('db fail')) as never)
    await expect(getNotifications('profile-1')).rejects.toThrow('db fail')
  })
})

// ── getUnreadCount ────────────────────────────────────────────────────────────

describe('getUnreadCount', () => {
  it('returns 0 when no unread notifications', async () => {
    mockFrom.mockReturnValue(makeCountChain(0) as never)
    const count = await getUnreadCount('profile-1')
    expect(count).toBe(0)
  })

  it('returns correct unread count', async () => {
    mockFrom.mockReturnValue(makeCountChain(5) as never)
    const count = await getUnreadCount('profile-1')
    expect(count).toBe(5)
  })

  it('returns 0 when count is null', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: (resolve: (v: { count: null; error: null }) => void) =>
        resolve({ count: null, error: null }),
    } as never)
    const count = await getUnreadCount('profile-1')
    expect(count).toBe(0)
  })

  it('throws on db error', async () => {
    mockFrom.mockReturnValue(makeCountChain(0, new Error('db error')) as never)
    await expect(getUnreadCount('profile-1')).rejects.toThrow('db error')
  })
})

// ── markAsRead ────────────────────────────────────────────────────────────────

describe('markAsRead', () => {
  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(makeUpdateChain() as never)
    await expect(markAsRead('notif-1')).resolves.toBeUndefined()
  })

  it('updates the correct notification id', async () => {
    const chain = makeUpdateChain()
    mockFrom.mockReturnValue(chain as never)
    await markAsRead('notif-xyz')
    expect(chain.eq).toHaveBeenCalledWith('id', 'notif-xyz')
  })

  it('throws on db error', async () => {
    mockFrom.mockReturnValue(makeUpdateChain(new Error('update failed')) as never)
    await expect(markAsRead('notif-1')).rejects.toThrow('update failed')
  })
})

// ── markAllAsRead ─────────────────────────────────────────────────────────────

describe('markAllAsRead', () => {
  it('resolves without error on success', async () => {
    mockFrom.mockReturnValue(makeUpdateChain() as never)
    await expect(markAllAsRead('profile-1')).resolves.toBeUndefined()
  })

  it('filters by profile_id and is_read = false', async () => {
    const chain = makeUpdateChain()
    mockFrom.mockReturnValue(chain as never)
    await markAllAsRead('profile-abc')
    expect(chain.eq).toHaveBeenCalledWith('profile_id', 'profile-abc')
    expect(chain.eq).toHaveBeenCalledWith('is_read', false)
  })

  it('throws on db error', async () => {
    mockFrom.mockReturnValue(makeUpdateChain(new Error('bulk update failed')) as never)
    await expect(markAllAsRead('profile-1')).rejects.toThrow('bulk update failed')
  })
})
