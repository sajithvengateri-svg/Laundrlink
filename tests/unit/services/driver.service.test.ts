import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  getDriverProfile,
  setDriverAvailability,
  updateDriverLocation,
  getActiveDispatchJob,
  getDriverRuns,
  getDriverMetrics,
  updateDispatchJobStatus,
  acceptNativeJob,
  dispatchOrder,
} from '@/services/driver.service'

const SUPABASE_URL = 'https://eozguawwmpkaouzantie.supabase.co'

const mockDriver = {
  id: 'driver-1',
  is_available: true,
  is_verified: true,
  is_active: true,
  rating_avg: 4.8,
  total_runs: 42,
  vehicle_type: 'car',
  stripe_connect_id: null,
  stripe_onboarding_complete: false,
  police_check_status: null,
  location: null,
  abn: null,
  licence_photo_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockJob = {
  id: 'job-1',
  order_id: 'ord-1',
  provider: 'native' as const,
  driver_id: 'driver-1',
  status: 'accepted',
  pickup_address: null,
  dropoff_address: null,
  external_job_id: null,
  estimated_eta: null,
  cost_cents: 1500,
  completed_at: null,
  created_at: '2024-01-01T00:00:00Z',
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
    limit: vi.fn().mockReturnThis(),
  }
}

function makeUpdateChain(error: Error | null = null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockJob, error }),
    // Makes chain directly awaitable: `await supabase.from(...).update(...).eq(...)` → { error }
    then: (resolve: (v: { error: Error | null }) => void) => resolve({ error }),
  }
  chain.update.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
})

// ── getDriverProfile ──────────────────────────────────────────────────────────

describe('getDriverProfile', () => {
  it('returns driver profile when found', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain({ data: mockDriver, error: null }) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getDriverProfile('driver-1')
    expect(result?.id).toBe('driver-1')
    expect(result?.rating_avg).toBe(4.8)
  })

  it('returns null when driver not found', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain({ data: null, error: null }) as unknown as ReturnType<typeof supabase.from>
    )
    const result = await getDriverProfile('unknown')
    expect(result).toBeNull()
  })

  it('throws on database error', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeSelectChain({ data: null, error: new Error('DB error') }) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(getDriverProfile('driver-1')).rejects.toThrow('DB error')
  })
})

// ── setDriverAvailability ─────────────────────────────────────────────────────

describe('setDriverAvailability', () => {
  it('sets driver available without throwing', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await expect(setDriverAvailability('driver-1', true)).resolves.toBeUndefined()
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith({ is_available: true })
  })

  it('sets driver offline without throwing', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await expect(setDriverAvailability('driver-1', false)).resolves.toBeUndefined()
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith({ is_available: false })
  })

  it('throws when update fails', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain(new Error('Update failed')) as unknown as ReturnType<typeof supabase.from>
    )
    await expect(setDriverAvailability('driver-1', true)).rejects.toThrow('Update failed')
  })
})

// ── updateDriverLocation ──────────────────────────────────────────────────────

describe('updateDriverLocation', () => {
  it('sends EWKT point format with longitude first', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await updateDriverLocation('driver-1', -33.8688, 151.2093)
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'SRID=4326;POINT(151.2093 -33.8688)' })
    )
  })
})

// ── updateDispatchJobStatus ───────────────────────────────────────────────────

describe('updateDispatchJobStatus', () => {
  it('returns updated job', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    const result = await updateDispatchJobStatus('job-1', 'en_route_to_customer')
    expect(result.id).toBe('job-1')
  })

  it('sets completed_at when status is delivered', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await updateDispatchJobStatus('job-1', 'delivered')
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'delivered', completed_at: expect.any(String) })
    )
  })

  it('does not set completed_at for non-final statuses', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    await updateDispatchJobStatus('job-1', 'en_route_to_pickup')
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith(
      expect.not.objectContaining({ completed_at: expect.any(String) })
    )
  })
})

// ── acceptNativeJob ───────────────────────────────────────────────────────────

describe('acceptNativeJob', () => {
  it('assigns driver and sets status to accepted', async () => {
    vi.mocked(supabase.from).mockReturnValueOnce(
      makeUpdateChain() as unknown as ReturnType<typeof supabase.from>
    )
    const result = await acceptNativeJob('job-1', 'driver-1')
    expect(result.id).toBe('job-1')
    const chain = vi.mocked(supabase.from).mock.results[0]?.value as ReturnType<typeof makeUpdateChain>
    expect(chain.update).toHaveBeenCalledWith({ driver_id: 'driver-1', status: 'accepted' })
  })
})

// ── getActiveDispatchJob ──────────────────────────────────────────────────────

describe('getActiveDispatchJob', () => {
  it('returns active job when one exists', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockJob, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(chain as unknown as ReturnType<typeof supabase.from>)
    const result = await getActiveDispatchJob('driver-1')
    expect(result?.id).toBe('job-1')
    expect(chain.in).toHaveBeenCalledWith(
      'status',
      ['accepted', 'en_route_to_pickup', 'picked_up', 'en_route_to_customer']
    )
  })

  it('returns null when no active job', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(chain as unknown as ReturnType<typeof supabase.from>)
    const result = await getActiveDispatchJob('driver-1')
    expect(result).toBeNull()
  })
})

// ── getDriverMetrics ──────────────────────────────────────────────────────────

describe('getDriverMetrics', () => {
  it('returns zero metrics when no runs', async () => {
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
      single: vi.fn().mockResolvedValue({ data: { rating_avg: 4.5, total_runs: 10 }, error: null }),
    }
    vi.mocked(supabase.from)
      .mockReturnValueOnce(todayChain as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(weekChain as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(profileChain as unknown as ReturnType<typeof supabase.from>)

    const result = await getDriverMetrics('driver-1')
    expect(result.runsToday).toBe(0)
    expect(result.earningsToday).toBe(0)
    expect(result.ratingAvg).toBe(4.5)
    expect(result.totalRuns).toBe(10)
  })

  it('sums earnings correctly across runs', async () => {
    const jobs = [
      { id: 'j1', cost_cents: 1500 },
      { id: 'j2', cost_cents: 2000 },
    ]
    const todayChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: jobs, error: null }) }
    const weekChain  = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockResolvedValue({ data: jobs, error: null }) }
    const profileChain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { rating_avg: 5, total_runs: 20 }, error: null }) }

    vi.mocked(supabase.from)
      .mockReturnValueOnce(todayChain as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(weekChain as unknown as ReturnType<typeof supabase.from>)
      .mockReturnValueOnce(profileChain as unknown as ReturnType<typeof supabase.from>)

    const result = await getDriverMetrics('driver-1')
    expect(result.runsToday).toBe(2)
    expect(result.earningsToday).toBe(3500)
    expect(result.earningsThisWeek).toBe(3500)
  })
})

// ── dispatchOrder (edge function) ─────────────────────────────────────────────

describe('dispatchOrder', () => {
  it('returns dispatch result on success', async () => {
    const capture: { body: Record<string, unknown> } = { body: {} }
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/dispatch-driver`, async ({ request }) => {
        capture.body = await request.json() as Record<string, unknown>
        return HttpResponse.json({
          dispatch_provider: 'native',
          dispatch_job_id: 'job-99',
          driver_id: 'driver-1',
          external_job_id: null,
          estimated_eta: null,
        })
      })
    )

    const result = await dispatchOrder({
      orderId: 'ord-1',
      pickupLat: -33.8688,
      pickupLng: 151.2093,
      dropoffLat: -33.9000,
      dropoffLng: 151.1800,
    })

    expect(result.dispatch_provider).toBe('native')
    expect(result.dispatch_job_id).toBe('job-99')
    expect(capture.body.order_id).toBe('ord-1')
    expect(capture.body.pickup_lat).toBe(-33.8688)
  })

  it('throws when edge function returns an error', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/dispatch-driver`, () =>
        HttpResponse.json({ error: 'No available drivers' }, { status: 503 })
      )
    )
    await expect(
      dispatchOrder({ orderId: 'ord-1', pickupLat: 0, pickupLng: 0, dropoffLat: 0, dropoffLng: 0 })
    ).rejects.toThrow('No available drivers')
  })
})

// ── getDriverRuns ─────────────────────────────────────────────────────────────

describe('getDriverRuns', () => {
  it('returns completed runs', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: [mockJob], error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(chain as unknown as ReturnType<typeof supabase.from>)
    const result = await getDriverRuns('driver-1', '2024-01-01')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('job-1')
  })

  it('returns empty array when no runs', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValueOnce(chain as unknown as ReturnType<typeof supabase.from>)
    const result = await getDriverRuns('driver-1')
    expect(result).toEqual([])
  })
})
