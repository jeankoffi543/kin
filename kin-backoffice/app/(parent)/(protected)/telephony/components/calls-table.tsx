'use client'

import type { DeviceCall } from '@/types/parent'
import type { Meta } from '@/types/api'
import { useDevice } from '@/contexts/device-context'
import { Paginator } from '@/components/ui/paginator'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  Loader2,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Search,
  X,
} from 'lucide-react'

function CallTypeBadge({ type }: { type: DeviceCall['call_type'] }) {
  const cfg = {
    incoming: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', icon: PhoneIncoming, label: 'Entrant' },
    outgoing: { bg: 'bg-blue-500/10', text: 'text-blue-600', icon: PhoneOutgoing, label: 'Sortant' },
    missed: { bg: 'bg-red-500/10', text: 'text-red-500', icon: PhoneMissed, label: 'Manqué' },
  }[type]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
      <Icon className="size-3" />
      {cfg.label}
    </span>
  )
}

function fmtDuration(seconds: number): string {
  if (seconds <= 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function SortIcon({ column, active, direction }: { column: string; active: string; direction: 'asc' | 'desc' }) {
  if (column !== active) return <ChevronsUpDown className="size-3 text-[#d1d5db]" />
  return direction === 'asc' ? <ChevronUp className="size-3 text-[#111827]" /> : <ChevronDown className="size-3 text-[#111827]" />
}

interface CallsTableProps {
  calls: DeviceCall[]
  loading: boolean
  meta?: Meta
  page: number
  perPage: number
  sort: string
  direction: 'asc' | 'desc'
  search: string
  filter: string
  onPageChange: (p: number) => void
  onPerPageChange: (pp: number) => void
  onSort: (col: string) => void
  onSearch: (v: string) => void
  onFilter: (v: string) => void
}

export function CallsTable({
  calls, loading, meta, page, perPage, sort, direction, search, filter,
  onPageChange, onPerPageChange, onSort, onSearch, onFilter,
}: CallsTableProps) {
  const { activeDevice } = useDevice()
  const deviceId = activeDevice?.id ?? 0

  const handleDownload = (callId: number) => {
    window.open(`/telephony/api?device_id=${deviceId}&feed=calls/${callId}/download`, '_blank')
  }

  const columns: { key: string; label: string; sortable: boolean; className?: string }[] = [
    { key: 'recorded_at', label: 'Date', sortable: true },
    { key: 'contact_name', label: 'Contact', sortable: true },
    { key: 'phone_number', label: 'Numéro', sortable: true },
    { key: 'call_type', label: 'Type', sortable: true },
    { key: 'duration', label: 'Durée', sortable: true, className: 'text-right' },
    { key: 'audio', label: 'Audio', sortable: false },
  ]

  const filterOptions = [
    { value: '', label: 'Tous' },
    { value: 'incoming', label: 'Entrants' },
    { value: 'outgoing', label: 'Sortants' },
    { value: 'missed', label: 'Manqués' },
  ]

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2 rounded-lg bg-[#f8f9fb] px-3 py-1.5" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
          <Search className="size-3.5 text-[#9ca3af]" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Rechercher contact, numéro…"
            className="w-48 bg-transparent text-[12px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
          />
          {search && <button type="button" onClick={() => onSearch('')} className="text-[#9ca3af]"><X className="size-3" /></button>}
        </div>

        <div className="flex items-center gap-1.5">
          {filterOptions.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => onFilter(f.value)}
              className="rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={{
                background: filter === f.value ? '#111827' : '#f1f3f7',
                color: filter === f.value ? '#fff' : '#6b7280',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-[#9ca3af]" /></div>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] ${col.className ?? ''} ${col.sortable ? 'cursor-pointer select-none hover:text-[#374151]' : ''}`}
                  onClick={col.sortable ? () => onSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon column={col.key} active={sort} direction={direction} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {calls.map((call) => (
              <tr key={call.id} className="transition-colors hover:bg-[#fafafa]">
                <td className="px-4 py-3 text-[12px] text-[#374151]">{fmtDate(call.recorded_at ?? call.created_at)}</td>
                <td className="px-4 py-3">
                  <span className="text-[12px] font-semibold text-[#111827]">{call.contact_name ?? 'Inconnu'}</span>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-[#6b7280]">{call.phone_number}</td>
                <td className="px-4 py-3"><CallTypeBadge type={call.call_type} /></td>
                <td className="px-4 py-3 text-right font-mono text-[12px] text-[#374151]">{fmtDuration(call.duration)}</td>
                <td className="px-4 py-3">
                  {call.call_recorded ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(call.id)}
                      className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-500/20"
                    >
                      <Download className="size-3" /> Audio
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#d1d5db]">—</span>
                  )}
                </td>
              </tr>
            ))}
            {calls.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[12px] text-[#9ca3af]">
                  {search ? 'Aucun résultat' : 'Aucun appel enregistré'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 0 && (
        <div className="border-t px-4 py-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <Paginator
            page={page}
            totalPages={meta.last_page}
            total={meta.total}
            perPage={perPage}
            onPageChange={onPageChange}
            onPerPageChange={onPerPageChange}
            perPageOptions={[10, 30, 60, 100, 200, 500]}
          />
        </div>
      )}
    </div>
  )
}
