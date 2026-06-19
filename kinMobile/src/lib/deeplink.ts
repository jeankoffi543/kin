import { Linking } from 'react-native'

// Formats acceptés :
//   kin://setup?uuid=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//   kin-setup://register?uuid=...
//   Raw UUID : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

export function extractUuidFromUrl(url: string): string | null {
  const match = url.match(UUID_REGEX)
  return match ? match[0].toLowerCase() : null
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim())
}

export function normalizeUuid(value: string): string {
  const match = value.match(UUID_REGEX)
  return match ? match[0].toLowerCase() : value.trim().toLowerCase()
}

export async function getInitialDeepLinkUuid(): Promise<string | null> {
  try {
    const url = await Linking.getInitialURL()
    if (!url) return null
    return extractUuidFromUrl(url)
  } catch {
    return null
  }
}

export function subscribeToDeepLinks(onUuid: (uuid: string) => void): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    const uuid = extractUuidFromUrl(url)
    if (uuid) onUuid(uuid)
  })
  return () => subscription.remove()
}
