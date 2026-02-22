import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CustomerStats {
  totalSpent: number
  totalOrders: number
  deliveredOrders: number
  cancelledOrders: number
  avgOrderValue: number
  favouriteHub: string | null
}

export interface MonthlySpend {
  month: string   // "Jan '26"
  total: number   // cents
}

export interface DailyOrderCount {
  date: string    // "Feb 1"
  count: number
}

export interface WeeklyMetric {
  week: string    // "Feb 10"
  value: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function dayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-AU', {
    month: 'short',
    day: 'numeric',
  })
}

/** Start of ISO week (Monday) for a given date. */
function weekStart(d: Date): Date {
  const clone = new Date(d)
  const dow = (clone.getDay() + 6) % 7   // Mon = 0
  clone.setDate(clone.getDate() - dow)
  clone.setHours(0, 0, 0, 0)
  return clone
}

// ── Customer Analytics ────────────────────────────────────────────────────────

export async function getCustomerStats(customerId: string): Promise<CustomerStats> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('status, total_cents, hub:hubs(business_name)')
    .eq('customer_id', customerId)
    .in('status', ['delivered', 'cancelled'])

  if (error) throw error

  const rows = orders ?? []
  const delivered = rows.filter((o) => o.status === 'delivered')
  const cancelled = rows.filter((o) => o.status === 'cancelled')
  const totalSpent = delivered.reduce((acc, o) => acc + (o.total_cents ?? 0), 0)

  // Favourite hub = most frequent hub in delivered orders
  const hubCounts: Record<string, number> = {}
  let favouriteHub: string | null = null
  for (const o of delivered) {
    const name = (o.hub as { business_name?: string } | null)?.business_name
    if (name) hubCounts[name] = (hubCounts[name] ?? 0) + 1
  }
  const topHub = Object.entries(hubCounts).sort((a, b) => b[1] - a[1])[0]
  if (topHub) favouriteHub = topHub[0]

  return {
    totalSpent,
    totalOrders: rows.length,
    deliveredOrders: delivered.length,
    cancelledOrders: cancelled.length,
    avgOrderValue: delivered.length > 0 ? Math.round(totalSpent / delivered.length) : 0,
    favouriteHub,
  }
}

export async function getCustomerMonthlySpending(
  customerId: string,
  months = 6
): Promise<MonthlySpend[]> {
  const since = new Date()
  since.setMonth(since.getMonth() - months + 1)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('orders')
    .select('total_cents, created_at')
    .eq('customer_id', customerId)
    .eq('status', 'delivered')
    .gte('created_at', since.toISOString())

  if (error) throw error

  // Pre-fill buckets oldest → newest
  const buckets = new Map<string, number>()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    buckets.set(monthKey(d), 0)
  }

  for (const o of data ?? []) {
    const key = monthKey(new Date(o.created_at!))
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + (o.total_cents ?? 0))
    }
  }

  return Array.from(buckets.entries()).map(([key, total]) => {
    const [year, month] = key.split('-').map(Number)
    return { month: monthLabel(new Date(year, month - 1, 1)), total }
  })
}

// ── Hub Analytics ─────────────────────────────────────────────────────────────

export async function getHubDailyOrders(
  hubId: string,
  days = 14
): Promise<DailyOrderCount[]> {
  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .eq('hub_id', hubId)
    .gte('created_at', since.toISOString())

  if (error) throw error

  // Pre-fill day buckets
  const buckets = new Map<string, number>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    buckets.set(dayKey(d), 0)
  }

  for (const o of data ?? []) {
    const key = o.created_at!.slice(0, 10)
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
  }

  return Array.from(buckets.entries()).map(([key, count]) => ({
    date: dayLabel(key),
    count,
  }))
}

export async function getHubWeeklyRevenue(
  hubProfileId: string,
  weeks = 8
): Promise<WeeklyMetric[]> {
  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('payment_ledger')
    .select('amount_cents, created_at')
    .eq('profile_id', hubProfileId)
    .eq('type', 'payout_hub')
    .gte('created_at', since.toISOString())

  if (error) throw error

  // Build week buckets (keyed by Monday ISO date)
  const buckets = new Map<string, number>()
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    buckets.set(dayKey(weekStart(d)), 0)
  }

  for (const p of data ?? []) {
    const key = dayKey(weekStart(new Date(p.created_at!)))
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + (p.amount_cents ?? 0))
    }
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    week: dayLabel(key),
    value,
  }))
}

// ── Pro Analytics ─────────────────────────────────────────────────────────────

export async function getProWeeklyJobs(
  proId: string,
  weeks = 8
): Promise<WeeklyMetric[]> {
  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('orders')
    .select('created_at')
    .eq('pro_id', proId)
    .in('status', ['returned_to_hub', 'out_for_delivery', 'delivered'])
    .gte('created_at', since.toISOString())

  if (error) throw error

  // Build week buckets
  const buckets = new Map<string, number>()
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    buckets.set(dayKey(weekStart(d)), 0)
  }

  for (const o of data ?? []) {
    const key = dayKey(weekStart(new Date(o.created_at!)))
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    week: dayLabel(key),
    value,
  }))
}

export async function getProWeeklyEarnings(
  proProfileId: string,
  weeks = 8
): Promise<WeeklyMetric[]> {
  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('payment_ledger')
    .select('amount_cents, created_at')
    .eq('profile_id', proProfileId)
    .eq('type', 'payout_pro')
    .gte('created_at', since.toISOString())

  if (error) throw error

  const buckets = new Map<string, number>()
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    buckets.set(dayKey(weekStart(d)), 0)
  }

  for (const p of data ?? []) {
    const key = dayKey(weekStart(new Date(p.created_at!)))
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + (p.amount_cents ?? 0))
    }
  }

  return Array.from(buckets.entries()).map(([key, value]) => ({
    week: dayLabel(key),
    value,
  }))
}
