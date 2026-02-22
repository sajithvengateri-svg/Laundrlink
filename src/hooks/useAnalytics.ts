import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  getCustomerStats,
  getCustomerMonthlySpending,
  getHubDailyOrders,
  getHubWeeklyRevenue,
  getProWeeklyJobs,
  getProWeeklyEarnings,
  type CustomerStats,
  type MonthlySpend,
  type DailyOrderCount,
  type WeeklyMetric,
} from '@/services/analytics.service'

export function useCustomerStats() {
  const { user } = useAuthStore()
  return useQuery<CustomerStats, Error>({
    queryKey: ['customerStats', user?.id],
    queryFn: () => getCustomerStats(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCustomerMonthlySpending(months = 6) {
  const { user } = useAuthStore()
  return useQuery<MonthlySpend[], Error>({
    queryKey: ['customerMonthlySpending', user?.id, months],
    queryFn: () => getCustomerMonthlySpending(user!.id, months),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  })
}

export function useHubDailyOrders(hubId: string | undefined, days = 14) {
  return useQuery<DailyOrderCount[], Error>({
    queryKey: ['hubDailyOrders', hubId, days],
    queryFn: () => getHubDailyOrders(hubId!, days),
    enabled: !!hubId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useHubWeeklyRevenue(weeks = 8) {
  const { user } = useAuthStore()
  return useQuery<WeeklyMetric[], Error>({
    queryKey: ['hubWeeklyRevenue', user?.id, weeks],
    queryFn: () => getHubWeeklyRevenue(user!.id, weeks),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProWeeklyJobs(proId: string | undefined, weeks = 8) {
  return useQuery<WeeklyMetric[], Error>({
    queryKey: ['proWeeklyJobs', proId, weeks],
    queryFn: () => getProWeeklyJobs(proId!, weeks),
    enabled: !!proId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProWeeklyEarnings(weeks = 8) {
  const { user } = useAuthStore()
  return useQuery<WeeklyMetric[], Error>({
    queryKey: ['proWeeklyEarnings', user?.id, weeks],
    queryFn: () => getProWeeklyEarnings(user!.id, weeks),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })
}
