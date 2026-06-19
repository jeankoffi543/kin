'use server'

import type { FormState } from '@/types/api'
import type { Admin } from '@/schema/admin'
import { ownerFetch } from '@/lib/api'

export async function createAdmin(
  _state: FormState<Admin>,
  formData: FormData,
): Promise<FormState<Admin>> {
  const res = await ownerFetch('/api/admin/admins', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    return {
      success: false,
      errors: err.errors,
      message: err.message ?? 'Erreur lors de la création',
    }
  }

  const json = await res.json()
  return { success: true, data: json.data as Admin }
}

export async function updateAdmin(
  _state: FormState<Admin>,
  formData: FormData,
): Promise<FormState<Admin>> {
  const id = formData.get('id')
  formData.delete('id')

  const res = await ownerFetch(`/api/admin/admins/${id}`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    return {
      success: false,
      errors: err.errors,
      message: err.message ?? 'Erreur lors de la mise à jour',
    }
  }

  const json = await res.json()
  return { success: true, data: json.data as Admin }
}

export async function deleteAdmin(
  _state: FormState<void>,
  formData: FormData,
): Promise<FormState<void>> {
  const id = formData.get('id')

  const res = await ownerFetch(`/api/admin/admins/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const err = await res.json()
    return { success: false, message: err.message ?? 'Erreur lors de la suppression' }
  }

  return { success: true }
}
