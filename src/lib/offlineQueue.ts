/**
 * Offline QR scan queue — IndexedDB-backed store for handoff events
 * captured when the device is offline.  Synced on reconnect via
 * useOfflineQueueSync() hook.
 */

import type { CreateHandoffParams } from '@/types/hub.types'

const DB_NAME = 'laundrlink-offline'
const DB_VERSION = 1
const STORE_NAME = 'queued_handoffs'

export interface QueuedHandoff {
  id: string          // local UUID
  params: CreateHandoffParams
  queuedAt: string    // ISO timestamp
  retries: number
}

// ── DB init ───────────────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Add a handoff to the offline queue. Returns the local queue ID. */
export async function enqueueHandoff(params: CreateHandoffParams): Promise<string> {
  const db = await openDB()
  const id = crypto.randomUUID()
  const entry: QueuedHandoff = {
    id,
    params,
    queuedAt: new Date().toISOString(),
    retries: 0,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add(entry)
    req.onsuccess = () => resolve(id)
    req.onerror = () => reject(req.error)
  })
}

/** Get all queued handoffs, oldest first. */
export async function getQueuedHandoffs(): Promise<QueuedHandoff[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.getAll()
    req.onsuccess = () =>
      resolve(
        ((req.result as QueuedHandoff[]) ?? []).sort(
          (a, b) => new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()
        )
      )
    req.onerror = () => reject(req.error)
  })
}

/** Remove a successfully synced entry from the queue. */
export async function dequeueHandoff(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** Count of items in the queue. */
export async function getQueueLength(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const req = store.count()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Flush the queue by calling `submitFn` for each item.
 * Successful items are removed.  Failed items are left for next flush.
 * Returns { succeeded, failed } counts.
 */
export async function flushQueue(
  submitFn: (params: CreateHandoffParams) => Promise<unknown>
): Promise<{ succeeded: number; failed: number }> {
  const items = await getQueuedHandoffs()
  let succeeded = 0
  let failed = 0

  for (const item of items) {
    try {
      await submitFn(item.params)
      await dequeueHandoff(item.id)
      succeeded++
    } catch {
      failed++
    }
  }

  return { succeeded, failed }
}
