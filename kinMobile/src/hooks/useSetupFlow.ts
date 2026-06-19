import { useState, useCallback, useEffect } from 'react'
import { RegistrationService } from '@/services/RegistrationService'
import { getInitialDeepLinkUuid, subscribeToDeepLinks } from '@/lib/deeplink'
import type { DeviceUuid, SetupState } from '@/types/device'

type SetupFlowReturn = {
  state: SetupState
  submitUuid: (uuid: DeviceUuid) => Promise<void>
  reset: () => void
  deepLinkUuid: DeviceUuid | null
}

export function useSetupFlow(): SetupFlowReturn {
  const [state, setState] = useState<SetupState>({ phase: 'idle' })
  const [deepLinkUuid, setDeepLinkUuid] = useState<DeviceUuid | null>(null)

  // Check initial deep link on mount
  useEffect(() => {
    getInitialDeepLinkUuid().then((uuid) => {
      if (uuid) setDeepLinkUuid(uuid)
    })

    const unsubscribe = subscribeToDeepLinks((uuid) => {
      setDeepLinkUuid(uuid)
    })

    return unsubscribe
  }, [])

  const submitUuid = useCallback(async (uuid: DeviceUuid): Promise<void> => {
    setState({ phase: 'verifying', uuid })

    const result = await RegistrationService.register(uuid)

    if (result.success) {
      setState({ phase: 'success', registration: result.registration })
    } else {
      setState({ phase: 'error', message: result.error })
    }
  }, [])

  const reset = useCallback(() => {
    setState({ phase: 'idle' })
  }, [])

  return { state, submitUuid, reset, deepLinkUuid }
}
