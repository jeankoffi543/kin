import { getParentToken } from '@/lib/session'

export async function GET() {
  const token = await getParentToken()
  if (!token) {
    return Response.json({ token: null }, { status: 401 })
  }
  return Response.json({ token })
}
