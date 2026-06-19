import { NativeModules } from 'react-native'

interface ForegroundServiceModuleInterface {
  start(): Promise<boolean>
  stop(): Promise<boolean>
}

const { ForegroundServiceModule } = NativeModules as {
  ForegroundServiceModule: ForegroundServiceModuleInterface
}

let _active = false

export const ForegroundServiceManager = {
  isActive(): boolean {
    return _active
  },

  async start(): Promise<void> {
    if (_active) return
    await ForegroundServiceModule.start()
    _active = true
  },

  async stop(): Promise<void> {
    if (!_active) return
    await ForegroundServiceModule.stop()
    _active = false
  },
}
