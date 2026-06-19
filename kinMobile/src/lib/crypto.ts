import { DeviceStorage } from './storage'

// Pure JS SHA-256 — no native module dependency
function sha256(input: string): string {
  const utf8 = new TextEncoder().encode(input)

  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]

  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n))
  const ch = (x: number, y: number, z: number) => (x & y) ^ (~x & z)
  const maj = (x: number, y: number, z: number) => (x & y) ^ (x & z) ^ (y & z)
  const sigma0 = (x: number) => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x)
  const sigma1 = (x: number) => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x)
  const gamma0 = (x: number) => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3)
  const gamma1 = (x: number) => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10)

  const l = utf8.length
  const bitLen = l * 8
  const padded = new Uint8Array(((l + 9 + 63) & ~63))
  padded.set(utf8)
  padded[l] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 4, bitLen, false)

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19

  for (let offset = 0; offset < padded.length; offset += 64) {
    const w = new Int32Array(64)
    for (let i = 0; i < 16; i++) w[i] = view.getInt32(offset + i * 4, false)
    for (let i = 16; i < 64; i++) w[i] = (gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16]) | 0

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7
    for (let i = 0; i < 64; i++) {
      const t1 = (h + sigma1(e) + ch(e, f, g) + K[i] + w[i]) | 0
      const t2 = (sigma0(a) + maj(a, b, c)) | 0
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0
    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0
  }

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0')
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7)
}

function devicePrefix(): string {
  return DeviceStorage.getUuid() ?? 'unknown'
}

export const SyncHash = {
  call(phone: string, callType: string, timestamp: number): string {
    return sha256(`${devicePrefix()}:call:${phone}:${callType}:${timestamp}`)
  },

  sms(address: string, smsType: string, date: string, bodySnippet: string): string {
    return sha256(`${devicePrefix()}:sms:${address}:${smsType}:${date}:${bodySnippet.slice(0, 64)}`)
  },

  contact(phone: string, name: string): string {
    return sha256(`${devicePrefix()}:contact:${phone}:${name}`)
  },

  notification(packageName: string, date: string, titleSnippet: string): string {
    return sha256(`${devicePrefix()}:notif:${packageName}:${date}:${titleSnippet.slice(0, 32)}`)
  },

  gpsLocation(lat: number, lng: number, recordedAt: string): string {
    return sha256(`${devicePrefix()}:gps:${lat.toFixed(6)}:${lng.toFixed(6)}:${recordedAt}`)
  },

  geofenceAlert(geofenceId: number, eventType: string, triggeredAt: string): string {
    return sha256(`${devicePrefix()}:geofence:${geofenceId}:${eventType}:${triggeredAt}`)
  },

  socialMessage(platform: string, senderName: string, date: string, msgSnippet: string): string {
    return sha256(`${devicePrefix()}:social:${platform}:${senderName}:${date}:${msgSnippet.slice(0, 64)}`)
  },

  browserHistory(url: string, visitedAt: string): string {
    return sha256(`${devicePrefix()}:browser:${url}:${visitedAt}`)
  },

  installedApp(packageName: string, installedAt: string): string {
    return sha256(`${devicePrefix()}:app:${packageName}:${installedAt}`)
  },

  file(path: string, size: number): string {
    return sha256(`${devicePrefix()}:file:${path}:${size}`)
  },

  media(path: string, mediaType: string, size: number): string {
    return sha256(`${devicePrefix()}:media:${path}:${mediaType}:${size}`)
  },
}
