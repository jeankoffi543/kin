import { DeviceEventEmitter, NativeModules } from 'react-native'
import { deviceApi } from '@/lib/api'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'
import type { GeofenceModuleInterface, NativeGeofenceEvent } from '@/types/native'
import type { RestrictionRule, GeofenceRuleValue } from '@/types/sync'

const GeofenceModule = NativeModules.GeofenceModule as GeofenceModuleInterface

const DEFAULT_RADIUS_M = 200

let _subscription: ReturnType<typeof DeviceEventEmitter.addListener> | null = null
let _registeredIds: Set<string> = new Set()

async function insertGeofenceAlert(event: NativeGeofenceEvent): Promise<void> {
  const geofenceId = parseInt(event.geofence_id, 10)
  const triggeredAt = new Date(event.timestamp).toISOString()
  const syncHash = SyncHash.geofenceAlert(geofenceId, event.event_type, triggeredAt)

  await executeAsync(
    `INSERT OR IGNORE INTO geofence_alerts
     (sync_hash, geofence_id, event_type, latitude, longitude, triggered_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [syncHash, geofenceId, event.event_type, event.latitude, event.longitude, triggeredAt],
  )
}

function parseGeofenceValue(raw: string): GeofenceRuleValue | null {
  try {
    const parsed = JSON.parse(raw) as GeofenceRuleValue
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

export async function syncGeofencesFromApi(): Promise<number> {
  const response = await deviceApi.get<{ data: RestrictionRule[] }>('/device/restrictions')
  const rules = response.data?.data ?? (response.data as unknown as RestrictionRule[])
  const geofenceRules = (Array.isArray(rules) ? rules : []).filter(
    r => r.type === 'geofence' && r.is_active,
  )

  if (geofenceRules.length === 0) {
    // Remove all geofences if none configured
    if (_registeredIds.size > 0) {
      await GeofenceModule.removeAllGeofences()
      _registeredIds.clear()
    }
    return 0
  }

  let registered = 0
  for (const rule of geofenceRules) {
    const val = parseGeofenceValue(rule.value)
    if (!val) continue

    const id = String(rule.id)
    if (_registeredIds.has(id)) continue // Already registered this session

    try {
      await GeofenceModule.addGeofence(id, val.lat, val.lng, val.radius ?? DEFAULT_RADIUS_M)
      _registeredIds.add(id)
      registered++
    } catch {
      // Permission not granted or play services unavailable — skip
    }
  }

  return registered
}

export function startGeofenceCollection(): void {
  if (_subscription) return
  _subscription = DeviceEventEmitter.addListener(
    'KinGeofenceEvent',
    (event: NativeGeofenceEvent) => {
      insertGeofenceAlert(event).catch(() => undefined)
    },
  )
}

export function stopGeofenceCollection(): void {
  _subscription?.remove()
  _subscription = null
}

export function isGeofenceCollecting(): boolean {
  return _subscription !== null
}
