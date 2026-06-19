import { getDb } from './database'
import { executeAsync } from './database'
import { ALL_MIGRATIONS } from './schema'

function migrationKey(sql: string, index: number): string {
  const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)
  if (createMatch) return `v1_create_${createMatch[1]}`
  return `migration_${index}`
}

async function safeAddColumn(table: string, column: string, def: string): Promise<void> {
  try {
    await executeAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`)
  } catch {
    // column already exists — ignore
  }
}

export async function runMigrations(): Promise<void> {
  const db = getDb()

  db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      statement  TEXT    NOT NULL UNIQUE,
      ran_at     TEXT    NOT NULL
    );
  `)

  const result = db.execute('SELECT statement FROM _migrations')
  const ran = result.rows ?? []
  const ranSet = new Set(ran.map((r: Record<string, unknown>) => r.statement as string))

  for (let i = 0; i < ALL_MIGRATIONS.length; i++) {
    const sql = ALL_MIGRATIONS[i]
    const key = migrationKey(sql, i)
    if (ranSet.has(key)) continue

    db.execute(sql)
    db.execute('INSERT OR IGNORE INTO _migrations (statement, ran_at) VALUES (?, ?)', [
      key,
      new Date().toISOString(),
    ])
  }

  await safeAddColumn('sms', 'sms_status', "TEXT NOT NULL DEFAULT 'received'")
  await safeAddColumn('sms', 'native_id', 'INTEGER')

  // v6: purge calls to force re-collection with recorded_at from content provider
  const v6Key = 'v6_purge_calls_for_recorded_at'
  if (!ranSet.has(v6Key)) {
    try {
      await executeAsync('DELETE FROM calls')
      console.log('[Migrations] v6: purged calls table for re-collection with recorded_at')
    } catch { /* empty table is fine */ }
    db.execute('INSERT OR IGNORE INTO _migrations (statement, ran_at) VALUES (?, ?)', [
      v6Key,
      new Date().toISOString(),
    ])
  }
}
