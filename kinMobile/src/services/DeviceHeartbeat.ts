import { Platform } from 'react-native'
import { deviceApi } from '@/lib/api'
import { DeviceStorage } from '@/lib/storage'

function getDeviceInfo(): Record<string, string> {
  const constants = Platform.constants as Record<string, unknown>
  return {
    platform: Platform.OS,
    brand: String(constants.Brand ?? constants.Manufacturer ?? ''),
    model: String(constants.Model ?? ''),
    os_version: String(Platform.Version),
    app_version: '1.0.0',
  }
}

export const DeviceHeartbeat = {
  async send(): Promise<void> {
    if (!DeviceStorage.isRegistered()) return

    const info = getDeviceInfo()
    console.log('[Heartbeat] Sending:', info)

    try {
      await deviceApi.post('/device/heartbeat', info)
      console.log('[Heartbeat] OK — device metadata updated')
    } catch (err) {
      console.warn('[Heartbeat] Failed:', err instanceof Error ? err.message : err)
    }
  },
}
