'use client'

import type { DeviceBrowserHistory, DeviceInstalledApp, DeviceFile, DeviceMedia } from '@/types/parent'
import { useDevice } from '@/contexts/device-context'
import { useDeviceFeed } from '@/hooks/use-device-feed'
import { AppWindow, Download, FileText, Globe, ImageIcon, Loader2 } from 'lucide-react'
import * as React from 'react'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function BrowserTable({ entries }: { entries: DeviceBrowserHistory[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            {['Date', 'URL', 'Titre'].map((h) => (
              <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {entries.map((e) => (
            <tr key={e.id} className="transition-colors hover:bg-[#fafafa]">
              <td className="px-4 py-3 text-[12px] text-[#374151]">{formatDate(e.visited_at)}</td>
              <td className="max-w-xs truncate px-4 py-3 font-mono text-[11px] text-[#6b7280]">{e.url}</td>
              <td className="max-w-xs truncate px-4 py-3 text-[12px] text-[#374151]">{e.title ?? '—'}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr><td colSpan={3} className="py-12 text-center text-[12px] text-[#9ca3af]">Aucun historique</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function AppsGrid({ apps }: { apps: DeviceInstalledApp[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {apps.map((app) => (
        <div
          key={app.id}
          className={`flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm ${app.is_blocked ? 'opacity-60' : ''}`}
          style={{ border: `1px solid ${app.is_blocked ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.06)'}` }}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#f1f3f7]">
            <AppWindow className="size-5 text-[#6b7280]" />
          </div>
          <p className="truncate text-[13px] font-semibold text-[#111827]">{app.app_name}</p>
          <p className="truncate font-mono text-[10px] text-[#9ca3af]">{app.package_name}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#9ca3af]">{formatDate(app.installed_at)}</span>
            {app.is_blocked && (
              <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-500">BLOQUÉ</span>
            )}
          </div>
        </div>
      ))}
      {apps.length === 0 && (
        <div className="col-span-full py-12 text-center text-[12px] text-[#9ca3af]">Aucune app collectée</div>
      )}
    </div>
  )
}

function FilesTable({ files }: { files: DeviceFile[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            {['Nom', 'Chemin', 'Taille', 'Date'].map((h) => (
              <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.04]">
          {files.map((f) => (
            <tr key={f.id} className="transition-colors hover:bg-[#fafafa]">
              <td className="px-4 py-3 text-[12px] font-medium text-[#111827]">{f.file_name}</td>
              <td className="max-w-xs truncate px-4 py-3 font-mono text-[10px] text-[#9ca3af]">{f.path}</td>
              <td className="px-4 py-3 text-[11px] text-[#6b7280]">{formatSize(f.file_size)}</td>
              <td className="px-4 py-3 text-[12px] text-[#374151]">{formatDate(f.file_created_at)}</td>
            </tr>
          ))}
          {files.length === 0 && (
            <tr><td colSpan={4} className="py-12 text-center text-[12px] text-[#9ca3af]">Aucun fichier</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function MediaGrid({ items, deviceId }: { items: DeviceMedia[]; deviceId: number }) {
  const typeIcon = { image: ImageIcon, video: ImageIcon, audio: FileText }

  const handleDownload = (mediaId: number) => {
    window.open(`/download/api?device_id=${deviceId}&type=media&item_id=${mediaId}`, '_blank')
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((m) => {
        const Icon = typeIcon[m.media_type] ?? FileText
        return (
          <div key={m.id} className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-lg bg-[#f1f3f7]">
                <Icon className="size-6 text-[#6b7280]" />
              </div>
              <button
                type="button"
                onClick={() => handleDownload(m.id)}
                className="flex size-7 items-center justify-center rounded-md text-[#9ca3af] transition-colors hover:bg-[#f1f3f7] hover:text-[#374151]"
                title="Télécharger"
              >
                <Download className="size-3.5" />
              </button>
            </div>
            <p className="truncate text-[12px] font-semibold text-[#111827]">{m.file_name}</p>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#6b7280]">
                {m.media_type}
              </span>
              <span className="text-[10px] text-[#9ca3af]">{formatSize(m.file_size)}</span>
            </div>
            <p className="truncate text-[10px] text-[#9ca3af]">{m.origin_app}</p>
          </div>
        )
      })}
      {items.length === 0 && (
        <div className="col-span-full py-12 text-center text-[12px] text-[#9ca3af]">Aucun média</div>
      )}
    </div>
  )
}

type Tab = 'browser' | 'apps' | 'files' | 'media'

export function ActivityClient() {
  const { activeDevice } = useDevice()
  const [tab, setTab] = React.useState<Tab>('browser')

  const browser = useDeviceFeed<DeviceBrowserHistory>({ routeBase: '/activity', feed: 'browser', queryKey: 'activity-browser', perPage: 100 })
  const apps = useDeviceFeed<DeviceInstalledApp>({ routeBase: '/activity', feed: 'apps', queryKey: 'activity-apps', perPage: 200 })
  const files = useDeviceFeed<DeviceFile>({ routeBase: '/activity', feed: 'files', queryKey: 'activity-files', perPage: 100 })
  const media = useDeviceFeed<DeviceMedia>({ routeBase: '/activity', feed: 'media', queryKey: 'activity-media', perPage: 100 })

  const loading = browser.isLoading

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="size-6 animate-spin text-[#9ca3af]" /></div>
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'browser', label: 'Navigation', icon: Globe, count: browser.data?.meta?.total ?? 0 },
    { key: 'apps', label: 'Applications', icon: AppWindow, count: apps.data?.meta?.total ?? 0 },
    { key: 'files', label: 'Fichiers', icon: FileText, count: files.data?.meta?.total ?? 0 },
    { key: 'media', label: 'Médias', icon: ImageIcon, count: media.data?.meta?.total ?? 0 },
  ]

  return (
    <div className="space-y-5">
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

      {tab === 'browser' && <BrowserTable entries={browser.data?.data ?? []} />}
      {tab === 'apps' && <AppsGrid apps={apps.data?.data ?? []} />}
      {tab === 'files' && <FilesTable files={files.data?.data ?? []} />}
      {tab === 'media' && <MediaGrid items={media.data?.data ?? []} deviceId={activeDevice?.id ?? 0} />}
    </div>
  )
}
