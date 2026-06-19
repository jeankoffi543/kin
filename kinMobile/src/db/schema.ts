// SQL DDL — reflète exactement les colonnes attendues par DeviceSyncRequest

export const CREATE_TABLE_CALLS = `
CREATE TABLE IF NOT EXISTS calls (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  phone_number      TEXT    NOT NULL,
  contact_name      TEXT,
  call_type         TEXT    NOT NULL,
  duration          INTEGER NOT NULL DEFAULT 0,
  call_recorded     INTEGER NOT NULL DEFAULT 0,
  recording_path    TEXT,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending',
  recorded_at       TEXT    NOT NULL
);`

export const CREATE_TABLE_SMS = `
CREATE TABLE IF NOT EXISTS sms (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  address           TEXT    NOT NULL,
  body              TEXT    NOT NULL,
  type              TEXT    NOT NULL,
  date              TEXT    NOT NULL,
  sms_status        TEXT    NOT NULL DEFAULT 'received',
  native_id         INTEGER,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_CONTACTS = `
CREATE TABLE IF NOT EXISTS contacts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  name              TEXT    NOT NULL,
  phone_number      TEXT    NOT NULL,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_NOTIFICATIONS = `
CREATE TABLE IF NOT EXISTS notifications (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  package_name      TEXT    NOT NULL,
  title             TEXT,
  body              TEXT,
  date              TEXT    NOT NULL,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_GPS_LOCATIONS = `
CREATE TABLE IF NOT EXISTS gps_locations (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  latitude          REAL    NOT NULL,
  longitude         REAL    NOT NULL,
  altitude          REAL,
  accuracy          REAL,
  recorded_at       TEXT    NOT NULL,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_GEOFENCE_ALERTS = `
CREATE TABLE IF NOT EXISTS geofence_alerts (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  geofence_id       INTEGER NOT NULL,
  event_type        TEXT    NOT NULL,
  latitude          REAL    NOT NULL,
  longitude         REAL    NOT NULL,
  triggered_at      TEXT    NOT NULL,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_SOCIAL_MESSAGES = `
CREATE TABLE IF NOT EXISTS social_messages (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  platform          TEXT    NOT NULL,
  sender_name       TEXT    NOT NULL,
  message           TEXT    NOT NULL,
  date              TEXT    NOT NULL,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_BROWSER_HISTORY = `
CREATE TABLE IF NOT EXISTS browser_history (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  url               TEXT    NOT NULL,
  title             TEXT,
  visited_at        TEXT    NOT NULL,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_INSTALLED_APPS = `
CREATE TABLE IF NOT EXISTS installed_apps (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  app_name          TEXT    NOT NULL,
  package_name      TEXT    NOT NULL,
  installed_at      TEXT,
  is_blocked        INTEGER NOT NULL DEFAULT 0,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_FILES = `
CREATE TABLE IF NOT EXISTS files (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  path              TEXT    NOT NULL,
  file_name         TEXT    NOT NULL,
  file_size         INTEGER NOT NULL DEFAULT 0,
  is_directory      INTEGER NOT NULL DEFAULT 0,
  file_created_at   TEXT,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const CREATE_TABLE_MEDIA = `
CREATE TABLE IF NOT EXISTS media (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_hash         TEXT    NOT NULL UNIQUE,
  media_type        TEXT    NOT NULL,
  origin_app        TEXT    NOT NULL,
  file_name         TEXT    NOT NULL,
  file_size         INTEGER NOT NULL DEFAULT 0,
  path              TEXT    NOT NULL,
  deleted_at_source INTEGER NOT NULL DEFAULT 0,
  local_status      TEXT    NOT NULL DEFAULT 'pending'
);`

export const ALL_MIGRATIONS: readonly string[] = [
  CREATE_TABLE_CALLS,
  CREATE_TABLE_SMS,
  CREATE_TABLE_CONTACTS,
  CREATE_TABLE_NOTIFICATIONS,
  CREATE_TABLE_GPS_LOCATIONS,
  CREATE_TABLE_GEOFENCE_ALERTS,
  CREATE_TABLE_SOCIAL_MESSAGES,
  CREATE_TABLE_BROWSER_HISTORY,
  CREATE_TABLE_INSTALLED_APPS,
  CREATE_TABLE_FILES,
  CREATE_TABLE_MEDIA,
]

// Noms des tables utilisés par le SyncEngine pour construire le payload
export const CHANNEL_TABLE_MAP = {
  calls: 'calls',
  sms: 'sms',
  contacts: 'contacts',
  notifications: 'notifications',
  gps_locations: 'gps_locations',
  geofence_alerts: 'geofence_alerts',
  social_messages: 'social_messages',
  browser_history: 'browser_history',
  installed_apps: 'installed_apps',
  files: 'files',
  media: 'media',
} as const

export type ChannelName = keyof typeof CHANNEL_TABLE_MAP
