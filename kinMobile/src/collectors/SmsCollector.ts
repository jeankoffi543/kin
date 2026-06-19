import { NativeModules, NativeEventEmitter } from 'react-native'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'
import { DeviceStorage } from '@/lib/storage'
import type { NativeSmsRecord, SmsModuleInterface } from '@/types/native'

const SmsModule = NativeModules.SmsModule as SmsModuleInterface
const smsEmitter = new NativeEventEmitter(NativeModules.SmsModule)

const BATCH_LIMIT = 1000
const MAX_ITERATIONS = 50

function tsToIso(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

function rawTypeToStatus(rawType: number | undefined, fallbackType: string): string {
  if (rawType != null) {
    switch (rawType) {
      case 1: return 'received'
      case 2: return 'delivered'
      case 3: return 'draft'
      case 4: return 'sending'
      case 5: return 'failed'
      case 6: return 'queued'
    }
  }
  return fallbackType === 'sent' ? 'delivered' : 'received'
}

export async function collectSms(): Promise<number> {
  try {
    const dist = await SmsModule.getTypeDistribution()
    console.log('[SmsCollector] ContentProvider type distribution:', JSON.stringify(dist))
  } catch { /* ignore */ }

  let totalInserted = 0
  let iteration = 0
  const statusCounts: Record<string, number> = {}

  while (iteration < MAX_ITERATIONS) {
    const sinceMs = DeviceStorage.getLastSmsSync()
    let records: NativeSmsRecord[]
    try {
      records = await SmsModule.getMessages(BATCH_LIMIT, sinceMs)
    } catch (err) {
      console.warn('[SmsCollector] Native getMessages failed:', err)
      break
    }

    if (records.length === 0) break

    let inserted = 0
    for (const r of records) {
      const isoDate = tsToIso(r.date)
      const syncHash = SyncHash.sms(r.address, r.type, isoDate, r.body)
      const smsStatus = rawTypeToStatus(r.raw_type, r.type)
      statusCounts[smsStatus] = (statusCounts[smsStatus] ?? 0) + 1
      const result = await executeAsync(
        `INSERT OR IGNORE INTO sms (sync_hash, address, body, type, date, sms_status, native_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [syncHash, r.address, r.body, r.type, isoDate, smsStatus, r.native_id],
      )
      if (result.rowsAffected > 0) {
        inserted++
      } else {
        await executeAsync(
          `UPDATE sms SET sms_status = ?, native_id = ?, local_status = CASE WHEN sms_status != ? THEN 'pending' ELSE local_status END WHERE sync_hash = ?`,
          [smsStatus, r.native_id, smsStatus, syncHash],
        )
      }
    }

    const latestTs = records.reduce((max, r) => Math.max(max, r.date), sinceMs)
    DeviceStorage.setLastSmsSync(latestTs + 1)
    totalInserted += inserted
    iteration++

    if (records.length < BATCH_LIMIT) break
  }

  if (totalInserted > 0 || Object.keys(statusCounts).length > 0) {
    console.log(`[SmsCollector] ${iteration} batch(es): ${totalInserted} new, statuses:`, JSON.stringify(statusCounts))
  }

  return totalInserted
}

export async function detectSmsDeleted(): Promise<number> {
  let currentIds: number[]
  try {
    currentIds = await SmsModule.getCurrentIds()
  } catch (err) {
    console.warn('[SmsCollector] getCurrentIds failed:', err)
    return 0
  }

  const currentIdSet = new Set(currentIds)

  const result = await executeAsync(
    `SELECT id, native_id FROM sms WHERE deleted_at_source = 0 AND native_id IS NOT NULL`,
    [],
  )
  const rows = result.rows as Array<{ id: number; native_id: number }>

  let marked = 0
  for (const row of rows) {
    if (!currentIdSet.has(row.native_id)) {
      await executeAsync(
        `UPDATE sms SET deleted_at_source = 1, local_status = 'pending' WHERE id = ?`,
        [row.id],
      )
      marked++
    }
  }

  if (marked > 0) {
    console.log(`[SmsCollector] Detected ${marked} deleted SMS`)
  }

  return marked
}

let _observerStarted = false
let _observerCallback: (() => void) | null = null

export function startSmsObserver(onContentChanged: () => void): void {
  if (_observerStarted) return
  _observerStarted = true
  _observerCallback = onContentChanged

  smsEmitter.addListener('onSmsContentChanged', () => {
    console.log('[SmsCollector] ContentObserver: SMS content changed')
    _observerCallback?.()
  })

  SmsModule.startObserver().catch((err: unknown) => {
    console.warn('[SmsCollector] startObserver failed:', err)
  })
}

export function stopSmsObserver(): void {
  if (!_observerStarted) return
  _observerStarted = false
  _observerCallback = null
  smsEmitter.removeAllListeners('onSmsContentChanged')
  SmsModule.stopObserver().catch(() => undefined)
}
