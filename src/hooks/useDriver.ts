import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useGeolocation } from './useGeolocation'
import {
  getDriverProfile,
  getActiveDispatchJob,
  getDriverRuns,
  getDriverMetrics,
  setDriverAvailability,
  updateDriverLocation,
  updateDispatchJobStatus,
} from '@/services/driver.service'

export function useDriverProfile() {
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''

  return useQuery({
    queryKey: ['driverProfile', driverId],
    queryFn: () => getDriverProfile(driverId),
    enabled: !!driverId,
    staleTime: 2 * 60 * 1000,
  })
}

export function useDriverMetrics() {
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''

  return useQuery({
    queryKey: ['driverMetrics', driverId],
    queryFn: () => getDriverMetrics(driverId),
    enabled: !!driverId,
    refetchInterval: 60_000,
  })
}

export function useDriverRuns(since?: string) {
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''

  return useQuery({
    queryKey: ['driverRuns', driverId, since],
    queryFn: () => getDriverRuns(driverId, since),
    enabled: !!driverId,
    staleTime: 30_000,
  })
}

export function useActiveJob() {
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const query = useQuery({
    queryKey: ['activeJob', driverId],
    queryFn: () => getActiveDispatchJob(driverId),
    enabled: !!driverId,
    staleTime: 15_000,
  })

  // Realtime: watch dispatch_jobs for this driver
  useEffect(() => {
    if (!driverId) return

    const channel = supabase
      .channel(`driver-job-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dispatch_jobs',
          filter: `driver_id=eq.${driverId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['activeJob', driverId] })
          void queryClient.invalidateQueries({ queryKey: ['driverMetrics', driverId] })
        }
      )
      .subscribe()

    channelRef.current = channel

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void queryClient.invalidateQueries({ queryKey: ['activeJob', driverId] })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      void supabase.removeChannel(channel)
    }
  }, [driverId, queryClient])

  return query
}

export function useDriverAvailability() {
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (isAvailable: boolean) => setDriverAvailability(driverId, isAvailable),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['driverProfile', driverId] })
    },
  })
}

export function useUpdateJobStatus() {
  const queryClient = useQueryClient()
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''

  return useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
      updateDispatchJobStatus(jobId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['activeJob', driverId] })
    },
  })
}

// Continuously publishes GPS position to the drivers table (while active run)
export function useDriverLocationPublisher(enabled: boolean) {
  const profile = useAuthStore((s) => s.profile)
  const driverId = profile?.id ?? ''
  const { lat, lng } = useGeolocation(enabled && !!driverId)
  const lastUpdateRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!enabled || !driverId || lat === null || lng === null) return

    const last = lastUpdateRef.current
    // Only update if moved more than ~10 metres (0.0001 degrees ≈ 11m)
    if (last && Math.abs(last.lat - lat) < 0.0001 && Math.abs(last.lng - lng) < 0.0001) return

    lastUpdateRef.current = { lat, lng }
    void updateDriverLocation(driverId, lat, lng)
  }, [lat, lng, driverId, enabled])

  return { lat, lng }
}
