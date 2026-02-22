import type { Database } from './database.types'

export type LoyaltyTransaction = Database['public']['Tables']['loyalty_transactions']['Row']
export type Referral = Database['public']['Tables']['referrals']['Row']
export type LoyaltyTier = Database['public']['Enums']['loyalty_tier']

export interface TierConfig {
  tier: LoyaltyTier
  label: string
  minPoints: number
  nextTier: LoyaltyTier | null
  nextMinPoints: number | null
  color: string
  bg: string
}

export const TIER_CONFIG: Record<LoyaltyTier, TierConfig> = {
  bronze: {
    tier: 'bronze',
    label: 'Bronze',
    minPoints: 0,
    nextTier: 'silver',
    nextMinPoints: 1000,
    color: 'text-amber-700',
    bg: 'bg-amber-100',
  },
  silver: {
    tier: 'silver',
    label: 'Silver',
    minPoints: 1000,
    nextTier: 'gold',
    nextMinPoints: 5000,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
  },
  gold: {
    tier: 'gold',
    label: 'Gold',
    minPoints: 5000,
    nextTier: null,
    nextMinPoints: null,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
  },
}

// How many points equals $1 off (1000 pts = $10 off → 100 pts = $1)
export const POINTS_REDEMPTION_RATE = 100  // 100 pts = $1

export interface LoyaltyProfile {
  points: number
  tier: LoyaltyTier
  referralCode: string | null
}
