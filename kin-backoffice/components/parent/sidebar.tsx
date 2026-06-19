'use client'

import type { Device } from '@/types/parent'
import { useDevice } from '@/contexts/device-context'
import { parentLogout } from '@/app/actions/parent-auth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import {
  Activity,
  Bell,
  ChevronDown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  Monitor,
  Phone,
  Radio,
  Smartphone,
  TabletSmartphone,
} from 'lucide-react'

// ── Nav config ────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: string
}

const PRINCIPAL_NAV: NavItem[] = [
  { label: "Vue d'ensemble", href: '/dashboard', icon: LayoutDashboard },
  { label: 'Téléphonie', href: '/telephony', icon: Phone },
  { label: 'Messageries', href: '/messaging', icon: MessageSquare },
  { label: 'Notifications', href: '/notifications', icon: Bell },
  { label: 'Localisation', href: '/location', icon: MapPin },
  { label: 'Activité Numérique', href: '/activity', icon: Monitor },
  { label: 'Appareils', href: '/devices', icon: TabletSmartphone },
]

const ADVANCED_NAV: NavItem[] = [
  { label: 'Live Action', href: '/live-action', icon: Radio, badge: 'PRO' },
  { label: 'Support Client', href: '/support', icon: HelpCircle },
]

function isDeviceOnline(updatedAt: string | null): boolean {
  if (!updatedAt) return false
  return Date.now() - new Date(updatedAt).getTime() < 15 * 60 * 1000
}

// ── Device avatar ────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  android: '#3ddc84',
  ios: '#007aff',
}

function DeviceAvatar({ device, size = 'md' }: { device: Device; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'size-6 text-[10px]' : 'size-8 text-sm'
  const color = PLATFORM_COLORS[device.platform ?? ''] ?? '#6b7280'
  const initial = (device.device_name ?? device.model ?? 'D')[0].toUpperCase()
  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center rounded-full font-bold text-white`}
      style={{ background: color }}
    >
      {initial}
    </div>
  )
}

// ── Device selector ──────────────────────────────────────────────────────────

function DeviceSelector() {
  const { devices, activeDevice, setActiveDevice } = useDevice()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  if (!activeDevice) {
    return (
      <div className="mx-3 mb-4 rounded-xl px-3 py-3 text-center text-[11px] text-[#5b6278]">
        Aucun appareil lié
      </div>
    )
  }

  const displayName = activeDevice.device_name ?? activeDevice.model ?? activeDevice.uuid.slice(0, 8)

  return (
    <div ref={ref} className="relative mx-3 mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.04]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <DeviceAvatar device={activeDevice} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-[#e8eaf2]">
              {displayName}
            </span>
            <span
              className="ml-auto size-1.5 shrink-0 rounded-full"
              style={{ background: isDeviceOnline(activeDevice.updated_at) ? '#10b981' : '#4b5563' }}
            />
          </div>
          <p className="flex items-center gap-1 text-[11px] text-[#5b6278]">
            <Smartphone className="size-2.5" />
            <span className="truncate">
              {[activeDevice.brand, activeDevice.model].filter(Boolean).join(' ') || activeDevice.platform || 'Appareil'}
            </span>
          </p>
        </div>
        <ChevronDown
          className={`size-3.5 shrink-0 text-[#5b6278] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl py-1 shadow-2xl"
          style={{ background: '#1a1e2a', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {devices.map((device) => (
            <button
              key={device.id}
              onClick={() => { setActiveDevice(device); setOpen(false) }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/[0.05]"
            >
              <DeviceAvatar device={device} size="sm" />
              <div className="min-w-0 flex-1">
                <span className="truncate text-[13px] font-medium text-[#e8eaf2]">
                  {device.device_name ?? device.model ?? device.uuid.slice(0, 8)}
                </span>
                <p className="flex items-center gap-1 text-[11px] text-[#5b6278]">
                  <Smartphone className="size-2.5" />
                  <span className="truncate">{device.platform ?? 'inconnu'}</span>
                </p>
              </div>
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: isDeviceOnline(device.updated_at) ? '#10b981' : '#4b5563' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Nav section ───────────────────────────────────────────────────────────────

function NavSection({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname()

  return (
    <div className="mb-1">
      <p className="mb-1 px-6 text-[9px] font-semibold uppercase tracking-widest text-[#3d4557]">
        {label}
      </p>
      <div className="space-y-0.5 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                active
                  ? 'bg-amber-500/[0.13] text-amber-400'
                  : 'text-[#8892a8] hover:bg-white/[0.04] hover:text-[#c9cfe4]'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge && (
                <span className="rounded-md bg-amber-500 px-1.5 py-px text-[9px] font-black uppercase text-black">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function ParentSidebar() {
  return (
    <aside
      className="flex h-screen w-[240px] shrink-0 flex-col overflow-y-auto"
      style={{
        background: '#0b0d11',
        borderRight: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-[15px] font-black text-black">
          K
        </div>
        <div>
          <p className="text-[13px] font-bold tracking-tight text-[#e8eaf2]">kin</p>
          <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-[#3d4557]">
            Contrôle parental
          </p>
        </div>
      </div>

      {/* Device selector */}
      <DeviceSelector />

      {/* Navigation */}
      <nav className="flex-1 pb-2">
        <NavSection label="Principal" items={PRINCIPAL_NAV} />
        <div
          className="mx-5 my-2 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.04)' }}
        />
        <NavSection label="Avancé" items={ADVANCED_NAV} />
      </nav>

      {/* Logout */}
      <div className="space-y-1 px-4 pb-4">
        <form action={parentLogout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-[#4b5563] outline-none transition-colors hover:bg-white/[0.04] hover:text-[#8892a8]"
          >
            <LogOut className="size-3.5" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  )
}
