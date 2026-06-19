'use client'

import type { DeviceGpsLocation, DeviceGeofence, DeviceGeofenceAlert } from '@/types/parent'
import { useDevice } from '@/contexts/device-context'
import { useDeviceFeed } from '@/hooks/use-device-feed'
import { storeGeofence, updateGeofence, deleteGeofence } from '@/app/actions/device-commands'
import { Check, Edit2, Loader2, MapPin, Navigation, Shield, Trash2, Plus, X } from 'lucide-react'
import * as React from 'react'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function GpsHistory({ locations }: { locations: DeviceGpsLocation[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            {['Date', 'Latitude', 'Longitude', 'Altitude', 'Précision'].map((h) => (
              <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {locations.map((loc) => (
            <tr key={loc.id} className="transition-colors hover:bg-[#fafafa]">
              <td className="px-4 py-3 text-[12px] text-[#374151]">{formatDate(loc.recorded_at)}</td>
              <td className="px-4 py-3 font-mono text-[11px] text-[#6b7280]">{loc.latitude.toFixed(6)}</td>
              <td className="px-4 py-3 font-mono text-[11px] text-[#6b7280]">{loc.longitude.toFixed(6)}</td>
              <td className="px-4 py-3 font-mono text-[11px] text-[#6b7280]">{loc.altitude?.toFixed(1) ?? '—'}</td>
              <td className="px-4 py-3 font-mono text-[11px] text-[#6b7280]">{loc.accuracy ? `${loc.accuracy.toFixed(0)}m` : '—'}</td>
            </tr>
          ))}
          {locations.length === 0 && (
            <tr><td colSpan={5} className="py-12 text-center text-[12px] text-[#9ca3af]">Aucune position GPS</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function EditGeofenceInline({
  zone,
  deviceId,
  onDone,
}: {
  zone: DeviceGeofence
  deviceId: number
  onDone: () => void
}) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('device_id', String(deviceId))
    fd.append('geofence_id', String(zone.id))
    await updateGeofence({ success: false }, fd)
    onDone()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl bg-amber-500/5 px-5 py-4 shadow-sm"
      style={{ border: '1px solid rgba(245,158,11,0.2)' }}
    >
      <div className="w-36">
        <label className="mb-1 block text-[10px] font-medium text-[#374151]">Nom</label>
        <input name="name" defaultValue={zone.name} className="w-full rounded-lg border bg-white px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: '#e5e7eb' }} />
      </div>
      <div className="w-28">
        <label className="mb-1 block text-[10px] font-medium text-[#374151]">Rayon (m)</label>
        <input name="radius" type="number" step="any" defaultValue={zone.radius} className="w-full rounded-lg border bg-white px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: '#e5e7eb' }} />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-[10px] font-medium text-[#374151]">Latitude</label>
        <input name="latitude" type="number" step="any" defaultValue={zone.latitude} className="w-full rounded-lg border bg-white px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: '#e5e7eb' }} />
      </div>
      <div className="w-32">
        <label className="mb-1 block text-[10px] font-medium text-[#374151]">Longitude</label>
        <input name="longitude" type="number" step="any" defaultValue={zone.longitude} className="w-full rounded-lg border bg-white px-2 py-1.5 text-[12px] outline-none" style={{ borderColor: '#e5e7eb' }} />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-[#374151]">Active</label>
        <select name="is_active" defaultValue={zone.is_active ? 'true' : 'false'} className="rounded-lg border bg-white px-2 py-1.5 text-[11px]" style={{ borderColor: '#e5e7eb' }}>
          <option value="true">Oui</option>
          <option value="false">Non</option>
        </select>
      </div>
      <button type="submit" className="flex size-8 items-center justify-center rounded-lg bg-amber-500 text-black"><Check className="size-3.5" /></button>
      <button type="button" onClick={onDone} className="flex size-8 items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f1f3f7]"><X className="size-3.5" /></button>
    </form>
  )
}

function GeofenceList({ zones, deviceId, onRefresh }: { zones: DeviceGeofence[]; deviceId: number; onRefresh: () => void }) {
  const [deleting, setDeleting] = React.useState<number | null>(null)
  const [editing, setEditing] = React.useState<number | null>(null)

  const handleDelete = async (geofenceId: number) => {
    setDeleting(geofenceId)
    const fd = new FormData()
    fd.append('device_id', String(deviceId))
    fd.append('geofence_id', String(geofenceId))
    await deleteGeofence({ success: false }, fd)
    setDeleting(null)
    onRefresh()
  }

  return (
    <div className="space-y-3">
      {zones.map((zone) =>
        editing === zone.id ? (
          <EditGeofenceInline
            key={zone.id}
            zone={zone}
            deviceId={deviceId}
            onDone={() => { setEditing(null); onRefresh() }}
          />
        ) : (
          <div
            key={zone.id}
            className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm"
            style={{ border: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
              <Shield className="size-4 text-blue-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#111827]">{zone.name}</p>
              <p className="font-mono text-[10px] text-[#9ca3af]">
                {zone.latitude.toFixed(5)}, {zone.longitude.toFixed(5)} · {zone.radius}m
              </p>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                zone.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-[#9ca3af]'
              }`}
            >
              {zone.is_active ? 'Active' : 'Inactive'}
            </span>
            <button
              type="button"
              onClick={() => setEditing(zone.id)}
              className="flex size-8 items-center justify-center rounded-lg text-[#9ca3af] transition-colors hover:bg-amber-50 hover:text-amber-600"
              title="Modifier"
            >
              <Edit2 className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(zone.id)}
              disabled={deleting === zone.id}
              className="flex size-8 items-center justify-center rounded-lg text-[#9ca3af] transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              title="Supprimer"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ),
      )}
      {zones.length === 0 && (
        <div className="py-12 text-center text-[12px] text-[#9ca3af]">Aucune zone geofence</div>
      )}
    </div>
  )
}

function GeofenceAlerts({ alerts }: { alerts: DeviceGeofenceAlert[] }) {
  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-sm"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div
            className="size-2 rounded-full"
            style={{ background: alert.event_type === 'enter' ? '#10b981' : '#ef4444' }}
          />
          <span
            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
              alert.event_type === 'enter'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-red-500/10 text-red-500'
            }`}
          >
            {alert.event_type === 'enter' ? 'Entrée' : 'Sortie'}
          </span>
          <p className="flex-1 truncate text-[12px] text-[#374151]">
            {alert.geofence?.name ?? `Zone #${alert.id}`}
          </p>
          <time className="text-[11px] tabular-nums text-[#9ca3af]">{formatDate(alert.triggered_at)}</time>
        </div>
      ))}
      {alerts.length === 0 && (
        <div className="py-12 text-center text-[12px] text-[#9ca3af]">Aucune alerte geofence</div>
      )}
    </div>
  )
}

function AddGeofenceForm({ deviceId, onSuccess }: { deviceId: number; onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('device_id', String(deviceId))
    const result = await storeGeofence({ success: false }, fd)
    if (result.success) {
      setOpen(false)
      onSuccess()
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-[12px] font-bold text-black shadow-sm shadow-amber-500/20 transition-all hover:bg-amber-400"
      >
        <Plus className="size-4" />
        Ajouter une zone
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#374151]">Nom</label>
          <input name="name" required className="w-full rounded-lg border bg-white px-3 py-2 text-[12px] outline-none focus:border-amber-500" style={{ borderColor: '#e5e7eb' }} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#374151]">Rayon (m)</label>
          <input name="radius" type="number" defaultValue={200} required className="w-full rounded-lg border bg-white px-3 py-2 text-[12px] outline-none focus:border-amber-500" style={{ borderColor: '#e5e7eb' }} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#374151]">Latitude</label>
          <input name="latitude" type="number" step="any" required className="w-full rounded-lg border bg-white px-3 py-2 text-[12px] outline-none focus:border-amber-500" style={{ borderColor: '#e5e7eb' }} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#374151]">Longitude</label>
          <input name="longitude" type="number" step="any" required className="w-full rounded-lg border bg-white px-3 py-2 text-[12px] outline-none focus:border-amber-500" style={{ borderColor: '#e5e7eb' }} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="rounded-lg bg-amber-500 px-4 py-2 text-[12px] font-bold text-black transition-colors hover:bg-amber-400">
          Créer
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-[12px] text-[#6b7280] hover:text-[#374151]">
          Annuler
        </button>
      </div>
    </form>
  )
}

type Tab = 'gps' | 'geofences' | 'alerts'

export function LocationClient() {
  const { activeDevice } = useDevice()
  const deviceId = activeDevice?.id ?? 0
  const [tab, setTab] = React.useState<Tab>('gps')

  const gps = useDeviceFeed<DeviceGpsLocation>({ routeBase: '/location', feed: 'gps', queryKey: 'location-gps', perPage: 100, refetchInterval: 15_000 })
  const geofences = useDeviceFeed<DeviceGeofence>({ routeBase: '/location', feed: 'geofences', queryKey: 'location-geofences', perPage: 50 })
  const alerts = useDeviceFeed<DeviceGeofenceAlert>({ routeBase: '/location', feed: 'geofence-alerts', queryKey: 'location-alerts', perPage: 100 })

  if (gps.isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="size-6 animate-spin text-[#9ca3af]" /></div>
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'gps', label: 'Positions GPS', icon: Navigation, count: gps.data?.meta?.total ?? 0 },
    { key: 'geofences', label: 'Zones', icon: Shield, count: geofences.data?.meta?.total ?? 0 },
    { key: 'alerts', label: 'Alertes', icon: MapPin, count: alerts.data?.meta?.total ?? 0 },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all ${
                  tab === t.key ? 'bg-[#111827] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#374151]'
                }`}
              >
                <Icon className="size-3.5" />
                {t.label} ({t.count})
              </button>
            )
          })}
        </div>

        {tab === 'geofences' && (
          <AddGeofenceForm deviceId={deviceId} onSuccess={() => geofences.refetch()} />
        )}
      </div>

      {tab === 'gps' && <GpsHistory locations={gps.data?.data ?? []} />}
      {tab === 'geofences' && (
        <GeofenceList zones={geofences.data?.data ?? []} deviceId={deviceId} onRefresh={() => geofences.refetch()} />
      )}
      {tab === 'alerts' && <GeofenceAlerts alerts={alerts.data?.data ?? []} />}
    </div>
  )
}
