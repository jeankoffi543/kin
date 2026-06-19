'use client'

import type { DeviceEvent } from '@/hooks/use-device-channel'
import { useDeviceChannel } from '@/hooks/use-device-channel'
import { useParentToken } from '@/hooks/use-parent-token'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as React from 'react'

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const token = useParentToken()
  const queryClient = useQueryClient()

  React.useEffect(() => {
    console.log('[RealtimeProvider] Token status:', token ? 'loaded' : 'null')
  }, [token])

  const handleEvent = React.useCallback(
    (event: DeviceEvent) => {
      console.log('[RealtimeProvider] Handling event:', event.event, event.status)

      switch (event.event) {
        case 'remote_command': {
          if (event.status === 'completed') {
            toast.success(`Commande "${event.type}" terminée`)
          } else if (event.status === 'failed') {
            toast.error(`Commande "${event.type}" échouée`)
          } else if (event.status === 'pending') {
            toast.info(`Commande "${event.type}" envoyée au mobile`)
          }
          queryClient.invalidateQueries({ queryKey: ['dashboard-calls'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-notifs'] })
          break
        }
        case 'config_updated': {
          toast.info("Configuration de l'appareil mise à jour")
          break
        }
        default: {
          // Any other event — refresh all telemetry feeds
          queryClient.invalidateQueries({ queryKey: ['dashboard-calls'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-sms'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-gps'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-notifs'] })
          queryClient.invalidateQueries({ queryKey: ['telephony-calls'] })
          queryClient.invalidateQueries({ queryKey: ['telephony-contacts'] })
          queryClient.invalidateQueries({ queryKey: ['messaging-sms'] })
          queryClient.invalidateQueries({ queryKey: ['location-gps'] })
          queryClient.invalidateQueries({ queryKey: ['activity-browser'] })
          queryClient.invalidateQueries({ queryKey: ['activity-apps'] })
          queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
          break
        }
      }
    },
    [queryClient],
  )

  useDeviceChannel({ onEvent: handleEvent, token })

  return <>{children}</>
}
