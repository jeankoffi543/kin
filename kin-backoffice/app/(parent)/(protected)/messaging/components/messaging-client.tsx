'use client'

import type { SmsThread, DeviceSms, SmsStatus, DeviceSocialMessage } from '@/types/parent'
import type { ResponseCollection } from '@/types/api'
import { useDevice } from '@/contexts/device-context'
import { Paginator } from '@/components/ui/paginator'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronUp,
  Filter,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  SortDesc,
  Trash2,
  X,
} from 'lucide-react'
import * as React from 'react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return "À l'instant"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff < 7 * 86_400_000) return d.toLocaleDateString('fr-FR', { weekday: 'short' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function fmtTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDayLabel(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return "Aujourd'hui"
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function avatarColor(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  const c = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#0ea5e9', '#14b8a6', '#a855f7']
  return c[Math.abs(h) % c.length]
}

function initials(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '?'
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  received: { label: 'Reçu', color: '#10b981', bg: '#ecfdf5' },
  delivered: { label: 'Envoyé', color: '#3b82f6', bg: '#eff6ff' },
  failed: { label: 'Échoué', color: '#ef4444', bg: '#fef2f2' },
  draft: { label: 'Brouillon', color: '#9ca3af', bg: '#f3f4f6' },
  sending: { label: 'En cours', color: '#f59e0b', bg: '#fffbeb' },
  queued: { label: "File d'attente", color: '#8b5cf6', bg: '#f5f3ff' },
}

function StatusBadge({ status }: { status: SmsStatus | null }) {
  if (!status || status === 'received' || status === 'delivered') return null
  const info = STATUS_LABELS[status] ?? STATUS_LABELS.received
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
      style={{ background: info.bg, color: info.color }}
    >
      {status === 'failed' && <AlertTriangle className="size-2.5" />}
      {info.label}
    </span>
  )
}

// ── Data fetching ────────────────────────────────────────────────────────────

async function fetchThreads(deviceId: number, page: number, perPage: number): Promise<ResponseCollection<SmsThread>> {
  const qs = new URLSearchParams({ device_id: String(deviceId), feed: 'sms/threads', page: String(page), per_page: String(perPage) })
  const res = await fetch(`/messaging/api?${qs}`)
  if (!res.ok) throw new Error('fetch error')
  return res.json()
}

async function fetchMessages(
  deviceId: number,
  address: string,
  page: number,
  perPage: number,
  filters?: { search?: string; status?: string; dateFrom?: string; dateTo?: string },
): Promise<ResponseCollection<DeviceSms>> {
  const qs = new URLSearchParams({
    device_id: String(deviceId),
    feed: 'sms',
    address,
    page: String(page),
    per_page: String(perPage),
  })
  if (filters?.search) qs.set('search', filters.search)
  if (filters?.status) qs.set('sms_status__eq', filters.status)
  if (filters?.dateFrom && filters?.dateTo) qs.set('date__between', `${filters.dateFrom},${filters.dateTo}`)
  const res = await fetch(`/messaging/api?${qs}`)
  if (!res.ok) throw new Error('fetch error')
  return res.json()
}

// ── Thread list item ─────────────────────────────────────────────────────────

function ThreadItem({ thread, active, onClick }: { thread: SmsThread; active: boolean; onClick: () => void }) {
  const label = thread.contact_name ?? thread.address
  const init = initials(label)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 border-b px-3.5 py-3 text-left transition-colors"
      style={{ borderColor: 'rgba(0,0,0,0.04)', background: active ? 'rgba(245,158,11,0.06)' : 'transparent' }}
    >
      <div
        className="flex size-[38px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
        style={{ background: avatarColor(thread.normalized_address) }}
      >
        {init}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-[13.5px] font-semibold text-[#111827]">{label}</span>
          <span className="shrink-0 text-[11px] text-[#9ca3af]">{fmtRelative(thread.last_date)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          {thread.last_type === 'sent' && <span className="shrink-0 text-[10px] text-[#9ca3af]">Vous :</span>}
          <p className="truncate text-[12px] text-[#6b7280]">{thread.last_body}</p>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          {thread.failed_count > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] font-semibold text-[#ef4444]">
              <AlertTriangle className="size-2.5" />{thread.failed_count} échoué{thread.failed_count > 1 ? 's' : ''}
            </span>
          )}
          {thread.deleted_count > 0 && (
            <span className="flex items-center gap-0.5 text-[9px] font-semibold text-[#9ca3af]">
              <Trash2 className="size-2.5" />{thread.deleted_count} supprimé{thread.deleted_count > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      {thread.unread && (
        <div className="size-[7px] shrink-0 rounded-full" style={{ background: '#f59e0b' }} />
      )}
    </button>
  )
}

// ── Thread list toolbar ──────────────────────────────────────────────────────

function Toolbar({ search, onSearch, filter, onFilter, sort, onSort }: {
  search: string; onSearch: (v: string) => void
  filter: string; onFilter: (v: string) => void
  sort: string; onSort: (v: string) => void
}) {
  const filters = [
    { id: 'all', label: 'Tout' },
    { id: 'sms', label: 'SMS' },
    { id: 'failed', label: 'Échoués' },
    { id: 'deleted', label: 'Supprimés' },
  ]
  return (
    <div className="space-y-2 border-b px-3 pb-2.5 pt-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2 rounded-lg bg-[#f8f9fb] px-2.5 py-1.5" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <Search className="size-3.5 shrink-0 text-[#9ca3af]" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Rechercher…"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
        />
        {search && <button type="button" onClick={() => onSearch('')} className="text-[#9ca3af]"><X className="size-3" /></button>}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onFilter(f.id)}
              className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition-colors"
              style={{
                background: filter === f.id ? '#111827' : '#f1f3f7',
                color: filter === f.id ? '#fff' : '#6b7280',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onSort(sort === 'date' ? 'unread' : sort === 'unread' ? 'name' : 'date')}
          className="flex shrink-0 items-center gap-0.5 text-[9px] font-medium text-[#9ca3af] hover:text-[#6b7280]"
        >
          <SortDesc className="size-2.5" />
          {sort === 'date' ? 'Date' : sort === 'unread' ? 'Non-lus' : 'Nom'}
        </button>
      </div>
    </div>
  )
}

// ── Conversation filters bar ─────────────────────────────────────────────────

function ConversationToolbar({
  search, onSearch, status, onStatus, dateFrom, dateTo, onDateRange, onClear,
}: {
  search: string; onSearch: (v: string) => void
  status: string; onStatus: (v: string) => void
  dateFrom: string; dateTo: string
  onDateRange: (from: string, to: string) => void
  onClear: () => void
}) {
  const hasFilters = search || status || dateFrom || dateTo
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-1.5 rounded-md bg-[#f8f9fb] px-2.5 py-1" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
        <Search className="size-3 text-[#9ca3af]" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Rechercher…"
          className="w-32 bg-transparent text-[11px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
        />
        {search && <button type="button" onClick={() => onSearch('')} className="text-[#9ca3af]"><X className="size-2.5" /></button>}
      </div>

      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="rounded-md bg-[#f8f9fb] px-2 py-1 text-[11px] text-[#374151] outline-none"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <option value="">Tout statut</option>
        <option value="received">Reçu</option>
        <option value="delivered">Envoyé</option>
        <option value="failed">Échoué</option>
        <option value="draft">Brouillon</option>
        <option value="sending">En cours</option>
        <option value="queued">En attente</option>
      </select>

      <div className="flex items-center gap-1">
        <Calendar className="size-3 text-[#9ca3af]" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateRange(e.target.value, dateTo)}
          className="rounded-md bg-[#f8f9fb] px-1.5 py-1 text-[11px] text-[#374151] outline-none"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        />
        <span className="text-[10px] text-[#9ca3af]">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateRange(dateFrom, e.target.value)}
          className="rounded-md bg-[#f8f9fb] px-1.5 py-1 text-[11px] text-[#374151] outline-none"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        />
      </div>

      {hasFilters && (
        <button type="button" onClick={onClear} className="flex items-center gap-1 text-[10px] font-medium text-[#ef4444] hover:underline">
          <X className="size-3" /> Effacer
        </button>
      )}
    </div>
  )
}

// ── Conversation panel ───────────────────────────────────────────────────────

function ConversationPanel({ thread, deviceId, onBack }: { thread: SmsThread; deviceId: number; onBack: () => void }) {
  const [page, setPage] = React.useState(1)
  const [allMessages, setAllMessages] = React.useState<DeviceSms[]>([])
  const [totalPages, setTotalPages] = React.useState(1)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const prevAddress = React.useRef('')
  const label = thread.contact_name ?? thread.address

  const [convSearch, setConvSearch] = React.useState('')
  const [convStatus, setConvStatus] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')

  const hasConvFilters = convSearch || convStatus || dateFrom || dateTo
  const convFilters = React.useMemo(
    () => ({ search: convSearch || undefined, status: convStatus || undefined, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [convSearch, convStatus, dateFrom, dateTo],
  )

  const firstLoad = useQuery({
    queryKey: ['sms-conv-first', deviceId, thread.address, convFilters],
    queryFn: async () => {
      const lastPageRes = await fetchMessages(deviceId, thread.address, 1, 50, convFilters)
      const tp = lastPageRes.meta.last_page
      if (tp <= 1) return lastPageRes
      return fetchMessages(deviceId, thread.address, tp, 50, convFilters)
    },
    enabled: deviceId > 0,
    refetchOnWindowFocus: false,
  })

  React.useEffect(() => {
    if (thread.address !== prevAddress.current) {
      prevAddress.current = thread.address
      setAllMessages([])
      setPage(1)
      setConvSearch('')
      setConvStatus('')
      setDateFrom('')
      setDateTo('')
    }
  }, [thread.address])

  React.useEffect(() => {
    if (firstLoad.data) {
      setTotalPages(firstLoad.data.meta.last_page)
      setPage(firstLoad.data.meta.current_page)
      setAllMessages(firstLoad.data.data)
      requestAnimationFrame(() => {
        const el = scrollRef.current
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  }, [firstLoad.data])

  const loadOlderPage = React.useCallback(async () => {
    if (loadingMore || page <= 1) return
    setLoadingMore(true)
    const prevPage = page - 1
    const container = scrollRef.current
    const prevHeight = container?.scrollHeight ?? 0
    try {
      const res = await fetchMessages(deviceId, thread.address, prevPage, 50, convFilters)
      setAllMessages((prev) => [...res.data, ...prev])
      setPage(prevPage)
      requestAnimationFrame(() => {
        if (container) {
          const newHeight = container.scrollHeight
          container.scrollTop = newHeight - prevHeight
        }
      })
    } finally {
      setLoadingMore(false)
    }
  }, [deviceId, thread.address, page, loadingMore, convFilters])

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container || !firstLoad.data) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page > 1 && !loadingMore) {
          loadOlderPage()
        }
      },
      { root: container, threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [page, loadingMore, loadOlderPage, firstLoad.data])

  const grouped = React.useMemo(() => {
    const days: { label: string; msgs: DeviceSms[] }[] = []
    let cur = ''
    for (const m of allMessages) {
      const dl = fmtDayLabel(m.date)
      if (dl !== cur) { cur = dl; days.push({ label: dl, msgs: [] }) }
      days[days.length - 1].msgs.push(m)
    }
    return days
  }, [allMessages])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <button type="button" onClick={onBack} className="text-[#6b7280] hover:text-[#374151] lg:hidden">
          <ArrowLeft className="size-4" />
        </button>
        <div
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
          style={{ background: avatarColor(thread.normalized_address) }}
        >
          {initials(label)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-[#111827]">{label}</div>
          <div className="flex items-center gap-1 text-[12px] text-[#9ca3af]">
            <Phone className="size-2.5" />
            <span className="font-mono">{thread.address}</span>
            <span>·</span>
            <span>{thread.message_count} msg</span>
            {thread.failed_count > 0 && (
              <>
                <span>·</span>
                <span className="text-[#ef4444]">{thread.failed_count} échoué{thread.failed_count > 1 ? 's' : ''}</span>
              </>
            )}
            {thread.deleted_count > 0 && (
              <>
                <span>·</span>
                <span className="text-[#9ca3af]">{thread.deleted_count} supprimé{thread.deleted_count > 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConvSearch(convSearch ? '' : ' ')}
          className="flex size-7 items-center justify-center rounded-lg text-[#9ca3af] hover:bg-[#f1f3f7] hover:text-[#374151]"
        >
          <Filter className="size-3.5" />
        </button>
      </div>

      {/* Conversation filters */}
      {(hasConvFilters || convSearch === ' ') && (
        <ConversationToolbar
          search={convSearch.trim()}
          onSearch={setConvSearch}
          status={convStatus}
          onStatus={setConvStatus}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateRange={(f, t) => { setDateFrom(f); setDateTo(t) }}
          onClear={() => { setConvSearch(''); setConvStatus(''); setDateFrom(''); setDateTo('') }}
        />
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div ref={sentinelRef} className="h-1 shrink-0" />

        {loadingMore && (
          <div className="flex justify-center py-2">
            <Loader2 className="size-4 animate-spin text-[#9ca3af]" />
          </div>
        )}

        {page > 1 && !loadingMore && (
          <button type="button" onClick={loadOlderPage} className="mx-auto flex items-center gap-1 rounded-lg px-3 py-1 text-[11px] text-[#9ca3af] hover:bg-[#f1f3f7]">
            <ChevronUp className="size-3" />
            Charger plus ancien
          </button>
        )}

        {grouped.map((group) => (
          <React.Fragment key={group.label}>
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-black/[0.06]" />
              <span className="text-[10px] font-medium text-[#9ca3af]">{group.label}</span>
              <div className="h-px flex-1 bg-black/[0.06]" />
            </div>
            {group.msgs.map((sms) => {
              const incoming = sms.type === 'inbox'
              const isDeleted = sms.deleted_at_source
              const isFailed = sms.sms_status === 'failed'

              return (
                <div key={sms.id} className={`flex ${incoming ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className="relative max-w-[72%] px-3.5 py-2.5 text-[13.5px]"
                    style={{
                      background: isDeleted ? '#fef2f2' : isFailed ? '#fff7ed' : incoming ? '#f1f3f7' : '#f59e0b',
                      color: isDeleted ? '#9ca3af' : incoming ? '#111827' : '#000',
                      borderRadius: incoming ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      opacity: isDeleted ? 0.7 : 1,
                      textDecoration: isDeleted ? 'line-through' : 'none',
                    }}
                  >
                    <div className="whitespace-pre-wrap">{sms.body}</div>
                    <div className="mt-1 flex items-center justify-end gap-1.5">
                      <StatusBadge status={sms.sms_status} />
                      {isDeleted && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#ef4444]">
                          <Trash2 className="size-2.5" />Supprimé
                        </span>
                      )}
                      <span className="text-[10px]" style={{ opacity: 0.45 }}>{fmtTime(sms.date)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </React.Fragment>
        ))}

        {firstLoad.isLoading && (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-[#9ca3af]" />
          </div>
        )}

        {allMessages.length === 0 && !firstLoad.isLoading && (
          <div className="py-16 text-center text-[12px] text-[#9ca3af]">
            {hasConvFilters ? 'Aucun message trouvé pour ces filtres' : 'Aucun message'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-[#9ca3af]">
      <MessageSquare className="size-10 opacity-20" />
      <p className="text-[13px]">Sélectionnez une conversation</p>
    </div>
  )
}

// ── Social panel ─────────────────────────────────────────────────────────────

function SocialPanel({ deviceId }: { deviceId: number }) {
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(30)
  const [platform, setPlatform] = React.useState('whatsapp')
  const qs = new URLSearchParams({ device_id: String(deviceId), feed: 'social', page: String(page), per_page: String(perPage) })
  const query = useQuery({
    queryKey: ['msg-social', deviceId, page, perPage],
    queryFn: async () => { const r = await fetch(`/messaging/api?${qs}`); if (!r.ok) throw new Error('err'); return r.json() as Promise<ResponseCollection<DeviceSocialMessage>> },
  })
  const data = query.data?.data ?? []
  const meta = query.data?.meta

  const platforms = [
    { id: 'whatsapp', label: 'WhatsApp', color: '#25D366' },
    { id: 'telegram', label: 'Telegram', color: '#229ED9' },
    { id: 'instagram', label: 'Instagram', color: '#C13584' },
    { id: 'tiktok', label: 'TikTok', color: '#111' },
  ]

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-center gap-2 border-b px-4 py-3.5" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        {platforms.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPlatform(p.id)}
            className="rounded-md px-3 py-1 text-[12.5px] font-semibold"
            style={{
              background: platform === p.id ? p.color : `${p.color}18`,
              color: platform === p.id ? '#fff' : p.color,
              border: 'none',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="min-h-[400px] p-4">
        {data.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.filter((m) => m.platform.toLowerCase().includes(platform)).map((m) => (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[72%] rounded-[4px_14px_14px_14px] bg-[#f1f3f7] px-3.5 py-2.5 text-[13.5px] text-[#111827]">
                  <div className="mb-0.5 text-[10px] font-semibold text-[#6b7280]">{m.sender_name}</div>
                  <div className="whitespace-pre-wrap">{m.message}</div>
                  <div className="mt-1 text-right text-[10px]" style={{ opacity: 0.45 }}>{fmtTime(m.date)}</div>
                </div>
              </div>
            ))}
            {data.filter((m) => m.platform.toLowerCase().includes(platform)).length === 0 && (
              <p className="py-10 text-center text-[13.5px] text-[#9ca3af]">
                Aucun message {platforms.find((p) => p.id === platform)?.label} intercepté
              </p>
            )}
          </div>
        ) : (
          <p className="py-10 text-center text-[13.5px] text-[#9ca3af]">Aucun message social collecté</p>
        )}
      </div>
      {meta && meta.last_page > 1 && (
        <div className="border-t px-4 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <Paginator page={page} totalPages={meta.last_page} total={meta.total} perPage={perPage} onPageChange={setPage} onPerPageChange={(pp) => { setPerPage(pp); setPage(1) }} />
        </div>
      )}
    </div>
  )
}

// ── Compact paginator for 280px panel ────────────────────────────────────────

function compactPages(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

function CompactPaginator({ page, lastPage, total, perPage, onPageChange, onPerPageChange }: {
  page: number; lastPage: number; total: number; perPage: number
  onPageChange: (p: number) => void; onPerPageChange: (pp: number) => void
}) {
  const pages = compactPages(page, lastPage)
  const s = 'flex size-[22px] items-center justify-center rounded text-[10px] transition-colors'
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-center gap-[3px]">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(1)} className={`${s} text-[#6b7280] hover:bg-[#f1f3f7] disabled:opacity-25`} style={{ border: '1px solid #e5e7eb' }}>«</button>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`${s} text-[#6b7280] hover:bg-[#f1f3f7] disabled:opacity-25`} style={{ border: '1px solid #e5e7eb' }}>‹</button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e${i}`} className="px-0.5 text-[10px] text-[#9ca3af]">…</span>
          ) : (
            <button key={p} type="button" onClick={() => onPageChange(p)}
              className={`${s} font-semibold`}
              style={{ background: p === page ? '#111827' : 'transparent', color: p === page ? '#fff' : '#6b7280', border: p === page ? 'none' : '1px solid #e5e7eb' }}
            >{p}</button>
          ),
        )}
        <button type="button" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)} className={`${s} text-[#6b7280] hover:bg-[#f1f3f7] disabled:opacity-25`} style={{ border: '1px solid #e5e7eb' }}>›</button>
        <button type="button" disabled={page >= lastPage} onClick={() => onPageChange(lastPage)} className={`${s} text-[#6b7280] hover:bg-[#f1f3f7] disabled:opacity-25`} style={{ border: '1px solid #e5e7eb' }}>»</button>
      </div>
      <div className="flex items-center justify-between">
        <select value={perPage} onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#374151] outline-none"
          style={{ border: '1px solid #e5e7eb' }}>
          {[10, 30, 60, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <span className="text-[10px] text-[#9ca3af]">{(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} sur {total}</span>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function MessagingClient() {
  const { activeDevice } = useDevice()
  const deviceId = activeDevice?.id ?? 0
  const [tab, setTab] = React.useState<'sms' | 'social'>('sms')
  const [activeThread, setActiveThread] = React.useState<SmsThread | null>(null)
  const [page, setPage] = React.useState(1)
  const [perPage, setPerPage] = React.useState(30)
  const [search, setSearch] = React.useState('')
  const [filter, setFilter] = React.useState('all')
  const [sort, setSort] = React.useState('date')

  const threadsQuery = useQuery({
    queryKey: ['sms-threads', deviceId, page, perPage],
    queryFn: () => fetchThreads(deviceId, page, perPage),
    enabled: deviceId > 0,
    refetchInterval: 30_000,
  })

  const threads = React.useMemo(() => {
    let list = threadsQuery.data?.data ?? []
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((t) =>
        t.address.toLowerCase().includes(q) ||
        (t.contact_name ?? '').toLowerCase().includes(q) ||
        t.last_body.toLowerCase().includes(q),
      )
    }
    if (filter === 'failed') list = list.filter((t) => t.failed_count > 0)
    if (filter === 'deleted') list = list.filter((t) => t.deleted_count > 0)
    if (sort === 'unread') list = [...list].sort((a, b) => (a.unread === b.unread ? 0 : a.unread ? -1 : 1))
    if (sort === 'name') list = [...list].sort((a, b) => (a.contact_name ?? a.address).localeCompare(b.contact_name ?? b.address))
    return list
  }, [threadsQuery.data?.data, search, filter, sort])

  const meta = threadsQuery.data?.meta

  const smsTotal = meta?.total ?? 0
  const socialCountQuery = useQuery({
    queryKey: ['social-cnt', deviceId],
    queryFn: async () => { const r = await fetch(`/messaging/api?device_id=${deviceId}&feed=social&per_page=1`); return r.ok ? (r.json() as Promise<ResponseCollection<DeviceSocialMessage>>) : { meta: { total: 0 } } as any },
    enabled: deviceId > 0,
  })
  const socialTotal = socialCountQuery.data?.meta?.total ?? 0

  if (deviceId === 0) {
    return <div className="flex flex-1 items-center justify-center bg-[#f1f3f7] text-[13px] text-[#9ca3af]">Aucun appareil</div>
  }

  return (
    <div className="flex-1 overflow-auto bg-[#f1f3f7]">
      <div className="p-6">
        <div className="mb-5 flex w-fit gap-1 rounded-[10px] bg-[#f1f3f7] p-1">
          <button
            type="button"
            onClick={() => { setTab('sms'); setActiveThread(null) }}
            className="rounded-[7px] px-4 py-[7px] text-[13.5px] font-semibold transition-all"
            style={{
              background: tab === 'sms' ? '#fff' : 'transparent',
              color: tab === 'sms' ? '#111827' : '#6b7280',
              boxShadow: tab === 'sms' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            SMS ({smsTotal})
          </button>
          <button
            type="button"
            onClick={() => { setTab('social'); setActiveThread(null) }}
            className="rounded-[7px] px-4 py-[7px] text-[13.5px] font-semibold transition-all"
            style={{
              background: tab === 'social' ? '#fff' : 'transparent',
              color: tab === 'social' ? '#111827' : '#6b7280',
              boxShadow: tab === 'social' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Messageries sociales ({socialTotal})
          </button>
        </div>

        {tab === 'sms' && (
          <div
            className="flex overflow-hidden rounded-xl bg-white shadow-sm"
            style={{ border: '1px solid rgba(0,0,0,0.06)', height: 'calc(100vh - 190px)' }}
          >
            <div className="flex w-[280px] shrink-0 flex-col overflow-hidden" style={{ borderRight: '1px solid rgba(0,0,0,0.06)' }}>
              <Toolbar search={search} onSearch={setSearch} filter={filter} onFilter={(f) => { setFilter(f); setPage(1) }} sort={sort} onSort={setSort} />

              <div className="flex-1 overflow-y-auto">
                {threadsQuery.isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-[#9ca3af]" /></div>
                ) : threads.length === 0 ? (
                  <div className="px-4 py-12 text-center text-[12px] text-[#9ca3af]">{search ? 'Aucun résultat' : 'Aucune conversation'}</div>
                ) : (
                  threads.map((t) => (
                    <ThreadItem
                      key={t.normalized_address}
                      thread={t}
                      active={activeThread?.normalized_address === t.normalized_address}
                      onClick={() => setActiveThread(t)}
                    />
                  ))
                )}
              </div>

              {meta && meta.last_page > 1 && (
                <div className="shrink-0 border-t px-2 py-2" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <CompactPaginator page={page} lastPage={meta.last_page} total={meta.total} perPage={perPage} onPageChange={setPage} onPerPageChange={(pp) => { setPerPage(pp); setPage(1) }} />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {activeThread ? (
                <ConversationPanel thread={activeThread} deviceId={deviceId} onBack={() => setActiveThread(null)} />
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        )}

        {tab === 'social' && <SocialPanel deviceId={deviceId} />}
      </div>
    </div>
  )
}
