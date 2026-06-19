import { useState, useEffect, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { RestrictionEngine, type RestrictionState } from '@/services/RestrictionEngine'

export type UseRestrictionsReturn = {
  state: RestrictionState
  refresh: () => Promise<void>
}

export function useRestrictions(): UseRestrictionsReturn {
  const [state, setState] = useState<RestrictionState>(RestrictionEngine.getState())

  const refresh = useCallback(async () => {
    const updated = await RestrictionEngine.pullAndApply()
    setState(updated)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') {
        refresh()
      }
    })
    return () => sub.remove()
  }, [refresh])

  return { state, refresh }
}
