import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  getProProfile,
  updateProProfile,
  setProAvailability,
  getProActiveJobs,
  getProCompletedJobs,
  getProMetrics,
  submitFit2WorkCheck,
} from '@/services/pro.service'
import type { ProUpdate } from '@/types/pro.types'

export function useProProfile() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['pro', 'profile', user?.id],
    queryFn: () => getProProfile(user!.id),
    enabled: !!user?.id,
  })
}

export function useUpdateProProfile() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (updates: ProUpdate) => updateProProfile(user!.id, updates),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro', 'profile', user?.id] })
    },
  })
}

export function useProAvailability() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const { data: pro } = useProProfile()

  const toggle = useMutation({
    mutationFn: (isAvailable: boolean) => setProAvailability(user!.id, isAvailable),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro', 'profile', user?.id] })
    },
  })

  return {
    isAvailable: pro?.is_available ?? false,
    toggle: toggle.mutate,
    isPending: toggle.isPending,
  }
}

export function useProActiveJobs() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['pro', 'jobs', 'active', user?.id],
    queryFn: () => getProActiveJobs(user!.id),
    enabled: !!user?.id,
    refetchInterval: 30_000,
  })
}

export function useProCompletedJobs(since?: string) {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['pro', 'jobs', 'completed', user?.id, since],
    queryFn: () => getProCompletedJobs(user!.id, since),
    enabled: !!user?.id,
  })
}

export function useProMetrics() {
  const { user } = useAuthStore()
  return useQuery({
    queryKey: ['pro', 'metrics', user?.id],
    queryFn: () => getProMetrics(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  })
}

export function useSubmitFit2Work() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => submitFit2WorkCheck(user!.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro', 'profile', user?.id] })
    },
  })
}
