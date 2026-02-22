import { supabase } from '@/lib/supabase'
import type { LoyaltyTransaction, Referral, LoyaltyProfile } from '@/types/loyalty.types'

// ── Profile & Points ──────────────────────────────────────────────────────────

export async function getLoyaltyProfile(profileId: string): Promise<LoyaltyProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('loyalty_points, loyalty_tier, referral_code')
    .eq('id', profileId)
    .single()

  if (error) throw error
  if (!data) return null

  return {
    points: data.loyalty_points ?? 0,
    tier: (data.loyalty_tier as LoyaltyProfile['tier']) ?? 'bronze',
    referralCode: data.referral_code,
  }
}

export async function getLoyaltyTransactions(profileId: string): Promise<LoyaltyTransaction[]> {
  const { data, error } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data ?? []
}

// ── Referrals ─────────────────────────────────────────────────────────────────

export async function getReferrals(referrerId: string): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', referrerId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getReferralStats(
  referrerId: string
): Promise<{ total: number; rewarded: number; pendingPoints: number }> {
  const referrals = await getReferrals(referrerId)
  return {
    total: referrals.length,
    rewarded: referrals.filter((r) => r.status === 'rewarded').length,
    pendingPoints: referrals
      .filter((r) => r.status === 'pending')
      .reduce((s, r) => s + (r.reward_points ?? 0), 0),
  }
}
