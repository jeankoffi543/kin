import Geolocation, { type GeoPosition, type GeoError } from 'react-native-geolocation-service'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'

const GPS_INTERVAL_MS = 60_000
const GPS_FASTEST_MS = 30_000
const GPS_DISTANCE_FILTER_M = 50

let _watchId: number | null = null

async function insertPosition(pos: GeoPosition): Promise<void> {
  const lat = pos.coords.latitude
  const lng = pos.coords.longitude
  const recordedAt = new Date(pos.timestamp).toISOString()
  const syncHash = SyncHash.gpsLocation(lat, lng, recordedAt)

  await executeAsync(
    `INSERT OR IGNORE INTO gps_locations
     (sync_hash, latitude, longitude, altitude, accuracy, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      syncHash,
      lat,
      lng,
      pos.coords.altitude ?? null,
      pos.coords.accuracy ?? null,
      recordedAt,
    ],
  )
}

function onError(_err: GeoError): void {
  // Silent — collection continues at next interval
}

export function startGpsCollection(): void {
  if (_watchId !== null) return

  _watchId = Geolocation.watchPosition(
    pos => {
      insertPosition(pos).catch(() => undefined)
    },
    onError,
    {
      accuracy: { android: 'high' },
      interval: GPS_INTERVAL_MS,
      fastestInterval: GPS_FASTEST_MS,
      distanceFilter: GPS_DISTANCE_FILTER_M,
      forceRequestLocation: true,
      showLocationDialog: false,
      useSignificantChanges: false,
    },
  )
}

export function stopGpsCollection(): void {
  if (_watchId !== null) {
    Geolocation.clearWatch(_watchId)
    _watchId = null
  }
}

export function isGpsCollecting(): boolean {
  return _watchId !== null
}
