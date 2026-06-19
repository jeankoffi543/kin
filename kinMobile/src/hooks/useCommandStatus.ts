import { useState, useCallback } from 'react'
import { CommandService } from '@/services/CommandService'

export type UseCommandStatusReturn = {
  polling: boolean
  lastExecuted: number
  triggerPoll: () => Promise<void>
}

export function useCommandStatus(): UseCommandStatusReturn {
  const [polling, setPolling] = useState(CommandService.isPolling())
  const [lastExecuted, setLastExecuted] = useState(0)

  const triggerPoll = useCallback(async () => {
    setPolling(true)
    try {
      const count = await CommandService.pollAndExecute()
      setLastExecuted(count)
    } finally {
      setPolling(false)
    }
  }, [])

  return { polling, lastExecuted, triggerPoll }
}
