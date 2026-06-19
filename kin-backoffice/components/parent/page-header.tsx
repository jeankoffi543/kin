'use client'

import { useDevice } from '@/contexts/device-context'
import { forceDeviceSync, forceSyncReset } from '@/app/actions/device-commands'
import { usePathname } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import * as React from 'react'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': "Vue d'ensemble",
  '/telephony': 'Téléphonie',
  '/messaging': 'Messageries',
  '/notifications': 'Notifications interceptées',
  '/location': 'Localisation',
  '/activity': 'Activité Numérique',
  '/live-action': 'Live Action',
  '/support': 'Support Client',
  '/devices': 'Appareils',
}

function isOnline(updatedAt: string | null): boolean {
  if (!updatedAt) return false
  return Date.now() - new Date(updatedAt).getTime() < 15 * 60 * 1000
}

const SYNC_TIMEOUT = 30_000
const POLL_INTERVAL = 3_000

export function PageHeader() {
  const pathname = usePathname()
  const { activeDevice } = useDevice()
  const queryClient = useQueryClient()
  const [pushing, setPushing] = React.useState(false)
  const [showLockDialog, setShowLockDialog] = React.useState(false)
  const pollRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const title = PAGE_TITLES[pathname] ?? "Vue d'ensemble"
  const deviceLabel = activeDevice?.device_name ?? activeDevice?.model ?? 'Appareil'
  const online = isOnline(activeDevice?.updated_at ?? null)
  const deviceSyncing = activeDevice?.sync_status === 'syncing'

  const spinning = pushing || deviceSyncing

  // Poll device status while syncing to reflect real-time state
  React.useEffect(() => {
    if (deviceSyncing && !pollRef.current) {
      pollRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['devices'] })
      }, POLL_INTERVAL)
    }
    if (!deviceSyncing && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
      // Refresh all data when sync completes
      queryClient.invalidateQueries()
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [deviceSyncing, queryClient])

  // Timeout: release spinner after 30s if stuck
  React.useEffect(() => {
    if (pushing) {
      timeoutRef.current = setTimeout(() => {
        setPushing(false)
        toast.warning('Timeout — le mobile n\'a pas répondu dans les 30 secondes')
      }, SYNC_TIMEOUT)
    } else {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    }
    return () => {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    }
  }, [pushing])

  const handleSync = async () => {
    if (!activeDevice || pushing) return

    // Refresh to get latest sync_status
    await queryClient.invalidateQueries({ queryKey: ['devices'] })

    // If device is already syncing, show dialog
    if (activeDevice.sync_status === 'syncing') {
      setShowLockDialog(true)
      return
    }

    setPushing(true)
    const result = await forceDeviceSync(activeDevice.id)
    if (result.success) {
      toast.success('Ordre de synchronisation envoyé')
    } else {
      toast.warning('Push FCM non envoyé')
      setPushing(false)
    }
    // pushing stays true until timeout or deviceSyncing changes to idle
  }

  // Release pushing state when device transitions from syncing to idle
  React.useEffect(() => {
    if (pushing && !deviceSyncing) {
      // Give a small delay for the data to settle
      const t = setTimeout(() => setPushing(false), 2000)
      return () => clearTimeout(t)
    }
  }, [pushing, deviceSyncing])

  const handleForceReset = async () => {
    if (!activeDevice) return
    setShowLockDialog(false)
    setPushing(true)

    await forceSyncReset(activeDevice.id)
    toast.info('Verrou réinitialisé')

    const result = await forceDeviceSync(activeDevice.id)
    if (result.success) {
      toast.success('Synchronisation forcée envoyée')
    } else {
      setPushing(false)
    }
  }

  return (
    <header
      className="relative flex h-14 shrink-0 items-center justify-between border-b bg-white px-6"
      style={{ borderColor: 'rgba(0,0,0,0.07)' }}
    >
      <div className="min-w-0">
        <h1 className="truncate text-[13px] font-bold text-[#111827]">{title}</h1>
        <p className="text-[11px] text-[#9ca3af]">
          {deviceLabel} · {activeDevice?.platform ?? '—'}
          {activeDevice?.updated_at
            ? ` · MAJ ${new Date(activeDevice.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
            : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {activeDevice && (
          <button
            type="button"
            onClick={handleSync}
            disabled={pushing}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all hover:bg-[#f1f3f7] hover:text-[#374151] disabled:cursor-not-allowed"
            style={{
              border: spinning ? '1px solid #f59e0b' : '1px solid #e5e7eb',
              color: spinning ? '#f59e0b' : '#6b7280',
              background: spinning ? '#fffbeb' : 'transparent',
            }}
          >
            {spinning ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
            {pushing ? 'Envoi…' : deviceSyncing ? 'Sync mobile…' : 'Synchroniser'}
          </button>
        )}

        {activeDevice && (
          <span
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold"
            style={{
              background: online ? '#ecfdf5' : '#fef2f2',
              color: online ? '#059669' : '#dc2626',
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ background: online ? '#10b981' : '#ef4444' }}
            />
            {online ? 'En ligne' : 'Hors ligne'}
          </span>
        )}

        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
          style={{ background: '#1f2937' }}
        >
          {deviceLabel.slice(0, 2).toUpperCase()}
        </div>
      </div>

      {showLockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowLockDialog(false)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
                <AlertTriangle className="size-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[#111827]">Synchronisation en cours</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b7280]">
                  L'appareil de l'enfant est déjà en train de synchroniser des données.
                  Forcer une nouvelle tentative peut surcharger l'appareil.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLockDialog(false)}
                className="rounded-lg px-4 py-2 text-[12px] font-semibold text-[#6b7280] hover:bg-[#f1f3f7]"
                style={{ border: '1px solid #e5e7eb' }}
              >
                Attendre
              </button>
              <button
                type="button"
                onClick={handleForceReset}
                className="rounded-lg bg-amber-500 px-4 py-2 text-[12px] font-semibold text-white hover:bg-amber-600"
              >
                Forcer la demande
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
