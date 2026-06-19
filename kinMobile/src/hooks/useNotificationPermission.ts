import { useState, useEffect, useCallback } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import {
  isNotificationListenerEnabled,
  openNotificationListenerSettings,
  startNotificationCollection,
  isNotificationCollecting,
} from '@/collectors/NotificationCollector'

export type NotificationPermissionState = {
  enabled: boolean | null // null = loading
  collecting: boolean
}

export function useNotificationPermission() {
  const [state, setState] = useState<NotificationPermissionState>({
    enabled: null,
    collecting: isNotificationCollecting(),
  })

  const check = useCallback(async () => {
    const enabled = await isNotificationListenerEnabled().catch(() => false)
    if (enabled && !isNotificationCollecting()) {
      startNotificationCollection()
    }
    setState({ enabled, collecting: isNotificationCollecting() })
  }, [])

  const openSettings = useCallback(async () => {
    await openNotificationListenerSettings()
  }, [])

  // Check on mount
  useEffect(() => {
    check()
  }, [check])

  // Re-check when app comes to foreground (user may have just granted permission)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'active') check()
    })
    return () => sub.remove()
  }, [check])

  return { state, openSettings, recheckPermission: check }
}
