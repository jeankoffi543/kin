import { useState, useCallback, useRef } from 'react'
import { SyncStore, type SyncStatus } from '@/lib/sync-store'
import { SyncEngine, type SyncResult } from '@/services/SyncEngine'
import { CollectorEngine } from '@/services/CollectorEngine'

export type SyncState = {
  status: SyncStatus
  lastSyncAt: string | null
  pendingCount: number
  lastResult: SyncResult | null
}

export type UseSyncStatusReturn = {
  state: SyncState
  triggerSync: () => Promise<void>
  refreshState: () => void
}

function readStore(): SyncState {
  return {
    status: SyncStore.getSyncStatus(),
    lastSyncAt: SyncStore.getLastSyncAt(),
    pendingCount: SyncStore.getPendingCount(),
    lastResult: null,
  }
}

const SYNC_UI_TIMEOUT = 120_000

export function useSyncStatus(): UseSyncStatusReturn {
  const [state, setState] = useState<SyncState>(readStore)
  const syncingRef = useRef(false)
  const syncStartRef = useRef(0)

  const triggerSync = useCallback(async () => {
    if (syncingRef.current && Date.now() - syncStartRef.current < SYNC_UI_TIMEOUT) return
    syncingRef.current = true
    syncStartRef.current = Date.now()
    setState(prev => ({ ...prev, status: 'syncing' }))

    try {
      if (CollectorEngine.isRunning()) {
        await CollectorEngine.refresh()
      } else {
        await CollectorEngine.start()
      }
    } catch (err) {
      console.warn('[Sync] Collector refresh failed:', err)
    }

    const result = await SyncEngine.sync()

    syncingRef.current = false
    setState({
      status: result.success ? 'idle' : 'error',
      lastSyncAt: SyncStore.getLastSyncAt(),
      pendingCount: SyncStore.getPendingCount(),
      lastResult: result,
    })
  }, [])

  const refreshState = useCallback(() => {
    setState(readStore())
  }, [])

  return { state, triggerSync, refreshState }
}
