'use server'

import type { FormState } from '@/types/api'
import type { CommandType, Device } from '@/types/parent'
import { parentFetch } from '@/lib/api'
import crypto from 'node:crypto'

// ── Force sync ───────────────────────────────────────────────────────────────

export async function forceDeviceSync(deviceId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}/force-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { success: false, message: (body as { message?: string }).message ?? 'Erreur' }
    }

    return { success: true, message: 'Synchronisation demandée.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

// ── Force sync lock reset ────────────────────────────────────────────────────

export async function forceSyncReset(deviceId: number): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}/force-sync-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { success: false, message: (body as { message?: string }).message ?? 'Erreur' }
    }

    return { success: true, message: 'Verrou réinitialisé.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

// ── Device lifecycle ─────────────────────────────────────────────────────────

export async function registerDevice(
  _state: FormState<Device>,
  formData: FormData,
): Promise<FormState<Device>> {
  const deviceName = formData.get('device_name') as string
  const uuid = formData.get('uuid') as string | null

  const finalUuid = uuid?.trim() || crypto.randomUUID()

  if (!deviceName?.trim()) {
    return { success: false, message: 'Le nom de l\'appareil est requis.' }
  }

  try {
    const res = await parentFetch('/api/user/devices/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuid: finalUuid,
        device_name: deviceName.trim(),
        platform: (formData.get('platform') as string) || undefined,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        status: res.status,
        message: (body as { message?: string }).message ?? 'Erreur lors de l\'enregistrement.',
        errors: (body as { errors?: Record<string, string[]> }).errors,
      }
    }

    const body = await res.json() as { data: Device }
    return { success: true, data: body.data, message: 'Appareil enregistré.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

export async function deleteDevice(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const deviceId = formData.get('device_id') as string
  if (!deviceId) return { success: false, message: 'ID manquant.' }

  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        message: (body as { message?: string }).message ?? 'Erreur lors de la suppression.',
      }
    }

    return { success: true, message: 'Appareil supprimé.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

export async function updateDeviceStatus(
  _state: FormState<Device>,
  formData: FormData,
): Promise<FormState<Device>> {
  const deviceId = formData.get('device_id') as string
  if (!deviceId) return { success: false, message: 'ID manquant.' }

  const payload: Record<string, unknown> = {}
  const boolFields = [
    'call_recording_enabled',
    'microphone_recording_continuous',
    'screen_recording_enabled',
  ]
  for (const key of boolFields) {
    const val = formData.get(key)
    if (val !== null) payload[key] = val === 'true' || val === '1'
  }
  const interval = formData.get('microphone_recording_interval')
  if (interval !== null) payload.microphone_recording_interval = Number(interval)

  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        status: res.status,
        message: (body as { message?: string }).message ?? 'Erreur.',
        errors: (body as { errors?: Record<string, string[]> }).errors,
      }
    }

    const body = await res.json() as { data: Device }
    return { success: true, data: body.data, message: 'Paramètres mis à jour.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

// ── C2 Commands ──────────────────────────────────────────────────────────────

export async function sendCommand(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const deviceId = formData.get('device_id') as string
  const commandType = formData.get('command_type') as CommandType
  const durationSeconds = formData.get('duration_seconds') as string | null

  if (!deviceId || !commandType) {
    return { success: false, message: 'Paramètres manquants.' }
  }

  const parameters: Record<string, unknown> = {}
  if (durationSeconds) {
    parameters.duration_seconds = Number(durationSeconds)
  }

  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command_type: commandType, parameters }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        status: res.status,
        message: (body as { message?: string }).message ?? 'Erreur lors de l\'envoi de la commande.',
        errors: (body as { errors?: Record<string, string[]> }).errors,
      }
    }

    return { success: true, message: 'Commande envoyée.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

export async function storeRestriction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const deviceId = formData.get('device_id') as string
  const ruleType = formData.get('rule_type') as string
  const parameters = formData.get('parameters') as string

  if (!deviceId || !ruleType) {
    return { success: false, message: 'Paramètres manquants.' }
  }

  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}/restrictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rule_type: ruleType,
        is_enabled: true,
        parameters: parameters ? JSON.parse(parameters) : {},
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        status: res.status,
        message: (body as { message?: string }).message ?? 'Erreur.',
        errors: (body as { errors?: Record<string, string[]> }).errors,
      }
    }

    return { success: true, message: 'Restriction ajoutée.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

export async function storeGeofence(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const deviceId = formData.get('device_id') as string

  if (!deviceId) return { success: false, message: 'Appareil non sélectionné.' }

  const payload = {
    name: formData.get('name') as string,
    latitude: Number(formData.get('latitude')),
    longitude: Number(formData.get('longitude')),
    radius: Number(formData.get('radius') ?? 200),
    is_active: true,
  }

  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}/geofences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        status: res.status,
        message: (body as { message?: string }).message ?? 'Erreur.',
        errors: (body as { errors?: Record<string, string[]> }).errors,
      }
    }

    return { success: true, message: 'Zone créée.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

export async function updateGeofence(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const deviceId = formData.get('device_id') as string
  const geofenceId = formData.get('geofence_id') as string
  if (!deviceId || !geofenceId) return { success: false, message: 'Paramètres manquants.' }

  const payload: Record<string, unknown> = {}
  const name = formData.get('name') as string | null
  const lat = formData.get('latitude') as string | null
  const lng = formData.get('longitude') as string | null
  const radius = formData.get('radius') as string | null
  const isActive = formData.get('is_active') as string | null

  if (name) payload.name = name
  if (lat) payload.latitude = Number(lat)
  if (lng) payload.longitude = Number(lng)
  if (radius) payload.radius = Number(radius)
  if (isActive !== null) payload.is_active = isActive === 'true' || isActive === '1'

  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}/geofences/${geofenceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        success: false,
        message: (body as { message?: string }).message ?? 'Erreur lors de la modification.',
        errors: (body as { errors?: Record<string, string[]> }).errors,
      }
    }

    return { success: true, message: 'Zone modifiée.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}

export async function deleteGeofence(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const deviceId = formData.get('device_id') as string
  const geofenceId = formData.get('geofence_id') as string

  if (!deviceId || !geofenceId) return { success: false, message: 'Paramètres manquants.' }

  try {
    const res = await parentFetch(`/api/user/devices/${deviceId}/geofences/${geofenceId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      return { success: false, message: 'Erreur lors de la suppression.' }
    }

    return { success: true, message: 'Zone supprimée.' }
  } catch {
    return { success: false, message: 'Impossible de joindre le serveur.' }
  }
}
