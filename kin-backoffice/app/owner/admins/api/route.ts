import type { NextRequest } from 'next/server'
import { ownerFetch } from '@/lib/api'

export async function GET(req: NextRequest) {
  const res = await ownerFetch(`/api/admin/admins?${req.nextUrl.searchParams}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
