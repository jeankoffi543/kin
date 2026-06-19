'use client'

import type { Device } from '@/types/parent'
import type { FormState } from '@/types/api'
import { deleteDevice, updateDeviceStatus } from '@/app/actions/device-commands'
import {
  ArrowLeft,
  Check,
  Copy,
  Mic,
  Monitor,
  Phone,
  Settings,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import * as React from 'react'

interface DeviceDetailProps {
  device: Device
  onBack: () => void
}

function InfoRow({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-[12px] text-[#6b7280]">{label}</span>
      <span className={`text-[12px] font-medium text-[#111827] ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  icon: Icon,
  name,
  checked,
  onChange,
}: {
  label: string
  description: string
  icon: React.ElementType
  name: string
  checked: boolean
  onChange: (name: string, value: boolean) => void
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-[#f1f3f7]">
        <Icon className="size-4 text-[#6b7280]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#111827]">{label}</p>
        <p className="text-[11px] text-[#9ca3af]">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(name, !checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-amber-500' : 'bg-[#d1d5db]'
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  )
}

export function DeviceDetail({ device, onBack }: DeviceDetailProps) {
  const [deleting, setDeleting] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [updating, setUpdating] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = React.useState(false)

  const [settings, setSettings] = React.useState({
    call_recording_enabled: device.call_recording_enabled,
    screen_recording_enabled: device.screen_recording_enabled,
    microphone_recording_continuous: device.microphone_recording_continuous,
    microphone_recording_interval: device.microphone_recording_interval,
  })

  const online = device.updated_at
    ? Date.now() - new Date(device.updated_at).getTime() < 15 * 60 * 1000
    : false
  const displayName = device.device_name ?? device.model ?? device.uuid.slice(0, 8)

  const handleCopyUuid = async () => {
    await navigator.clipboard.writeText(device.uuid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleToggle = async (name: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [name]: value }))
    setUpdating(true)
    setMessage(null)

    const fd = new FormData()
    fd.append('device_id', String(device.id))
    fd.append(name, value ? '1' : '0')
    const result: FormState<Device> = await updateDeviceStatus({ success: false }, fd)
    setUpdating(false)

    if (result.success) {
      setMessage({ type: 'success', text: 'Paramètre mis à jour' })
    } else {
      setSettings((prev) => ({ ...prev, [name]: !value }))
      setMessage({ type: 'error', text: result.message ?? 'Erreur' })
    }
    setTimeout(() => setMessage(null), 3000)
  }

  const handleIntervalChange = async (interval: number) => {
    setSettings((prev) => ({ ...prev, microphone_recording_interval: interval }))
    setUpdating(true)

    const fd = new FormData()
    fd.append('device_id', String(device.id))
    fd.append('microphone_recording_interval', String(interval))
    const result = await updateDeviceStatus({ success: false }, fd)
    setUpdating(false)

    if (!result.success) {
      setSettings((prev) => ({
        ...prev,
        microphone_recording_interval: device.microphone_recording_interval,
      }))
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const fd = new FormData()
    fd.append('device_id', String(device.id))
    const result = await deleteDevice({ success: false }, fd)
    setDeleting(false)

    if (result.success) {
      window.location.reload()
    } else {
      setMessage({ type: 'error', text: result.message ?? 'Erreur' })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[12px] font-medium text-[#6b7280] transition-colors hover:text-[#374151]"
      >
        <ArrowLeft className="size-3.5" />
        Retour aux appareils
      </button>

      {/* Header card */}
      <div
        className="flex items-center gap-5 rounded-2xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div
          className="flex size-16 items-center justify-center rounded-2xl"
          style={{ background: online ? '#ecfdf5' : '#f1f3f7' }}
        >
          <Smartphone className="size-8" style={{ color: online ? '#10b981' : '#9ca3af' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[18px] font-bold text-[#111827]">{displayName}</h2>
          <p className="text-[13px] text-[#6b7280]">
            {[device.brand, device.model].filter(Boolean).join(' ') || '—'}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className="flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-semibold"
              style={{
                background: online ? '#ecfdf5' : '#fef2f2',
                color: online ? '#059669' : '#dc2626',
              }}
            >
              {online ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {online ? 'En ligne' : 'Hors ligne'}
            </span>
            {device.platform && (
              <span className="rounded bg-[#f1f3f7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#6b7280]">
                {device.platform}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <div
          className={`rounded-lg px-4 py-2.5 text-[12px] font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-600'
          }`}
          style={{ border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}
        >
          {message.text}
          {updating && ' (sauvegarde…)'}
        </div>
      )}

      {/* Device info */}
      <div
        className="rounded-2xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <h3 className="mb-3 text-[13px] font-bold text-[#111827]">Informations de l'appareil</h3>
        <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between py-2.5">
            <span className="text-[12px] text-[#6b7280]">UUID</span>
            <div className="flex items-center gap-2">
              <code className="font-mono text-[11px] text-[#111827]">{device.uuid}</code>
              <button
                type="button"
                onClick={handleCopyUuid}
                className="flex size-6 items-center justify-center rounded text-[#9ca3af] transition-colors hover:text-[#374151]"
              >
                {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              </button>
            </div>
          </div>
          <InfoRow label="Marque" value={device.brand} />
          <InfoRow label="Modèle" value={device.model} />
          <InfoRow label="Plateforme" value={device.platform} />
          <InfoRow label="Version OS" value={device.os_version} />
          <InfoRow label="Version app Kin" value={device.app_version} />
          <InfoRow label="Adresse IP" value={device.ip_address} mono />
          <InfoRow label="Enregistré le" value={device.created_at ? new Date(device.created_at).toLocaleString('fr-FR') : null} />
          <InfoRow label="Dernière mise à jour" value={device.updated_at ? new Date(device.updated_at).toLocaleString('fr-FR') : null} />
          <InfoRow label="Token FCM" value={device.fcm_token ? `${device.fcm_token.slice(0, 20)}…` : 'Non enregistré'} mono />
        </div>
      </div>

      {/* Settings — Point 3 */}
      <div
        className="rounded-2xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Settings className="size-4 text-[#6b7280]" />
          <h3 className="text-[13px] font-bold text-[#111827]">Paramètres de surveillance</h3>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(0,0,0,0.04)' }}>
          <ToggleRow
            label="Enregistrement des appels"
            description="Enregistre automatiquement les appels entrants et sortants"
            icon={Phone}
            name="call_recording_enabled"
            checked={settings.call_recording_enabled}
            onChange={handleToggle}
          />
          <ToggleRow
            label="Capture d'écran"
            description="Permet d'envoyer des commandes de capture d'écran à distance"
            icon={Monitor}
            name="screen_recording_enabled"
            checked={settings.screen_recording_enabled}
            onChange={handleToggle}
          />
          <ToggleRow
            label="Microphone en continu"
            description="Active l'enregistrement microphone en mode continu"
            icon={Mic}
            name="microphone_recording_continuous"
            checked={settings.microphone_recording_continuous}
            onChange={handleToggle}
          />

          {/* Mic interval */}
          <div className="py-3">
            <div className="mb-2">
              <p className="text-[13px] font-semibold text-[#111827]">Intervalle d'enregistrement micro</p>
              <p className="text-[11px] text-[#9ca3af]">
                Fréquence d'enregistrement en minutes ({settings.microphone_recording_interval} min)
              </p>
            </div>
            <div className="flex gap-2">
              {[5, 15, 30, 60, 120].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleIntervalChange(val)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                    settings.microphone_recording_interval === val
                      ? 'bg-amber-500 text-black'
                      : 'bg-[#f1f3f7] text-[#6b7280] hover:bg-[#e5e7eb]'
                  }`}
                >
                  {val < 60 ? `${val}min` : `${val / 60}h`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-2xl bg-white p-6 shadow-sm"
        style={{ border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <h3 className="mb-2 text-[13px] font-bold text-red-600">Zone dangereuse</h3>
        <p className="mb-4 text-[12px] text-[#6b7280]">
          Supprimer cet appareil retirera toutes les données de télémétrie et les règles associées. Cette action est irréversible.
        </p>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] font-bold text-red-600 transition-colors hover:bg-red-100"
            style={{ border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <Trash2 className="size-3.5" />
            Supprimer cet appareil
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {deleting ? 'Suppression…' : 'Confirmer la suppression'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-[12px] font-medium text-[#6b7280] hover:text-[#374151]"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
