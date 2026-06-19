import type { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { getParentToken } from '@/lib/session'

const API_URL = process.env.API_URL!

export async function POST(req: NextRequest) {
  const token = await getParentToken()

  // Debug: log what's in the cookie
  const jar = await cookies()
  const rawCookie = jar.get('kin_parent_session')?.value
  console.log('[broadcasting/api] Cookie present:', !!rawCookie)
  console.log('[broadcasting/api] Token resolved:', token ? token.slice(0, 15) + '...' : 'NULL')

  if (!token) {
    return Response.json({ error: 'Non authentifié — token absent du cookie' }, { status: 401 })
  }

  const body = await req.text()
  console.log('[broadcasting/api] Forwarding:', body)

  const res = await fetch(`${API_URL}/broadcasting/auth`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  })

  const data = await res.text()
  console.log('[broadcasting/api] Laravel:', res.status, data.slice(0, 200))

  return new Response(data, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  })
}
