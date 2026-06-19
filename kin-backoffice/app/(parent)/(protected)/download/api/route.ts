import type { NextRequest } from 'next/server'
import { parentFetch } from '@/lib/api'

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const deviceId = params.get('device_id')
  const type = params.get('type')
  const itemId = params.get('item_id')

  if (!deviceId || !type || !itemId) {
    return Response.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const pathMap: Record<string, string> = {
    media: `/api/user/devices/${deviceId}/media/${itemId}/download`,
    call: `/api/user/devices/${deviceId}/calls/${itemId}/download`,
  }

  const path = pathMap[type]
  if (!path) return Response.json({ error: 'Type invalide' }, { status: 400 })

  const res = await parentFetch(path)

  if (!res.ok) {
    return Response.json({ error: 'Téléchargement échoué' }, { status: res.status })
  }

  const blob = await res.blob()
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const disposition = res.headers.get('content-disposition') ?? `attachment; filename="download"`

  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': disposition,
    },
  })
}
