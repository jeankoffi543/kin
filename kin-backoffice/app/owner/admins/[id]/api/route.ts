import type { NextRequest } from 'next/server'
import { ownerFetch } from '@/lib/api'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const res = await ownerFetch(`/api/admin/admins/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
