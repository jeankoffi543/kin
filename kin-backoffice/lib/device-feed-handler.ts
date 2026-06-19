import type { NextRequest } from 'next/server'
import { parentFetch } from '@/lib/api'

export function createDeviceFeedHandler(defaultFeed: string) {
  return async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams
    const deviceId = params.get('device_id')
    const feed = params.get('feed') ?? defaultFeed
    if (!deviceId) return Response.json({ data: [] }, { status: 400 })

    const qs = new URLSearchParams(params)
    qs.delete('device_id')
    qs.delete('feed')

    const res = await parentFetch(`/api/user/devices/${deviceId}/${feed}?${qs}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  }
}
