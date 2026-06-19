import { NativeModules } from 'react-native'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'
import { DeviceStorage } from '@/lib/storage'
import type { CallLogModuleInterface, NativeCallRecord } from '@/types/native'

const CallLogModule = NativeModules.CallLogModule as CallLogModuleInterface

const BATCH_LIMIT = 500
const MAX_ITERATIONS = 20

function tsToIso(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

export async function collectCallLogs(): Promise<number> {
  let totalInserted = 0
  let iteration = 0

  while (iteration < MAX_ITERATIONS) {
    const sinceMs = DeviceStorage.getLastCallLogSync()
    let records: NativeCallRecord[]
    try {
      records = await CallLogModule.getCallLogs(BATCH_LIMIT, sinceMs)
    } catch (err) {
      console.warn('[CallLogCollector] Native getCallLogs failed:', err)
      break
    }

    if (records.length === 0) break

    let inserted = 0
    for (const r of records) {
      const syncHash = SyncHash.call(r.phone_number, r.call_type, r.date)
      const isoDate = tsToIso(r.date)
      const result = await executeAsync(
        `INSERT OR IGNORE INTO calls
         (sync_hash, phone_number, contact_name, call_type, duration, recorded_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [syncHash, r.phone_number, r.contact_name ?? null, r.call_type, r.duration, isoDate],
      )
      if (result.rowsAffected > 0) {
        inserted++
      } else {
        await executeAsync(
          `UPDATE calls SET recorded_at = ?, local_status = 'pending' WHERE sync_hash = ? AND local_status = 'completed'`,
          [isoDate, syncHash],
        )
      }
    }

    const latestTs = records.reduce((max, r) => Math.max(max, r.date), sinceMs)
    DeviceStorage.setLastCallLogSync(latestTs + 1)
    totalInserted += inserted
    iteration++

    if (records.length < BATCH_LIMIT) break
  }

  if (totalInserted > 0) {
    console.log(`[CallLogCollector] Collected ${totalInserted} calls in ${iteration + 1} batch(es)`)
  }

  return totalInserted
}
