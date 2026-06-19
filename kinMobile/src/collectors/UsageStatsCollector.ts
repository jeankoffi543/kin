import { NativeModules } from 'react-native'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'
import { DeviceStorage } from '@/lib/storage'
import type { NativeAppUsage, UsageStatsModuleInterface } from '@/types/native'

const UsageStatsModule = NativeModules.UsageStatsModule as UsageStatsModuleInterface

// Known browser package names — their usage is stored in browser_history channel
const BROWSER_PACKAGES = new Set([
  'com.android.chrome',
  'org.mozilla.firefox',
  'com.microsoft.emmx',
  'com.opera.browser',
  'com.brave.browser',
  'com.sec.android.app.sbrowser', // Samsung Browser
])

export async function hasUsageStatsPermission(): Promise<boolean> {
  return UsageStatsModule.hasPermission()
}

export async function openUsageAccessSettings(): Promise<void> {
  await UsageStatsModule.openUsageAccessSettings()
}

export async function collectUsageStats(): Promise<number> {
  const since = DeviceStorage.getLastUsageStatsSync()
  const records: NativeAppUsage[] = await UsageStatsModule.getAppUsage(since)
  if (records.length === 0) return 0

  let inserted = 0

  for (const r of records) {
    if (BROWSER_PACKAGES.has(r.package_name)) {
      // Store browser app usage as browser_history with synthetic URL
      const syntheticUrl = `appusage://${r.package_name}`
      const syncHash = SyncHash.browserHistory(syntheticUrl, r.last_time_used)
      const result = await executeAsync(
        `INSERT OR IGNORE INTO browser_history (sync_hash, url, title, visited_at)
         VALUES (?, ?, ?, ?)`,
        [syncHash, syntheticUrl, r.package_name, r.last_time_used],
      )
      if (result.rowsAffected > 0) inserted++
    }
  }

  const latestTs = records.reduce(
    (max, r) => Math.max(max, new Date(r.last_time_used).getTime()),
    since,
  )
  DeviceStorage.setLastUsageStatsSync(latestTs + 1)

  return inserted
}
