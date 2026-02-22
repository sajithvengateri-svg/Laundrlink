import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'
import {
  createOrder,
  cancelOrder,
  getOrderById,
  getCustomerOrders,
  updateOrderStatus,
} from '@/services/order.service'

const mockOrder = {
  id: 'ord-1',
  order_number: 'LL-2024-00001',
  customer_id: 'cust-1',
  hub_id: null,
  status: 'pending',
  service_type: 'wash_fold',
  pickup_address: {},
  delivery_address: {},
  pickup_scheduled_at: '2024-02-01T10:00:00Z',
  delivery_scheduled_at: '2024-02-03T10:00:00Z',
  subtotal_cents: 3000,
  total_cents: 3000,
  platform_fee_cents: 900,
  hub_payout_cents: 2100,
  is_ndis: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const mockCreateParams = {
  customerId: 'cust-1',
  pickupAddress: { street: '1 Main St', suburb: 'Sydney', state: 'NSW', postcode: '2000', country: 'AU', lat: -33.8688, lng: 151.2093 },
  deliveryAddress: { street: '1 Main St', suburb: 'Sydney', state: 'NSW', postcode: '2000', country: 'AU' },
  serviceType: 'wash_fold' as const,
  items: [
    { description: 'Shirts', quantity: 3, price_cents: 500 },
    { description: 'Pants', quantity: 2, price_cents: 750 },
  ],
  pickupDate: '2024-02-01',
  deliveryDate: '2024-02-03',
}

function makeFromChain(results: unknown[]) {
  let callIndex = 0
  const make = () => {
    const result = results[callIndex++] ?? results[results.length - 1]
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
      single: vi.fn().mockResolvedValue(result),
    }
  }
  return make
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createOrder', () => {
  it('creates order and inserts items, returns order', async () => {
    const countResult = { count: 0, data: null, error: null }
    const orderResult = { data: mockOrder, error: null }
    const itemsResult = { data: [], error: null }

    const chains = [
      // generateOrderNumber: select count
      {
        select: vi.fn().mockResolvedValue(countResult),
        from: vi.fn().mockReturnThis(),
      },
      // insert order → select → single
      {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(orderResult),
      },
      // insert order_items
      {
        insert: vi.fn().mockResolvedValue(itemsResult),
      },
    ]

    let callIdx = 0
    vi.mocked(supabase.from).mockImplementation(() => chains[callIdx++] as unknown as ReturnType<typeof supabase.from>)

    const order = await createOrder(mockCreateParams)
    expect(order.order_number).toBe('LL-2024-00001')
    expect(order.customer_id).toBe('cust-1')
  })

  it('calculates 30% platform fee correctly', async () => {
    // items total: 3×500 + 2×750 = 1500 + 1500 = 3000 cents
    // platform fee: 900 cents (30%), hub payout: 2100 cents (70%)
    const capturedInsert = { data: null as unknown }

    const chains = [
      { select: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }) },
      {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockImplementation((data: unknown) => {
          capturedInsert.data = data
          return { select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }) }
        }),
      },
      { insert: vi.fn().mockResolvedValue({ data: [], error: null }) },
    ]

    let callIdx = 0
    vi.mocked(supabase.from).mockImplementation(() => chains[callIdx++] as unknown as ReturnType<typeof supabase.from>)

    await createOrder(mockCreateParams)

    const orderData = capturedInsert.data as { platform_fee_cents: number; hub_payout_cents: number; total_cents: number }
    expect(orderData.total_cents).toBe(3000)
    expect(orderData.platform_fee_cents).toBe(900)
    expect(orderData.hub_payout_cents).toBe(2100)
  })

  it('throws when order insert fails', async () => {
    const chains = [
      { select: vi.fn().mockResolvedValue({ count: 0, data: null, error: null }) },
      {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert failed') }),
      },
    ]

    let callIdx = 0
    vi.mocked(supabase.from).mockImplementation(() => chains[callIdx++] as unknown as ReturnType<typeof supabase.from>)

    await expect(createOrder(mockCreateParams)).rejects.toThrow('Insert failed')
  })
})

describe('cancelOrder', () => {
  it('cancels an order with status pending', async () => {
    const chains = [
      {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'pending' }, error: null }),
      },
      {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      },
    ]

    let callIdx = 0
    vi.mocked(supabase.from).mockImplementation(() => chains[callIdx++] as unknown as ReturnType<typeof supabase.from>)

    await expect(cancelOrder('ord-1')).resolves.toBeUndefined()
  })

  it('cancels an order with status pickup_scheduled', async () => {
    const chains = [
      {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { status: 'pickup_scheduled' }, error: null }),
      },
      {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      },
    ]

    let callIdx = 0
    vi.mocked(supabase.from).mockImplementation(() => chains[callIdx++] as unknown as ReturnType<typeof supabase.from>)

    await expect(cancelOrder('ord-1')).resolves.toBeUndefined()
  })

  it('throws when order is already at_hub (not cancellable)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { status: 'at_hub' }, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(cancelOrder('ord-1')).rejects.toThrow('Order cannot be cancelled at this stage.')
  })

  it('throws when order is delivered (not cancellable)', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { status: 'delivered' }, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(cancelOrder('ord-1')).rejects.toThrow('Order cannot be cancelled at this stage.')
  })

  it('throws when order not found', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(cancelOrder('ord-missing')).rejects.toThrow('Order cannot be cancelled at this stage.')
  })
})

describe('getOrderById', () => {
  it('returns null for unknown order', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await getOrderById('missing-id')
    expect(result).toBeNull()
  })

  it('returns order with joined details', async () => {
    const orderWithDetails = { ...mockOrder, customer: { id: 'cust-1', full_name: 'Alice', phone: '+61400000000', avatar_url: null }, items: [] }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: orderWithDetails, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await getOrderById('ord-1')
    expect(result?.id).toBe('ord-1')
    expect(result?.customer?.full_name).toBe('Alice')
  })
})

describe('getCustomerOrders', () => {
  it('returns empty array when customer has no orders', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await getCustomerOrders('cust-1')
    expect(result).toEqual([])
  })

  it('returns orders sorted by created_at desc', async () => {
    const orders = [mockOrder, { ...mockOrder, id: 'ord-2', order_number: 'LL-2024-00002' }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: orders, error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    const result = await getCustomerOrders('cust-1')
    expect(result).toHaveLength(2)
    expect(result[0].order_number).toBe('LL-2024-00001')
  })
})

describe('updateOrderStatus', () => {
  it('updates order status without throwing', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(updateOrderStatus('ord-1', 'at_hub')).resolves.toBeUndefined()
  })

  it('throws on database error', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: new Error('DB error') }),
    }
    vi.mocked(supabase.from).mockReturnValue(chain as unknown as ReturnType<typeof supabase.from>)

    await expect(updateOrderStatus('ord-1', 'at_hub')).rejects.toThrow('DB error')
  })
})
