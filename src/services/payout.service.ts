import { supabase } from '@/lib/supabase'

export interface PayoutRecord {
  id: string
  order_id: string | null
  profile_id: string
  type: 'charge' | 'payout_hub' | 'payout_pro' | 'payout_driver' | 'refund' | 'platform_fee'
  amount_cents: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  stripe_transfer_id: string | null
  created_at: string
  order?: { order_number: string } | null
}

export interface PayoutSummary {
  totalEarned: number
  pendingPayout: number
  completedPayout: number
  thisMonthEarned: number
  lastMonthEarned: number
}

type PayoutProfileType = 'hub' | 'pro' | 'driver'

function ledgerTypeForProfile(type: PayoutProfileType): string {
  return `payout_${type}`
}

export async function getPayoutHistory(
  profileId: string,
  type: PayoutProfileType,
  limit = 30
): Promise<PayoutRecord[]> {
  const { data, error } = await supabase
    .from('payment_ledger')
    .select('*, order:orders(order_number)')
    .eq('profile_id', profileId)
    .eq('type', ledgerTypeForProfile(type))
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data ?? []) as PayoutRecord[]
}

export async function getPayoutSummary(
  profileId: string,
  type: PayoutProfileType
): Promise<PayoutSummary> {
  const ledgerType = ledgerTypeForProfile(type)

  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

  const [allRes, pendingRes, thisMonthRes, lastMonthRes] = await Promise.all([
    supabase
      .from('payment_ledger')
      .select('amount_cents', { count: 'exact' })
      .eq('profile_id', profileId)
      .eq('type', ledgerType)
      .eq('status', 'completed'),
    supabase
      .from('payment_ledger')
      .select('amount_cents', { count: 'exact' })
      .eq('profile_id', profileId)
      .eq('type', ledgerType)
      .in('status', ['pending', 'processing']),
    supabase
      .from('payment_ledger')
      .select('amount_cents')
      .eq('profile_id', profileId)
      .eq('type', ledgerType)
      .gte('created_at', startOfThisMonth),
    supabase
      .from('payment_ledger')
      .select('amount_cents')
      .eq('profile_id', profileId)
      .eq('type', ledgerType)
      .gte('created_at', startOfLastMonth)
      .lte('created_at', endOfLastMonth),
  ])

  const sum = (rows: { amount_cents: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + r.amount_cents, 0)

  return {
    totalEarned: sum(allRes.data),
    pendingPayout: sum(pendingRes.data),
    completedPayout: sum(allRes.data),
    thisMonthEarned: sum(thisMonthRes.data),
    lastMonthEarned: sum(lastMonthRes.data),
  }
}
