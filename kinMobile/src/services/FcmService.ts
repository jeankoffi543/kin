import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging'
import { ToastAndroid, Platform } from 'react-native'
import { deviceApi } from '@/lib/api'
import { SyncStore } from '@/lib/sync-store'
import { DeviceStorage } from '@/lib/storage'

let _backgroundRegistered = false
let _foregroundRegistered = false
let _retryInterval: ReturnType<typeof setInterval> | null = null

function showSyncToast(msg: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.LONG)
  }
}

async function reportSyncStatus(status: 'syncing' | 'idle'): Promise<void> {
  try {
    await deviceApi.post('/device/sync-status', { status })
  } catch { /* non-blocking */ }
}

async function handlePush(data?: Record<string, string>): Promise<void> {
  if (!DeviceStorage.isRegistered()) return
  const { CollectorEngine } = await import('@/services/CollectorEngine')
  const { SyncEngine } = await import('@/services/SyncEngine')
  const { CommandService } = await import('@/services/CommandService')

  if (data?.type === 'force_sync_reset') {
    showSyncToast('Kin - Réinitialisation du verrou...')
    SyncEngine.forceReleaseLock()
  }

  showSyncToast('Kin - Synchronisation demandée par le parent...')
  await reportSyncStatus('syncing')

  try {
    if (CollectorEngine.isRunning()) await CollectorEngine.refresh()
    else await CollectorEngine.start()
  } catch (err) {
    console.warn('[FcmService] Collector failed:', err)
  }

  try {
    const result = await SyncEngine.sync()
    if (result.success) showSyncToast(`Kin - Sync terminée (${result.totalSent} envoyés)`)
  } catch (err) {
    console.warn('[FcmService] Sync failed:', err)
  }

  await reportSyncStatus('idle')
  CommandService.pollAndExecute().catch(() => undefined)
}

async function sendTokenToServer(token: string): Promise<void> {
  SyncStore.setFcmToken(token)
  if (!DeviceStorage.isRegistered()) return
  try {
    await deviceApi.post('/device/fcm-token', { token })
    console.log('[FcmService] Token sent to API')
  } catch (err) {
    console.warn('[FcmService] Failed to send token:', err)
  }
}

async function tryGetToken(): Promise<string | null> {
  try {
    const messaging = getMessaging()
    const token = await getToken(messaging)
    return token || null
  } catch {
    return null
  }
}

function startBackgroundRetry(): void {
  if (_retryInterval) return
  _retryInterval = setInterval(async () => {
    const token = await tryGetToken()
    if (token) {
      if (_retryInterval) { clearInterval(_retryInterval); _retryInterval = null }
      console.log('[FcmService] Token obtained via retry:', token.slice(0, 20) + '...')
      await sendTokenToServer(token)
    }
  }, 15_000)
}

export const FcmService = {
  async initialize(): Promise<void> {
    // 1. Register push handlers
    if (!_backgroundRegistered) {
      _backgroundRegistered = true
      try {
        setBackgroundMessageHandler(getMessaging(), async (msg: RemoteMessage) => {
          await handlePush(msg.data as Record<string, string> | undefined)
        })
      } catch { /* ignore */ }
    }

    if (!_foregroundRegistered) {
      _foregroundRegistered = true
      try {
        onMessage(getMessaging(), async (msg: RemoteMessage) => {
          console.log('[FcmService] Push received', msg.data?.type)
          await handlePush(msg.data as Record<string, string> | undefined)
        })
      } catch { /* ignore */ }
    }

    // 2. Auto-capture token refresh
    try {
      onTokenRefresh(getMessaging(), async (token: string) => {
        console.log('[FcmService] Token refreshed')
        if (_retryInterval) { clearInterval(_retryInterval); _retryInterval = null }
        await sendTokenToServer(token)
      })
    } catch { /* ignore */ }

    // 3. Get token — same simple call that worked before
    const token = await tryGetToken()
    if (token) {
      console.log('[FcmService] Token:', token.slice(0, 20) + '...')
      await sendTokenToServer(token)
    } else {
      console.log('[FcmService] Token not ready, starting background retry')
      startBackgroundRetry()
    }
  },

  async sendTokenToApi(): Promise<void> {
    const stored = SyncStore.getFcmToken()
    if (stored) {
      await sendTokenToServer(stored)
      return
    }
    const token = await tryGetToken()
    if (token) {
      await sendTokenToServer(token)
    } else {
      startBackgroundRetry()
    }
  },

  getToken(): string | null {
    return SyncStore.getFcmToken()
  },
}
