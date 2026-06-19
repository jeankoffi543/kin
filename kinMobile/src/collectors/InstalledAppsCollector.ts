import { NativeModules } from 'react-native'
import { executeAsync } from '@/db/database'
import { SyncHash } from '@/lib/crypto'
import type { NativeInstalledApp, PackageModuleInterface } from '@/types/native'

const PackageModule = NativeModules.PackageModule as PackageModuleInterface

export async function collectInstalledApps(): Promise<number> {
  const apps: NativeInstalledApp[] = await PackageModule.getInstalledApps()
  if (apps.length === 0) return 0

  let inserted = 0
  for (const app of apps) {
    const syncHash = SyncHash.installedApp(app.package_name, app.installed_at)
    const result = await executeAsync(
      `INSERT OR IGNORE INTO installed_apps (sync_hash, app_name, package_name, installed_at)
       VALUES (?, ?, ?, ?)`,
      [syncHash, app.app_name, app.package_name, app.installed_at],
    )
    if (result.rowsAffected > 0) inserted++
  }
  return inserted
}
