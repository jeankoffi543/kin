import { cookies } from 'next/headers'

async function readCookie(name: string): Promise<string | null> {
  const jar = await cookies()
  const raw = jar.get(name)?.value
  if (!raw) return null
  try {
    const payload = JSON.parse(raw) as { token?: string }
    return payload.token ?? null
  } catch {
    return null
  }
}

export async function getOwnerToken(): Promise<string | null> {
  return readCookie('kin_owner_session')
}

export async function getParentToken(): Promise<string | null> {
  return readCookie('kin_parent_session')
}
