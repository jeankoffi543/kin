import { NativeModules } from 'react-native'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'
import { DeviceStorage } from '@/lib/storage'
import type { NativeMediaItem, MediaStoreModuleInterface } from '@/types/native'

const MediaStoreModule = NativeModules.MediaStoreModule as MediaStoreModuleInterface

const BATCH_LIMIT = 300

export async function collectMedia(): Promise<number> {
  const sinceMs = DeviceStorage.getLastMediaSync()
  const items: NativeMediaItem[] = await MediaStoreModule.getMedia(sinceMs, BATCH_LIMIT)
  if (items.length === 0) return 0

  let inserted = 0
  for (const item of items) {
    const syncHash = SyncHash.media(item.path, item.media_type, item.file_size)
    const result = await executeAsync(
      `INSERT OR IGNORE INTO media
       (sync_hash, media_type, origin_app, file_name, file_size, path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        syncHash,
        item.media_type,
        item.origin_app || 'unknown',
        item.file_name,
        item.file_size,
        item.path,
      ],
    )
    if (result.rowsAffected > 0) inserted++
  }

  const latestMs = items.reduce((max, i) => Math.max(max, i.date_added_ms), sinceMs)
  DeviceStorage.setLastMediaSync(latestMs + 1)

  return inserted
}
