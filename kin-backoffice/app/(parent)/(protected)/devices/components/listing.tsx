'use client'

import type { Device } from '@/types/parent'
import { useDevice } from '@/contexts/device-context'
import { Smartphone, Wifi, WifiOff } from 'lucide-react'

function isOnline(updatedAt: string | null): boolean {
  if (!updatedAt) return false
  return Date.now() - new Date(updatedAt).getTime() < 15 * 60 * 1000
}

function DeviceCard({ device, isActive, onSelect }: { device: Device; isActive: boolean; onSelect: () => void }) {
  const online = isOnline(device.updated_at)
  const displayName = device.device_name ?? device.model ?? device.uuid.slice(0, 8)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-xl bg-white p-5 text-left shadow-sm transition-all hover:shadow-md ${
        isActive ? 'ring-2 ring-amber-500' : ''
      }`}
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div
        className="flex size-12 items-center justify-center rounded-xl"
        style={{ background: online ? '#ecfdf5' : '#f1f3f7' }}
      >
        <Smartphone className="size-6" style={{ color: online ? '#10b981' : '#9ca3af' }} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14px] font-bold text-[#111827]">{displayName}</p>
          {online ? (
            <Wifi className="size-3.5 text-emerald-500" />
          ) : (
            <WifiOff className="size-3.5 text-[#9ca3af]" />
          )}
        </div>
        <p className="text-[12px] text-[#6b7280]">
          {[device.brand, device.model].filter(Boolean).join(' ') || device.platform || '—'}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {device.platform && (
            <span className="rounded bg-[#f1f3f7] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#6b7280]">
              {device.platform}
            </span>
          )}
          {device.os_version && (
            <span className="text-[10px] text-[#9ca3af]">OS {device.os_version}</span>
          )}
          {device.app_version && (
            <span className="text-[10px] text-[#9ca3af]">App v{device.app_version}</span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-[10px] text-[#9ca3af]">{device.uuid.slice(0, 8).toUpperCase()}</p>
        {device.updated_at && (
          <p className="text-[10px] text-[#9ca3af]">
            MAJ {new Date(device.updated_at).toLocaleDateString('fr-FR')}
          </p>
        )}
      </div>
    </button>
  )
}

export function DevicesListing() {
  const { devices, activeDevice, setActiveDevice } = useDevice()

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-bold text-[#111827]">Appareils liés</h2>
        <p className="text-[12px] text-[#9ca3af]">{devices.length} appareil(s) enregistré(s)</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isActive={activeDevice?.id === device.id}
            onSelect={() => setActiveDevice(device)}
          />
        ))}
      </div>

      {devices.length === 0 && (
        <div className="py-20 text-center text-[12px] text-[#9ca3af]">
          Aucun appareil lié à votre compte. Scannez le QR code depuis l'application Kin sur le téléphone de votre enfant.
        </div>
      )}
    </div>
  )
}
