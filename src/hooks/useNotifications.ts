import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type AppNotification,
} from '@/services/notification.service'

export function useNotifications(limit = 30) {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const query = useQuery<AppNotification[], Error>({
    queryKey: ['notifications', user?.id, limit],
    queryFn: () => getNotifications(user!.id, limit),
    enabled: !!user?.id,
  })

  // Realtime: insert on this user's notifications → invalidate feed + count
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['notifications', user.id] })
          void queryClient.invalidateQueries({ queryKey: ['unreadCount', user.id] })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  return query
}

export function useUnreadCount() {
  const { user } = useAuthStore()
  return useQuery<number, Error>({
    queryKey: ['unreadCount', user?.id],
    queryFn: () => getUnreadCount(user!.id),
    enabled: !!user?.id,
    refetchInterval: 60_000,
  })
}

export function useMarkAsRead() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: markAsRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['unreadCount', user?.id] })
    },
  })
}

export function useMarkAllAsRead() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: () => markAllAsRead(user!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      void queryClient.invalidateQueries({ queryKey: ['unreadCount', user?.id] })
    },
  })
}
