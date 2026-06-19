'use client'

import type { DeviceCall, DeviceSms, DeviceGpsLocation, DeviceNotification } from '@/types/parent'
import type { ResponseCollection } from '@/types/api'
import { useDevice } from '@/contexts/device-context'
import { useQuery } from '@tanstack/react-query'
import { Bell, MapPin, Phone, Shield, RefreshCw, Activity } from 'lucide-react'
import * as React from 'react'

function fetchFeed<T>(deviceId: number, feed: string, perPage = 20): Promise<ResponseCollection<T>> {
  return fetch(`/dashboard/api?device_id=${deviceId}&feed=${feed}&per_page=${perPage}`)
    .then((r) => {
      if (!r.ok) throw new Error('fetch error')
      return r.json() as Promise<ResponseCollection<T>>
    })
}

function useKpi(deviceId: number) {
  const calls = useQuery({
    queryKey: ['dashboard-calls', deviceId],
    queryFn: () => fetchFeed<DeviceCall>(deviceId, 'calls', 100),
    enabled: deviceId > 0,
  })
  const sms = useQuery({
    queryKey: ['dashboard-sms', deviceId],
    queryFn: () => fetchFeed<DeviceSms>(deviceId, 'sms', 100),
    enabled: deviceId > 0,
  })
  const gps = useQuery({
    queryKey: ['dashboard-gps', deviceId],
    queryFn: () => fetchFeed<DeviceGpsLocation>(deviceId, 'gps', 1),
    enabled: deviceId > 0,
  })
  const notifs = useQuery({
    queryKey: ['dashboard-notifs', deviceId],
    queryFn: () => fetchFeed<DeviceNotification>(deviceId, 'notifications', 100),
    enabled: deviceId > 0,
  })

  return { calls, sms, gps, notifs }
}

export function DashboardClient() {
  const { activeDevice } = useDevice()
  const deviceId = activeDevice?.id ?? 0
  const { calls, sms, gps, notifs } = useKpi(deviceId)

  const callCount = calls.data?.meta?.total ?? 0
  const smsCount = sms.data?.meta?.total ?? 0
  const notifCount = notifs.data?.meta?.total ?? 0
  const lastGps = gps.data?.data?.[0] ?? null

  const kpiData = [
    {
      id: 'calls',
      label: 'Appels',
      value: String(callCount),
      sub: 'Total collectés',
      icon: Phone,
      iconBg: '#ecfdf5',
      iconColor: '#10b981',
    },
    {
      id: 'sms',
      label: 'SMS',
      value: String(smsCount),
      sub: 'Total collectés',
      icon: Shield,
      iconBg: '#eff6ff',
      iconColor: '#3b82f6',
    },
    {
      id: 'location',
      label: 'Dernière position',
      value: lastGps ? `${lastGps.latitude.toFixed(4)}, ${lastGps.longitude.toFixed(4)}` : '—',
      sub: lastGps?.recorded_at
        ? new Date(lastGps.recorded_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : 'Aucune position',
      icon: MapPin,
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      value: String(notifCount),
      sub: 'Interceptées',
      icon: Bell,
      iconBg: '#fef2f2',
      iconColor: '#ef4444',
    },
  ]

  const isFetching = calls.isFetching || sms.isFetching || gps.isFetching || notifs.isFetching

  const recentEvents = React.useMemo(() => {
    const events: { id: string; time: string; tag: string; text: string; dot: string }[] = []

    for (const c of calls.data?.data?.slice(0, 5) ?? []) {
      events.push({
        id: `call-${c.id}`,
        time: c.created_at ? new Date(c.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        tag: 'APPEL',
        text: `${c.call_type === 'incoming' ? 'Appel entrant' : c.call_type === 'outgoing' ? 'Appel sortant' : 'Appel manqué'} ${c.contact_name ?? c.phone_number} (${Math.floor(c.duration / 60)}min)`,
        dot: '#10b981',
      })
    }
    for (const s of sms.data?.data?.slice(0, 5) ?? []) {
      events.push({
        id: `sms-${s.id}`,
        time: s.date ? new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        tag: 'SMS',
        text: `${s.type === 'inbox' ? 'SMS reçu de' : 'SMS envoyé à'} ${s.address}`,
        dot: '#3b82f6',
      })
    }
    for (const n of notifs.data?.data?.slice(0, 5) ?? []) {
      events.push({
        id: `notif-${n.id}`,
        time: n.date ? new Date(n.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        tag: 'NOTIF',
        text: `${n.package_name}: ${n.title ?? n.body ?? '(sans titre)'}`,
        dot: '#f59e0b',
      })
    }

    events.sort((a, b) => (b.time > a.time ? 1 : -1))
    return events.slice(0, 15)
  }, [calls.data, sms.data, notifs.data])

  if (!activeDevice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-[#9ca3af]">
        <Activity className="size-12 opacity-30" />
        <p className="text-sm">Aucun appareil sélectionné</p>
      </div>
    )
  }

  return (
    <>
      {/* KPI grid */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {kpiData.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.id}
              className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-sm"
              style={{ border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex size-9 items-center justify-center rounded-lg"
                  style={{ background: kpi.iconBg }}
                >
                  <Icon className="size-4.5" style={{ color: kpi.iconColor }} />
                </div>
                {isFetching && <RefreshCw className="size-3 animate-spin text-[#d1d5db]" />}
              </div>
              <div>
                <p className="text-2xl font-black text-[#111827]">{kpi.value}</p>
                <p className="text-[12px] font-medium text-[#374151]">{kpi.label}</p>
                <p className="mt-0.5 text-[11px] text-[#9ca3af]">{kpi.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Live feed */}
      <div
        className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'rgba(0,0,0,0.06)' }}
        >
          <div>
            <h2 className="text-[13px] font-bold text-[#111827]">Activité récente</h2>
            <p className="text-[11px] text-[#9ca3af]">
              {activeDevice.device_name ?? activeDevice.model ?? 'Appareil'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { calls.refetch(); sms.refetch(); notifs.refetch() }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#6b7280] transition-colors hover:bg-[#f1f3f7]"
          >
            <RefreshCw className={`size-3 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        <div className="max-h-[calc(100vh-380px)] flex-1 overflow-y-auto divide-y divide-black/[0.04]">
          {recentEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-[#fafafa]">
              <div className="flex flex-col items-center pt-0.5">
                <div className="size-1.5 rounded-full" style={{ background: event.dot }} />
              </div>
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
                style={{
                  background: `${event.dot}15`,
                  color: event.dot,
                }}
              >
                {event.tag}
              </span>
              <p className="flex-1 truncate text-[12px] text-[#374151]">{event.text}</p>
              <time className="shrink-0 text-[11px] tabular-nums text-[#9ca3af]">{event.time}</time>
            </div>
          ))}

          {recentEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-[#9ca3af]">
              <Activity className="size-8 opacity-40" />
              <p className="text-sm">Aucune activité récente</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
