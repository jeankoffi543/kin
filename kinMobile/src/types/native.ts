// Types des valeurs retournées par les modules natifs Kotlin (bridge RN ↔ Android)

// ── Phase 2 ───────────────────────────────────────────────────────────────────

export type NativeCallRecord = {
  phone_number: string
  contact_name: string | null
  call_type: 'incoming' | 'outgoing' | 'missed'
  duration: number
  date: number // Unix ms timestamp
}

export type NativeSmsRecord = {
  native_id: number
  address: string
  body: string
  type: 'inbox' | 'sent'
  raw_type: number
  date: number // Unix ms timestamp
}

export type NativeInstalledApp = {
  app_name: string
  package_name: string
  installed_at: string // ISO 8601
}

export interface CallLogModuleInterface {
  getCallLogs(limit: number, sinceTimestamp: number): Promise<NativeCallRecord[]>
}

export interface SmsModuleInterface {
  getMessages(limit: number, sinceTimestamp: number): Promise<NativeSmsRecord[]>
  getCurrentIds(): Promise<number[]>
  getTypeDistribution(): Promise<Record<string, number>>
  startObserver(): Promise<boolean>
  stopObserver(): Promise<boolean>
}

export interface PackageModuleInterface {
  getInstalledApps(): Promise<NativeInstalledApp[]>
}

// ── Phase 4 ───────────────────────────────────────────────────────────────────

export type NativeNotificationEvent = {
  package_name: string
  title: string
  body: string
  timestamp: number // Unix ms
}

export type NativeAppUsage = {
  package_name: string
  total_time_ms: number
  last_time_used: string // ISO 8601
  first_time_stamp: string // ISO 8601
}

export type NativeMediaItem = {
  media_type: 'image' | 'video' | 'audio'
  file_name: string
  file_size: number
  path: string
  origin_app: string
  date_added_iso: string // ISO 8601
  date_added_ms: number // Unix ms
}

export type NativeGeofenceEvent = {
  geofence_id: string // stringified server ID
  event_type: 'enter' | 'exit'
  latitude: number
  longitude: number
  timestamp: number // Unix ms
}

export interface NotificationModuleInterface {
  isNotificationListenerEnabled(): Promise<boolean>
  openNotificationListenerSettings(): Promise<boolean>
}

export interface UsageStatsModuleInterface {
  hasPermission(): Promise<boolean>
  openUsageAccessSettings(): Promise<boolean>
  getAppUsage(sinceTimestamp: number): Promise<NativeAppUsage[]>
}

export interface MediaStoreModuleInterface {
  getMedia(sinceTimestamp: number, limit: number): Promise<NativeMediaItem[]>
}

export interface GeofenceModuleInterface {
  addGeofence(id: string, latitude: number, longitude: number, radiusMeters: number): Promise<boolean>
  removeGeofence(id: string): Promise<boolean>
  removeAllGeofences(): Promise<boolean>
}

// ── Phase 5 ───────────────────────────────────────────────────────────────────

export interface ScreenCaptureModuleInterface {
  requestProjection(): Promise<boolean>
  hasProjection(): Promise<boolean>
  takeScreenshot(): Promise<string>
  startRecording(durationMs: number): Promise<string>
  stopRecording(): Promise<string>
  releaseProjection(): Promise<boolean>
}

export interface AudioRecorderModuleInterface {
  startRecording(durationSeconds: number): Promise<string>
  stopRecording(): Promise<string>
  isRecording(): Promise<boolean>
}

export interface CallBlockerModuleInterface {
  setBlockedNumbers(numbers: string[]): Promise<number>
  startBlocking(): Promise<boolean>
  stopBlocking(): Promise<boolean>
  isBlocking(): Promise<boolean>
}

export interface AppBlockerModuleInterface {
  setBlockedApps(packages: string[]): Promise<number>
  startMonitoring(): Promise<boolean>
  stopMonitoring(): Promise<boolean>
  isMonitoring(): Promise<boolean>
  getForegroundApp(): Promise<string | null>
}

export type NativeCallBlockedEvent = {
  phone_number: string
  timestamp: number
}

export type NativeAppBlockedEvent = {
  package_name: string
  timestamp: number
}
