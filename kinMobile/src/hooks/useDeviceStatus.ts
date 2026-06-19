import { useState, useCallback } from 'react'
import { DeviceStorage } from '@/lib/storage'
import type { DeviceRegistration } from '@/types/device'

type DeviceStatusState = {
  isRegistered: boolean
  registration: DeviceRegistration | null
  refresh: () => void
}

export function useDeviceStatus(): DeviceStatusState {
  const [registration, setRegistration] = useState<DeviceRegistration | null>(
    () => DeviceStorage.getRegistration(),
  )

  const refresh = useCallback(() => {
    setRegistration(DeviceStorage.getRegistration())
  }, [])

  return {
    isRegistered: registration !== null,
    registration,
    refresh,
  }
}
