import { getParentToken } from '@/lib/session'
import type { NextRequest } from 'next/server'

const API_URL = process.env.API_URL!

export async function GET(req: NextRequest) {
  const token = await getParentToken()
  if (!token) return Response.json({ error: 'Non authentifié' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const qs = searchParams.toString()

  const res = await fetch(`${API_URL}/api/user/telemetry${qs ? `?${qs}` : ''}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  const body = await res.json()
  return Response.json(body, { status: res.status })
}
