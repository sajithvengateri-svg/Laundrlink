import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useOrderRealtime(orderId: string | null) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!orderId) return

    const channel = supabase
      .channel(`order-realtime-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'handoffs',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
        }
      )
      .subscribe()

    channelRef.current = channel

    // Reconnect when tab becomes visible again (mobile backgrounding)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      void supabase.removeChannel(channel)
    }
  }, [orderId, queryClient])
}
