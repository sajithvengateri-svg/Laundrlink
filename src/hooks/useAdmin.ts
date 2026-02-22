import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminKpis,
  getAdminUsers,
  setUserActive,
  getAdminOrders,
  getOrderScanChain,
  getPendingVerifications,
  approveEntity,
  rejectEntity,
  getPricingConfig,
  updatePricingConfig,
  getAdminAnalytics,
} from '@/services/admin.service'
import type { PricingConfigUpdate } from '@/types/admin.types'

export function useAdminKpis() {
  return useQuery({
    queryKey: ['adminKpis'],
    queryFn: getAdminKpis,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

export function useAdminUsers(role: string, search = '') {
  return useQuery({
    queryKey: ['adminUsers', role, search],
    queryFn: () => getAdminUsers(role, search),
    staleTime: 30_000,
  })
}

export function useSetUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      setUserActive(userId, isActive),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}

export function useAdminOrders(statusFilter = '', search = '') {
  return useQuery({
    queryKey: ['adminOrders', statusFilter, search],
    queryFn: () => getAdminOrders(statusFilter, search),
    staleTime: 30_000,
  })
}

export function useOrderScanChain(orderId: string | null) {
  return useQuery({
    queryKey: ['scanChain', orderId],
    queryFn: () => getOrderScanChain(orderId!),
    enabled: !!orderId,
  })
}

export function usePendingVerifications() {
  return useQuery({
    queryKey: ['pendingVerifications'],
    queryFn: getPendingVerifications,
    staleTime: 30_000,
  })
}

export function useApproveEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, entityId }: { type: 'hub' | 'pro' | 'driver'; entityId: string }) =>
      approveEntity(type, entityId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['pendingVerifications'] }),
  })
}

export function useRejectEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, entityId }: { type: 'hub' | 'pro' | 'driver'; entityId: string }) =>
      rejectEntity(type, entityId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['pendingVerifications'] }),
  })
}

export function usePricingConfig() {
  return useQuery({
    queryKey: ['pricingConfig'],
    queryFn: getPricingConfig,
    staleTime: 300_000,
  })
}

export function useUpdatePricingConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PricingConfigUpdate }) =>
      updatePricingConfig(id, updates),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['pricingConfig'] }),
  })
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ['adminAnalytics'],
    queryFn: getAdminAnalytics,
    staleTime: 300_000,
  })
}
