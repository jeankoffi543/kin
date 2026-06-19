'use client'

import type { DeviceNotification } from '@/types/parent'
import { useDeviceFeed } from '@/hooks/use-device-feed'
import { Bell, Loader2, RefreshCw } from 'lucide-react'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortPackage(pkg: string): string {
  const parts = pkg.split('.')
  return parts[parts.length - 1] ?? pkg
}

export function NotificationsClient() {
  const feed = useDeviceFeed<DeviceNotification>({
    routeBase: '/notifications',
    feed: 'notifications',
    queryKey: 'notifications-list',
    perPage: 100,
    refetchInterval: 15_000,
  })

  const notifications = feed.data?.data ?? []
  const total = feed.data?.meta?.total ?? 0

  if (feed.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-[#9ca3af]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[#111827]">Notifications interceptées</h2>
          <p className="text-[12px] text-[#9ca3af]">{total} notification(s) collectée(s)</p>
        </div>
        <button
          type="button"
          onClick={() => feed.refetch()}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[#6b7280] transition-colors hover:bg-[#f1f3f7]"
        >
          <RefreshCw className={`size-3 ${feed.isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div
        className="overflow-hidden rounded-xl bg-white shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <table className="w-full text-left">
          <thead>
            <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              {['Date', 'Application', 'Titre', 'Contenu'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {notifications.map((n) => (
              <tr key={n.id} className="transition-colors hover:bg-[#fafafa]">
                <td className="whitespace-nowrap px-4 py-3 text-[12px] text-[#374151]">
                  {formatDate(n.date)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                    {shortPackage(n.package_name)}
                  </span>
                  <p className="mt-0.5 truncate font-mono text-[9px] text-[#9ca3af]">
                    {n.package_name}
                  </p>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-[12px] font-medium text-[#111827]">
                  {n.title ?? '(sans titre)'}
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-[12px] text-[#374151]">
                  {n.body ?? '—'}
                </td>
              </tr>
            ))}
            {notifications.length === 0 && (
              <tr>
                <td colSpan={4} className="py-16 text-center">
                  <Bell className="mx-auto mb-2 size-8 text-[#d1d5db]" />
                  <p className="text-[12px] text-[#9ca3af]">Aucune notification interceptée</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
