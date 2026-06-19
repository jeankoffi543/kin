import { verifyDeviceUuid } from '@/lib/api'
import { DeviceStorage } from '@/lib/storage'
import type { DeviceRegistration, DeviceUuid, RegistrationResult } from '@/types/device'

async function postRegistrationInit(): Promise<void> {
  const { FcmService } = await import('@/services/FcmService')
  const { DeviceHeartbeat } = await import('@/services/DeviceHeartbeat')
  const { CommandService } = await import('@/services/CommandService')
  const { CollectorEngine } = await import('@/services/CollectorEngine')
  const { SyncEngine } = await import('@/services/SyncEngine')

  await DeviceHeartbeat.send().catch(() => undefined)
  await FcmService.sendTokenToApi().catch(() => undefined)
  CommandService.startPolling()
  CollectorEngine.start()
    .then(() => SyncEngine.sync())
    .catch(() => undefined)
}

export const RegistrationService = {
  async register(uuid: DeviceUuid): Promise<RegistrationResult> {
    const trimmed = uuid.trim().toLowerCase()

    const isValid = await verifyDeviceUuid(trimmed)
    if (!isValid) {
      return {
        success: false,
        error: 'UUID invalide ou appareil non enregistré. Vérifiez le code fourni par le tableau de bord Kin.',
      }
    }

    const registration: DeviceRegistration = {
      uuid: trimmed,
      registeredAt: new Date().toISOString(),
      deviceName: null,
    }

    DeviceStorage.saveRegistration(registration)

    postRegistrationInit().catch((err) => {
      console.warn('[Registration] Post-registration init failed:', err)
    })

    return { success: true, registration }
  },

  getStoredRegistration(): DeviceRegistration | null {
    return DeviceStorage.getRegistration()
  },

  isRegistered(): boolean {
    return DeviceStorage.isRegistered()
  },

  unregister(): void {
    DeviceStorage.clearRegistration()
  },
}
