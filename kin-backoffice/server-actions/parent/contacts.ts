'use server'

import type { FormState } from '@/types/api'
import type { DeviceContact } from '@/types/parent'
import { parentFetch } from '@/lib/api'

export async function blockContact(
  _state: FormState<DeviceContact>,
  payload: FormData,
): Promise<FormState<DeviceContact>> {
  const id = payload.get('id')
  if (!id) return { success: false, message: 'ID manquant' }

  try {
    const res = await parentFetch(`/api/user/contacts/${id}/block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocked: true }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string }
      return { success: false, message: body.message ?? 'Erreur serveur', status: res.status }
    }
    const body = await res.json() as { data: DeviceContact }
    return { success: true, data: body.data }
  } catch {
    return { success: false, message: 'Impossible de contacter le serveur' }
  }
}

export async function unblockContact(
  _state: FormState<DeviceContact>,
  payload: FormData,
): Promise<FormState<DeviceContact>> {
  const id = payload.get('id')
  if (!id) return { success: false, message: 'ID manquant' }

  try {
    const res = await parentFetch(`/api/user/contacts/${id}/block`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string }
      return { success: false, message: body.message ?? 'Erreur serveur', status: res.status }
    }
    const body = await res.json() as { data: DeviceContact }
    return { success: true, data: body.data }
  } catch {
    return { success: false, message: 'Impossible de contacter le serveur' }
  }
}
