import { DeviceEventEmitter, NativeModules } from 'react-native'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'
import type { NativeNotificationEvent, NotificationModuleInterface } from '@/types/native'

const NotificationModule = NativeModules.NotificationModule as NotificationModuleInterface

let _subscription: ReturnType<typeof DeviceEventEmitter.addListener> | null = null

async function insertNotification(event: NativeNotificationEvent): Promise<void> {
  const isoDate = new Date(event.timestamp).toISOString()
  const syncHash = SyncHash.notification(event.package_name, isoDate, event.title)
  await executeAsync(
    `INSERT OR IGNORE INTO notifications (sync_hash, package_name, title, body, date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      syncHash,
      event.package_name,
      event.title || null,
      event.body || null,
      isoDate,
    ],
  )
}

export async function isNotificationListenerEnabled(): Promise<boolean> {
  return NotificationModule.isNotificationListenerEnabled()
}

export async function openNotificationListenerSettings(): Promise<void> {
  await NotificationModule.openNotificationListenerSettings()
}

export function startNotificationCollection(): void {
  if (_subscription) return
  _subscription = DeviceEventEmitter.addListener(
    'KinNotification',
    (event: NativeNotificationEvent) => {
      insertNotification(event).catch(() => undefined)
    },
  )
}

export function stopNotificationCollection(): void {
  _subscription?.remove()
  _subscription = null
}

export function isNotificationCollecting(): boolean {
  return _subscription !== null
}
