import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  getLoyaltyProfile,
  getLoyaltyTransactions,
  getReferrals,
  getReferralStats,
} from '@/services/loyalty.service'

export function useLoyaltyProfile() {
  const profile = useAuthStore((s) => s.profile)
  const id = profile?.id ?? ''
  return useQuery({
    queryKey: ['loyaltyProfile', id],
    queryFn: () => getLoyaltyProfile(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useLoyaltyTransactions() {
  const profile = useAuthStore((s) => s.profile)
  const id = profile?.id ?? ''
  return useQuery({
    queryKey: ['loyaltyTransactions', id],
    queryFn: () => getLoyaltyTransactions(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useReferrals() {
  const profile = useAuthStore((s) => s.profile)
  const id = profile?.id ?? ''
  return useQuery({
    queryKey: ['referrals', id],
    queryFn: () => getReferrals(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}

export function useReferralStats() {
  const profile = useAuthStore((s) => s.profile)
  const id = profile?.id ?? ''
  return useQuery({
    queryKey: ['referralStats', id],
    queryFn: () => getReferralStats(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}
