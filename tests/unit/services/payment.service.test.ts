import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'

// payment.service uses fetch (via callEdgeFunction) — MSW intercepts it
// supabase is only used for updateOrderPaymentIntent / getPaymentLedger
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  createPaymentIntent,
  getStripeConnectOnboardingUrl,
  updateOrderPaymentIntent,
  getPaymentLedger,
} from '@/services/payment.service'

const SUPABASE_URL = 'https://eozguawwmpkaouzantie.supabase.co'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null } } as never)
})

describe('createPaymentIntent', () => {
  it('returns full payment intent response on success', async () => {
    const result = await createPaymentIntent('ord-1', 3000, 'acct_test')
    expect(result.client_secret).toBe('pi_test_secret_123')
    expect(result.payment_intent_id).toBe('pi_test_123')
    expect(result.amount).toBe(3000)
    expect(result.hub_amount).toBe(2100)
    expect(result.platform_fee).toBe(900)
  })

  it('throws when edge function returns HTTP 400 error', async () => {
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/create-payment-intent`, () => {
        return HttpResponse.json({ error: 'Invalid order' }, { status: 400 })
      })
    )

    await expect(
      createPaymentIntent('ord-1', 3000, 'acct_test')
    ).rejects.toThrow('Invalid order')
  })

  it('includes Authorization header when session has token', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'jwt_token_abc' } },
    } as never)

    const capture = { authHeader: '' }
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/create-payment-intent`, ({ request }) => {
        capture.authHeader = request.headers.get('authorization') ?? ''
        return HttpResponse.json({
          client_secret: 'pi_secret',
          payment_intent_id: 'pi_1',
          amount: 0,
          hub_amount: 0,
          platform_fee: 0,
        })
      })
    )

    await createPaymentIntent('ord-1', 0, 'acct_test')
    expect(capture.authHeader).toBe('Bearer jwt_token_abc')
  })

  it('sends correct body fields to edge function', async () => {
    const capture: { body: Record<string, unknown> } = { body: {} }
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/create-payment-intent`, async ({ request }) => {
        capture.body = await request.json() as Record<string, unknown>
        return HttpResponse.json({
          client_secret: 'pi_secret',
          payment_intent_id: 'pi_1',
          amount: 5000,
          hub_amount: 3500,
          platform_fee: 1500,
        })
      })
    )

    await createPaymentIntent('ord-999', 5000, 'acct_hub_xyz')
    expect(capture.body.order_id).toBe('ord-999')
    expect(capture.body.amount_cents).toBe(5000)
    expect(capture.body.hub_stripe_account_id).toBe('acct_hub_xyz')
  })
})

describe('getStripeConnectOnboardingUrl', () => {
  it('returns onboarding URL object for hub', async () => {
    const result = await getStripeConnectOnboardingUrl('hub-1')
    expect(result.url).toBe('https://connect.stripe.com/test/onboarding/...')
  })

  it('sends hub_id in request body', async () => {
    const capture: { body: Record<string, unknown> } = { body: {} }
    server.use(
      http.post(`${SUPABASE_URL}/functions/v1/stripe-connect-onboard`, async ({ request }) => {
        capture.body = await request.json() as Record<string, unknown>
        return HttpResponse.json({ url: 'https://connect.stripe.com/test' })
      })
    )

    await getStripeConnectOnboardingUrl('hub-42')
    expect(capture.body.hub_id).toBe('hub-42')
  })
})

describe('updateOrderPaymentIntent', () => {
  it('updates order stripe_payment_intent_id without throwing', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(
      updateOrderPaymentIntent('ord-1', 'pi_test_123')
    ).resolves.toBeUndefined()

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ stripe_payment_intent_id: 'pi_test_123' })
    )
  })

  it('throws on database error', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(
      updateOrderPaymentIntent('ord-1', 'pi_test_123')
    ).rejects.toThrow('Update failed')
  })
})

describe('getPaymentLedger', () => {
  it('returns empty array when no ledger entries', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await getPaymentLedger('ord-1')
    expect(result).toEqual([])
  })

  it('returns ledger entries for an order', async () => {
    const entries = [
      { id: 'led-1', order_id: 'ord-1', type: 'charge', amount_cents: 3000 },
      { id: 'led-2', order_id: 'ord-1', type: 'payout_hub', amount_cents: 2100 },
    ]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: entries, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await getPaymentLedger('ord-1')
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('charge')
  })
})
