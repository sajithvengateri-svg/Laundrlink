import { supabase } from '@/lib/supabase'
import type {
  AdminKpis,
  AdminUser,
  PendingVerification,
  PricingConfig,
  PricingConfigUpdate,
  AdminAnalytics,
  AdminOrderRow,
} from '@/types/admin.types'

// ── KPIs ─────────────────────────────────────────────────────────────────────

export async function getAdminKpis(): Promise<AdminKpis> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [customers, hubs, pros, drivers, ordersToday, ledgerToday, ledgerMonth] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'hub'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'pro'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'driver'),
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('payment_ledger')
        .select('amount_cents')
        .eq('type', 'charge')
        .gte('created_at', todayStart.toISOString()),
      supabase
        .from('payment_ledger')
        .select('amount_cents, type')
        .in('type', ['charge', 'platform_fee'])
        .gte('created_at', monthStart.toISOString()),
    ])

  const gmvToday = (ledgerToday.data ?? []).reduce((s, r) => s + r.amount_cents, 0)
  const gmvThisMonth = (ledgerMonth.data ?? [])
    .filter((r) => r.type === 'charge')
    .reduce((s, r) => s + r.amount_cents, 0)
  const platformRevenueThisMonth = (ledgerMonth.data ?? [])
    .filter((r) => r.type === 'platform_fee')
    .reduce((s, r) => s + r.amount_cents, 0)

  return {
    totalCustomers: customers.count ?? 0,
    totalHubs: hubs.count ?? 0,
    totalPros: pros.count ?? 0,
    totalDrivers: drivers.count ?? 0,
    ordersToday: ordersToday.count ?? 0,
    gmvToday,
    gmvThisMonth,
    platformRevenueThisMonth,
  }
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getAdminUsers(
  role: string,
  search = ''
): Promise<AdminUser[]> {
  let query = supabase
    .from('profiles')
    .select('id, full_name, phone, role, is_active, created_at, stripe_customer_id')
    .eq('role', role as 'customer' | 'hub' | 'pro' | 'driver' | 'admin')
    .order('created_at', { ascending: false })

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as AdminUser[]
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) throw error
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function getAdminOrders(
  statusFilter = '',
  search = ''
): Promise<AdminOrderRow[]> {
  let query = supabase
    .from('orders')
    .select(
      `
      id, order_number, status, created_at, total_cents, platform_fee_cents, is_ndis,
      customer:profiles!orders_customer_id_fkey ( full_name ),
      hub:hubs!orders_hub_id_fkey ( business_name )
    `
    )
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter) {
    query = query.eq('status', statusFilter as 'pending' | 'pickup_scheduled' | 'picked_up_by_driver' | 'at_hub' | 'assigned_to_pro' | 'with_pro' | 'returned_to_hub' | 'out_for_delivery' | 'delivered' | 'cancelled')
  }
  if (search) {
    query = query.ilike('order_number', `%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    order_number: row.order_number,
    status: row.status,
    created_at: row.created_at,
    total_cents: row.total_cents,
    platform_fee_cents: row.platform_fee_cents,
    is_ndis: row.is_ndis,
    customer_name: (row.customer as { full_name?: string } | null)?.full_name ?? null,
    hub_name: (row.hub as { business_name?: string } | null)?.business_name ?? null,
  }))
}

export async function getOrderScanChain(orderId: string) {
  const { data, error } = await supabase
    .from('handoffs')
    .select('id, step, photo_urls, created_at, scanned_by')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function issueAdminRefund(orderId: string): Promise<void> {
  // Mark order as refund-requested; actual Stripe refund handled server-side
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled' })
    .eq('id', orderId)
  if (error) throw error
}

// ── Verification queue ────────────────────────────────────────────────────────

export async function getPendingVerifications(): Promise<PendingVerification[]> {
  const [hubs, pros, drivers] = await Promise.all([
    supabase
      .from('hubs')
      .select('id, owner_id, business_name, phone, created_at, is_verified')
      .eq('is_verified', false),
    supabase
      .from('pros')
      .select('id, police_check_status, is_active, created_at')
      .eq('police_check_status', 'clear')
      .eq('is_active', false),
    supabase
      .from('drivers')
      .select('id, police_check_status, is_verified, is_active, created_at')
      .eq('is_verified', false),
  ])

  const results: PendingVerification[] = []

  for (const hub of hubs.data ?? []) {
    results.push({
      type: 'hub',
      entityId: hub.id,
      profileId: hub.owner_id,
      name: hub.business_name,
      phone: hub.phone,
      createdAt: hub.created_at,
      reason: 'Hub not yet verified',
    })
  }

  for (const pro of pros.data ?? []) {
    results.push({
      type: 'pro',
      entityId: pro.id,
      profileId: pro.id,
      name: 'Laundry Pro',
      phone: null,
      createdAt: pro.created_at,
      policeCheckStatus: pro.police_check_status,
      reason: 'Police check clear — awaiting activation',
    })
  }

  for (const driver of drivers.data ?? []) {
    results.push({
      type: 'driver',
      entityId: driver.id,
      profileId: driver.id,
      name: 'Driver',
      phone: null,
      createdAt: driver.created_at,
      policeCheckStatus: driver.police_check_status,
      reason: 'Driver not yet verified',
    })
  }

  return results
}

export async function approveEntity(
  type: 'hub' | 'pro' | 'driver',
  entityId: string
): Promise<void> {
  const table = type === 'hub' ? 'hubs' : type === 'pro' ? 'pros' : 'drivers'
  const update =
    type === 'hub'
      ? { is_verified: true, is_active: true }
      : { is_verified: true, is_active: true }

  const { error } = await supabase.from(table).update(update).eq('id', entityId)
  if (error) throw error
}

export async function rejectEntity(
  type: 'hub' | 'pro' | 'driver',
  entityId: string
): Promise<void> {
  const table = type === 'hub' ? 'hubs' : type === 'pro' ? 'pros' : 'drivers'
  const { error } = await supabase.from(table).update({ is_active: false }).eq('id', entityId)
  if (error) throw error
}

// ── Pricing config ────────────────────────────────────────────────────────────

export async function getPricingConfig(): Promise<PricingConfig | null> {
  const { data, error } = await supabase
    .from('pricing_config')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function updatePricingConfig(
  id: string,
  updates: PricingConfigUpdate
): Promise<PricingConfig> {
  const { data, error } = await supabase
    .from('pricing_config')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const since = new Date()
  since.setDate(since.getDate() - 29)
  since.setHours(0, 0, 0, 0)

  const [ledger, orders] = await Promise.all([
    supabase
      .from('payment_ledger')
      .select('amount_cents, type, created_at')
      .in('type', ['charge', 'platform_fee'])
      .gte('created_at', since.toISOString()),
    supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', since.toISOString()),
  ])

  const gmvMap: Record<string, number> = {}
  const revMap: Record<string, number> = {}
  const ordersMap: Record<string, number> = {}

  for (const row of ledger.data ?? []) {
    const date = row.created_at!.slice(0, 10)
    if (row.type === 'charge') gmvMap[date] = (gmvMap[date] ?? 0) + row.amount_cents
    if (row.type === 'platform_fee') revMap[date] = (revMap[date] ?? 0) + row.amount_cents
  }

  for (const row of orders.data ?? []) {
    const date = row.created_at!.slice(0, 10)
    ordersMap[date] = (ordersMap[date] ?? 0) + 1
  }

  // Build sorted 30-day arrays
  const days: string[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }

  return {
    gmvByDay: days.map((date) => ({ date, value: gmvMap[date] ?? 0 })),
    ordersByDay: days.map((date) => ({ date, value: ordersMap[date] ?? 0 })),
    revenueByDay: days.map((date) => ({ date, value: revMap[date] ?? 0 })),
  }
}
