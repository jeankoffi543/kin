import { createMMKV } from 'react-native-mmkv'
import type { DeviceRegistration, DeviceUuid } from '@/types/device'

const store = createMMKV({ id: 'kin-device-store' })

const KEYS = {
  DEVICE_UUID: 'device_uuid',
  REGISTERED_AT: 'device_registered_at',
  DEVICE_NAME: 'device_name',
  LAST_SYNC_AT: 'last_sync_at',
  RESTRICTION_RULES: 'restriction_rules',
  LAST_CALL_LOG_SYNC: 'cursor_call_log',
  LAST_SMS_SYNC: 'cursor_sms',
  LAST_USAGE_STATS_SYNC: 'cursor_usage_stats',
  LAST_MEDIA_SYNC: 'cursor_media',
  LAST_FILE_SYNC: 'cursor_files',
  CURSOR_RESET_V2: 'cursor_reset_v2',
  CURSOR_RESET_V3: 'cursor_reset_v3',
  CURSOR_RESET_V4: 'cursor_reset_v4',
  CURSOR_RESET_V5: 'cursor_reset_v5',
  CURSOR_RESET_V6: 'cursor_reset_v6',
} as const

export const DeviceStorage = {
  getUuid(): DeviceUuid | null {
    return store.getString(KEYS.DEVICE_UUID) ?? null
  },

  isRegistered(): boolean {
    return store.contains(KEYS.DEVICE_UUID)
  },

  saveRegistration(registration: DeviceRegistration): void {
    store.set(KEYS.DEVICE_UUID, registration.uuid)
    store.set(KEYS.REGISTERED_AT, registration.registeredAt)
    if (registration.deviceName) {
      store.set(KEYS.DEVICE_NAME, registration.deviceName)
    }
  },

  getRegistration(): DeviceRegistration | null {
    const uuid = store.getString(KEYS.DEVICE_UUID)
    if (!uuid) return null
    return {
      uuid,
      registeredAt: store.getString(KEYS.REGISTERED_AT) ?? '',
      deviceName: store.getString(KEYS.DEVICE_NAME) ?? null,
    }
  },

  clearRegistration(): void {
    store.delete(KEYS.DEVICE_UUID)
    store.delete(KEYS.REGISTERED_AT)
    store.delete(KEYS.DEVICE_NAME)
  },

  setLastSyncAt(isoDate: string): void {
    store.set(KEYS.LAST_SYNC_AT, isoDate)
  },

  getLastSyncAt(): string | null {
    return store.getString(KEYS.LAST_SYNC_AT) ?? null
  },

  setRestrictionRules(rulesJson: string): void {
    store.set(KEYS.RESTRICTION_RULES, rulesJson)
  },

  getRestrictionRulesJson(): string | null {
    return store.getString(KEYS.RESTRICTION_RULES) ?? null
  },

  // Curseurs temporels pour les collecteurs (Unix ms)
  getLastCallLogSync(): number {
    return store.getNumber(KEYS.LAST_CALL_LOG_SYNC) ?? 0
  },

  setLastCallLogSync(timestampMs: number): void {
    store.set(KEYS.LAST_CALL_LOG_SYNC, timestampMs)
  },

  getLastSmsSync(): number {
    return store.getNumber(KEYS.LAST_SMS_SYNC) ?? 0
  },

  setLastSmsSync(timestampMs: number): void {
    store.set(KEYS.LAST_SMS_SYNC, timestampMs)
  },

  getLastUsageStatsSync(): number {
    return store.getNumber(KEYS.LAST_USAGE_STATS_SYNC) ?? 0
  },

  setLastUsageStatsSync(timestampMs: number): void {
    store.set(KEYS.LAST_USAGE_STATS_SYNC, timestampMs)
  },

  getLastMediaSync(): number {
    return store.getNumber(KEYS.LAST_MEDIA_SYNC) ?? 0
  },

  setLastMediaSync(timestampMs: number): void {
    store.set(KEYS.LAST_MEDIA_SYNC, timestampMs)
  },

  getLastFileSync(): number {
    return store.getNumber(KEYS.LAST_FILE_SYNC) ?? 0
  },

  setLastFileSync(timestampMs: number): void {
    store.set(KEYS.LAST_FILE_SYNC, timestampMs)
  },

  applyCursorResetV2(): void {
    if (store.getBoolean(KEYS.CURSOR_RESET_V2)) return
    store.set(KEYS.LAST_SMS_SYNC, 0)
    store.set(KEYS.LAST_CALL_LOG_SYNC, 0)
    store.set(KEYS.CURSOR_RESET_V2, true)
    console.log('[DeviceStorage] Cursor reset v2 applied')
  },

  applyCursorResetV3(): void {
    if (store.getBoolean(KEYS.CURSOR_RESET_V3)) return
    store.set(KEYS.LAST_SMS_SYNC, 0)
    store.set(KEYS.LAST_CALL_LOG_SYNC, 0)
    store.set(KEYS.CURSOR_RESET_V3, true)
    console.log('[DeviceStorage] Cursor reset v3 applied')
  },

  applyCursorResetV4(): void {
    if (store.getBoolean(KEYS.CURSOR_RESET_V4)) return
    store.set(KEYS.LAST_SMS_SYNC, 0)
    store.set(KEYS.CURSOR_RESET_V4, true)
    console.log('[DeviceStorage] Cursor reset v4 applied')
  },

  applyCursorResetV5(): void {
    if (store.getBoolean(KEYS.CURSOR_RESET_V5)) return
    store.set(KEYS.LAST_SMS_SYNC, 0)
    store.set(KEYS.LAST_CALL_LOG_SYNC, 0)
    store.set(KEYS.CURSOR_RESET_V5, true)
    console.log('[DeviceStorage] Cursor reset v5 applied')
  },

  applyCursorResetV6(): void {
    if (store.getBoolean(KEYS.CURSOR_RESET_V6)) return
    store.set(KEYS.LAST_CALL_LOG_SYNC, 0)
    store.set(KEYS.CURSOR_RESET_V6, true)
    console.log('[DeviceStorage] Cursor reset v6 applied — calls re-sync with recorded_at')
  },
}
