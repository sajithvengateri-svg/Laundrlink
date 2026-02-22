/**
 * useOfflineQueueSync — listens for the browser `online` event and
 * automatically flushes queued handoffs.  Mount once in QRScannerModal or
 * HubScanPage / ProScanPage.
 */

import { useEffect, useState } from 'react'
import { flushQueue, getQueueLength } from '@/lib/offlineQueue'
import { createHandoff } from '@/services/handoff.service'
import { useQueryClient } from '@tanstack/react-query'

interface SyncState {
  /** Number of items currently waiting in the queue */
  queueLength: number
  /** True while a flush is running */
  isSyncing: boolean
  /** Result of the last flush attempt */
  lastResult: { succeeded: number; failed: number } | null
}

export function useOfflineQueueSync() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<SyncState>({
    queueLength: 0,
    isSyncing: false,
    lastResult: null,
  })

  // Refresh queue length on mount and after each sync
  const refreshQueueLength = async () => {
    try {
      const len = await getQueueLength()
      setState((s) => ({ ...s, queueLength: len }))
    } catch {
      // IndexedDB unavailable (SSR, private browsing, etc.) — ignore
    }
  }

  const flush = async () => {
    setState((s) => ({ ...s, isSyncing: true }))
    try {
      const result = await flushQueue(createHandoff)
      setState((s) => ({ ...s, isSyncing: false, lastResult: result }))
      if (result.succeeded > 0) {
        // Invalidate order + handoff queries so UI reflects synced data
        void queryClient.invalidateQueries({ queryKey: ['orders'] })
        void queryClient.invalidateQueries({ queryKey: ['handoffs'] })
      }
    } catch {
      setState((s) => ({ ...s, isSyncing: false }))
    } finally {
      await refreshQueueLength()
    }
  }

  useEffect(() => {
    void refreshQueueLength()

    // Flush immediately if already online and queue has items
    if (navigator.onLine) void flush()

    const handleOnline = () => {
      void flush()
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
