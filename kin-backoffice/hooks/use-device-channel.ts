'use client'

import { useDevice } from '@/contexts/device-context'
import { getEcho, disconnectEcho } from '@/lib/echo'
import * as React from 'react'

export interface DeviceEvent {
  event: string
  command_id?: number
  type?: string
  status?: string
  parameters?: Record<string, unknown>
  result_path?: string
  [key: string]: unknown
}

interface UseDeviceChannelOptions {
  onEvent?: (event: DeviceEvent) => void
  token: string | null
}

export function useDeviceChannel({ onEvent, token }: UseDeviceChannelOptions) {
  const { activeDevice } = useDevice()
  const uuid = activeDevice?.uuid ?? null
  const callbackRef = React.useRef(onEvent)
  callbackRef.current = onEvent

  React.useEffect(() => {
    if (!uuid || !token) {
      if (!token) console.log('[DeviceChannel] No token yet, skipping')
      if (!uuid) console.log('[DeviceChannel] No active device, skipping')
      return
    }

    console.log('[DeviceChannel] Subscribing to private-device.' + uuid)

    const echo = getEcho(token)
    const channel = echo.private(`device.${uuid}`)

    channel
      .listen('.ReceptBroadcast', (data: DeviceEvent) => {
        console.log('[DeviceChannel] Event received:', data)
        callbackRef.current?.(data)
      })
      .error((err: unknown) => {
        console.error('[DeviceChannel] Channel subscription error:', err)
      })

    return () => {
      console.log('[DeviceChannel] Leaving channel device.' + uuid)
      channel.stopListening('.ReceptBroadcast')
      echo.leave(`device.${uuid}`)
    }
  }, [uuid, token])
}
