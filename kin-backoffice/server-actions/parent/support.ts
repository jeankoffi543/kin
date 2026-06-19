'use server'

import type { FormState } from '@/types/api'
import type { SupportMessage } from '@/types/parent'
import { parentFetch } from '@/lib/api'

interface SendMessageInput {
  ticketId: string
  message: string
}

export async function sendSupportMessage(
  _state: FormState<SupportMessage>,
  payload: FormData,
): Promise<FormState<SupportMessage>> {
  const ticketId = payload.get('ticketId')
  const message = payload.get('message')

  if (!ticketId || !message || String(message).trim() === '') {
    return { success: false, errors: { message: ['Le message ne peut pas être vide'] } }
  }

  try {
    const res = await parentFetch(`/api/user/support/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: String(message).trim() }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string; errors?: Record<string, string[]> }
      return { success: false, message: body.message, errors: body.errors, status: res.status }
    }
    const body = await res.json() as { data: SupportMessage }
    return { success: true, data: body.data }
  } catch {
    return { success: false, message: 'Impossible de contacter le serveur' }
  }
}

export async function createSupportTicket(
  _state: FormState<{ id: string }>,
  payload: FormData,
): Promise<FormState<{ id: string }>> {
  const subject = payload.get('subject')
  const message = payload.get('message')

  if (!subject || !message) {
    return { success: false, errors: { subject: ['Sujet requis'], message: ['Message requis'] } }
  }

  try {
    const res = await parentFetch('/api/user/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: String(subject), message: String(message) }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string; errors?: Record<string, string[]> }
      return { success: false, message: body.message, errors: body.errors, status: res.status }
    }
    const body = await res.json() as { data: { id: string } }
    return { success: true, data: body.data }
  } catch {
    return { success: false, message: 'Impossible de contacter le serveur' }
  }
}
