import { open, type OPSQLiteConnection } from '@op-engineering/op-sqlite'

let _connection: OPSQLiteConnection | null = null

export function getDb(): OPSQLiteConnection {
  if (!_connection) {
    _connection = open({ name: 'kin_device.db' })
  }
  return _connection
}

export function closeDb(): void {
  if (_connection) {
    _connection.close()
    _connection = null
  }
}

export async function executeAsync(
  sql: string,
  params: (string | number | boolean | null)[] = [],
): Promise<{ rows: Record<string, unknown>[]; insertId?: number; rowsAffected: number }> {
  const db = getDb()
  const result = await db.executeAsync(sql, params)
  return {
    rows: (result.rows ?? []) as Record<string, unknown>[],
    insertId: result.insertId,
    rowsAffected: result.rowsAffected,
  }
}

export function executeSync(
  sql: string,
  params: (string | number | boolean | null)[] = [],
): { rows: Record<string, unknown>[]; insertId?: number; rowsAffected: number } {
  const db = getDb()
  const result = db.execute(sql, params)
  return {
    rows: (result.rows ?? []) as Record<string, unknown>[],
    insertId: result.insertId,
    rowsAffected: result.rowsAffected,
  }
}
