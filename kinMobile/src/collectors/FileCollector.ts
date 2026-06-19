import RNFS, { type ReadDirItem } from 'react-native-fs'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'
import { DeviceStorage } from '@/lib/storage'

const SCAN_DIRS = [
  'DCIM/Camera',
  'Download',
  'Documents',
  'Pictures/Screenshots',
  'Pictures',
  'Movies',
  'Music',
]

// Max files per directory per collection pass
const MAX_PER_DIR = 100

async function scanDirectory(
  dirPath: string,
  sinceMtime: number,
): Promise<ReadDirItem[]> {
  try {
    const items = await RNFS.readDir(dirPath)
    return items.filter(
      item =>
        item.isFile() &&
        item.mtime !== undefined &&
        item.mtime.getTime() > sinceMtime,
    )
  } catch {
    // Directory may not exist on this device
    return []
  }
}

export async function collectFiles(): Promise<number> {
  const externalBase = RNFS.ExternalStorageDirectoryPath
  const sinceMs = DeviceStorage.getLastFileSync()
  let inserted = 0

  for (const relDir of SCAN_DIRS) {
    const fullPath = `${externalBase}/${relDir}`
    const items = await scanDirectory(fullPath, sinceMs)

    // Sort by mtime desc, take most recent MAX_PER_DIR
    const sorted = items
      .sort((a, b) => (b.mtime?.getTime() ?? 0) - (a.mtime?.getTime() ?? 0))
      .slice(0, MAX_PER_DIR)

    for (const item of sorted) {
      const syncHash = SyncHash.file(item.path, item.size)
      const createdAt = item.mtime ? item.mtime.toISOString() : null
      const result = await executeAsync(
        `INSERT OR IGNORE INTO files
         (sync_hash, path, file_name, file_size, is_directory, file_created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [syncHash, item.path, item.name, item.size, createdAt],
      )
      if (result.rowsAffected > 0) inserted++
    }
  }

  DeviceStorage.setLastFileSync(Date.now())
  return inserted
}
