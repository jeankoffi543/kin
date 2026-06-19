import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo: Echo<'reverb'>
  }
}

let echoInstance: Echo<'reverb'> | null = null

export function getEcho(token: string): Echo<'reverb'> {
  if (echoInstance) return echoInstance

  if (typeof window !== 'undefined') {
    window.Pusher = Pusher
  }

  const wsHost = process.env.NEXT_PUBLIC_REVERB_HOST ?? 'localhost'
  const wsPort = Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080)
  const wsScheme = process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'http'
  const appKey = process.env.NEXT_PUBLIC_REVERB_APP_KEY ?? 'kinc2key3kjoscommand'

  console.log('[Echo] Connecting to Reverb:', { wsHost, wsPort, wsScheme, appKey })

  Pusher.logToConsole = process.env.NODE_ENV !== 'production'

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: appKey,
    wsHost,
    wsPort,
    wssPort: wsPort,
    forceTLS: wsScheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/api',
    auth: {
      headers: {
        Accept: 'application/json',
      },
    },
    authorizer: (channel: { name: string }, _options: unknown) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string; channel_data?: string } | null) => void) => {
        fetch('/broadcasting/api', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          credentials: 'same-origin',
          body: new URLSearchParams({ socket_id: socketId, channel_name: channel.name }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(`Auth failed: ${res.status}`)
            return res.json()
          })
          .then((data) => callback(null, data))
          .catch((err) => {
            console.error('[Echo] Auth error for', channel.name, err)
            callback(err instanceof Error ? err : new Error(String(err)), null)
          })
      },
    }),
  })

  const connector = echoInstance.connector as { pusher?: Pusher }
  if (connector.pusher) {
    connector.pusher.connection.bind('connected', () => {
      console.log('[Echo] Connected to Reverb')
    })
    connector.pusher.connection.bind('error', (err: unknown) => {
      console.error('[Echo] Connection error:', err)
    })
    connector.pusher.connection.bind('disconnected', () => {
      console.warn('[Echo] Disconnected from Reverb')
    })
  }

  return echoInstance
}

export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}
