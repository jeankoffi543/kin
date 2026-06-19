import BackgroundFetch, { type HeadlessEvent } from 'react-native-background-fetch'
import { SyncEngine } from '@/services/SyncEngine'
import { CollectorEngine } from '@/services/CollectorEngine'
import { CommandService } from '@/services/CommandService'
import { RestrictionEngine } from '@/services/RestrictionEngine'
import { DeviceStorage } from '@/lib/storage'

const MIN_FETCH_INTERVAL = 15 // minutes — WorkManager minimum

async function backgroundCycle(): Promise<void> {
  await CollectorEngine.refresh()
  await SyncEngine.sync()
  await CommandService.pollAndExecute()
  await RestrictionEngine.pullAndApply()
}

// Headless task: runs when the JS bundle is not loaded (app terminated)
const headlessTask = async (event: HeadlessEvent): Promise<void> => {
  if (event.timeout) {
    BackgroundFetch.finish(event.taskId)
    return
  }
  if (DeviceStorage.isRegistered()) {
    try {
      await backgroundCycle()
    } catch {
      // Silent — WorkManager will retry on next interval
    }
  }
  BackgroundFetch.finish(event.taskId)
}

// Foreground task: runs when app is alive in background
const foregroundTask = async (taskId: string): Promise<void> => {
  if (DeviceStorage.isRegistered()) {
    try {
      await backgroundCycle()
    } catch {
      // Silent
    }
  }
  BackgroundFetch.finish(taskId)
}

const timeoutTask = (taskId: string): void => {
  BackgroundFetch.finish(taskId)
}

let _configured = false

export async function configureBackgroundSync(): Promise<void> {
  if (_configured) return
  _configured = true

  BackgroundFetch.registerHeadlessTask(headlessTask)

  await BackgroundFetch.configure(
    {
      minimumFetchInterval: MIN_FETCH_INTERVAL,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      requiresCharging: false,
      requiresDeviceIdle: false,
      requiresBatteryNotLow: false,
      requiresStorageNotLow: false,
    },
    foregroundTask,
    timeoutTask,
  )
}

export async function startBackgroundSync(): Promise<void> {
  await BackgroundFetch.start()
}

export async function stopBackgroundSync(): Promise<void> {
  await BackgroundFetch.stop()
}
