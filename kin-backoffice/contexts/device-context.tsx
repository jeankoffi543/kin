'use client'

import type { Device } from '@/types/parent'
import * as React from 'react'

interface DeviceContextValue {
  devices: Device[]
  activeDevice: Device | null
  setActiveDevice: (device: Device) => void
}

const DeviceContext = React.createContext<DeviceContextValue | null>(null)

export function DeviceProvider({
  devices,
  children,
}: {
  devices: Device[]
  children: React.ReactNode
}) {
  const [activeDeviceId, setActiveDeviceId] = React.useState<number>(devices[0]?.id ?? 0)
  const activeDevice = devices.find((d) => d.id === activeDeviceId) ?? null

  return (
    <DeviceContext.Provider
      value={{
        devices,
        activeDevice,
        setActiveDevice: (d) => setActiveDeviceId(d.id),
      }}
    >
      {children}
    </DeviceContext.Provider>
  )
}

export function useDevice(): DeviceContextValue {
  const ctx = React.useContext(DeviceContext)
  if (!ctx) throw new Error('useDevice must be used inside <DeviceProvider>')
  return ctx
}
