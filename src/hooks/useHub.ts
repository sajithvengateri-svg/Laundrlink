import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getHubByOwner, getHubQueue, getHubMetrics } from '@/services/hub.service'
import { useAuthStore } from '@/stores/authStore'

export function useHub() {
  const profile = useAuthStore((s) => s.profile)
  const ownerId = profile?.id ?? ''

  return useQuery({
    queryKey: ['hub', ownerId],
    queryFn: () => getHubByOwner(ownerId),
    enabled: !!ownerId && profile?.role === 'hub',
    staleTime: 5 * 60 * 1000,
  })
}

export function useHubQueue(hubId: string) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const query = useQuery({
    queryKey: ['hubQueue', hubId],
    queryFn: () => getHubQueue(hubId),
    enabled: !!hubId,
    refetchInterval: 30_000,
  })

  // Realtime subscription — invalidate query on any orders change for this hub
  useEffect(() => {
    if (!hubId) return

    const channel = supabase
      .channel(`hub-queue-${hubId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `hub_id=eq.${hubId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['hubQueue', hubId] })
        }
      )
      .subscribe()

    channelRef.current = channel

    // Reconnect on tab becoming visible again (mobile backgrounding)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void queryClient.invalidateQueries({ queryKey: ['hubQueue', hubId] })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      void supabase.removeChannel(channel)
    }
  }, [hubId, queryClient])

  return query
}

export function useHubMetrics(hubId: string) {
  return useQuery({
    queryKey: ['hubMetrics', hubId],
    queryFn: () => getHubMetrics(hubId),
    enabled: !!hubId,
    refetchInterval: 60_000,
  })
}
