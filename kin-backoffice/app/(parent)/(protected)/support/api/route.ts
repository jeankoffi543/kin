import type { NextRequest } from 'next/server'
import { parentFetch } from '@/lib/api'

export async function GET(req: NextRequest) {
  const qs = req.nextUrl.searchParams.toString()
  const res = await parentFetch(`/api/user/conversations${qs ? `?${qs}` : ''}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await parentFetch('/api/user/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
