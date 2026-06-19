import { useState, useEffect, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { CollectorEngine, type CollectorStats } from '@/services/CollectorEngine'
import { DeviceStorage } from '@/lib/storage'

type CollectorState =
  | { phase: 'idle' }
  | { phase: 'starting' }
  | { phase: 'active'; stats: CollectorStats }
  | { phase: 'error'; message: string }

export type UseCollectorsReturn = {
  state: CollectorState
  start: () => Promise<void>
  refresh: () => Promise<void>
  stop: () => void
}

export function useCollectors(): UseCollectorsReturn {
  const [state, setState] = useState<CollectorState>(
    CollectorEngine.isRunning()
      ? { phase: 'active', stats: CollectorEngine.getStats() }
      : { phase: 'idle' },
  )

  const start = useCallback(async () => {
    if (!DeviceStorage.isRegistered()) {
      console.warn('[useCollectors] Device not registered, skipping start')
      return
    }
    setState({ phase: 'starting' })
    try {
      const stats = await CollectorEngine.start()
      setState({ phase: 'active', stats })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[useCollectors] Start failed:', msg)
      setState({ phase: 'error', message: msg })
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!CollectorEngine.isRunning()) return
    try {
      const stats = await CollectorEngine.refresh()
      setState({ phase: 'active', stats })
    } catch {
      // Keep current state on refresh failure
    }
  }, [])

  const stop = useCallback(() => {
    CollectorEngine.stop()
    setState({ phase: 'idle' })
  }, [])

  useEffect(() => {
    if (DeviceStorage.isRegistered() && !CollectorEngine.isRunning()) {
      start()
    }
  }, [start])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active' && CollectorEngine.isRunning()) {
        refresh()
      }
    })
    return () => sub.remove()
  }, [refresh])

  return { state, start, refresh, stop }
}
