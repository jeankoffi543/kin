export type DeviceUuid = string

export type DeviceRegistration = {
  uuid: DeviceUuid
  registeredAt: string
  deviceName: string | null
}

export type RegistrationResult =
  | { success: true; registration: DeviceRegistration }
  | { success: false; error: string }

export type SetupMethod = 'qr' | 'manual'

export type SetupState =
  | { phase: 'idle' }
  | { phase: 'scanning' }
  | { phase: 'verifying'; uuid: DeviceUuid }
  | { phase: 'error'; message: string }
  | { phase: 'success'; registration: DeviceRegistration }
