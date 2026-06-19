'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_URL!
const COOKIE = 'kin_parent_session'

type LoginState = { error: string } | undefined

export async function parentLogin(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email et mot de passe requis.' }
  }

  let res: Response
  try {
    res = await fetch(`${API_URL}/api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch {
    return { error: 'Impossible de joindre le serveur.' }
  }

  if (!res.ok) {
    return { error: 'Email ou mot de passe invalide.' }
  }

  const { token, user } = await res.json()
  const payload = JSON.stringify({ token, ...user })

  const jar = await cookies()
  jar.set(COOKIE, payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })

  redirect('/dashboard')
}

export async function parentLogout(): Promise<void> {
  const jar = await cookies()
  const raw = jar.get(COOKIE)?.value

  if (raw) {
    try {
      const { token } = JSON.parse(raw) as { token: string }
      await fetch(`${API_URL}/api/user/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
    } catch {}

    jar.delete(COOKIE)
  }

  redirect('/login')
}
