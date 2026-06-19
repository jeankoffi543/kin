import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { DeviceProvider } from '@/contexts/device-context'
import { ParentSidebar } from '@/components/parent/sidebar'
import { RealtimeProvider } from '@/components/parent/realtime-provider'
import { parentFetch } from '@/lib/api'
import type { Device } from '@/types/parent'
import type { ReactNode } from 'react'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

async function getDevices(): Promise<Device[]> {
  try {
    const res = await parentFetch('/api/user/devices')
    if (!res.ok) return []
    const body = (await res.json()) as { data: Device[] }
    return body.data ?? []
  } catch {
    return []
  }
}

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  const session = jar.get('kin_parent_session')
  if (!session?.value) {
    redirect('/login')
  }

  const devices = await getDevices()

  return (
    <DeviceProvider devices={devices}>
      <RealtimeProvider>
        <div
          className={`${plusJakarta.variable} flex h-screen overflow-hidden`}
          style={{
            fontFamily: 'var(--font-plus-jakarta), system-ui, sans-serif',
            background: '#f1f3f7',
          }}
        >
          <ParentSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </div>
      </RealtimeProvider>
    </DeviceProvider>
  )
}
