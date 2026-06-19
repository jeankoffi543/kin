import { createMMKV } from 'react-native-mmkv'

const store = createMMKV({ id: 'kin-sync-store' })

const KEYS = {
  LAST_SYNC_AT: 'sync_last_at',
  PENDING_COUNT: 'sync_pending_count',
  SYNC_STATUS: 'sync_status',
  FCM_TOKEN: 'fcm_token',
} as const

export type SyncStatus = 'idle' | 'syncing' | 'error'

export const SyncStore = {
  getLastSyncAt(): string | null {
    return store.getString(KEYS.LAST_SYNC_AT) ?? null
  },

  setLastSyncAt(isoDate: string): void {
    store.set(KEYS.LAST_SYNC_AT, isoDate)
  },

  getPendingCount(): number {
    return store.getNumber(KEYS.PENDING_COUNT) ?? 0
  },

  setPendingCount(count: number): void {
    store.set(KEYS.PENDING_COUNT, count)
  },

  getSyncStatus(): SyncStatus {
    return (store.getString(KEYS.SYNC_STATUS) as SyncStatus | undefined) ?? 'idle'
  },

  setSyncStatus(status: SyncStatus): void {
    store.set(KEYS.SYNC_STATUS, status)
  },

  getFcmToken(): string | null {
    return store.getString(KEYS.FCM_TOKEN) ?? null
  },

  setFcmToken(token: string): void {
    store.set(KEYS.FCM_TOKEN, token)
  },
}
