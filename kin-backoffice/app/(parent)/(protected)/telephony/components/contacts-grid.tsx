'use client'

import type { DeviceContact } from '@/types/parent'
import type { Meta } from '@/types/api'
import { Paginator } from '@/components/ui/paginator'
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
  Phone,
  Search,
  User,
  X,
} from 'lucide-react'

function SortIcon({ column, active, direction }: { column: string; active: string; direction: 'asc' | 'desc' }) {
  if (column !== active) return <ChevronsUpDown className="size-3 text-[#d1d5db]" />
  return direction === 'asc' ? <ChevronUp className="size-3 text-[#111827]" /> : <ChevronDown className="size-3 text-[#111827]" />
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

interface ContactsGridProps {
  contacts: DeviceContact[]
  loading: boolean
  meta?: Meta
  page: number
  perPage: number
  sort: string
  direction: 'asc' | 'desc'
  search: string
  onPageChange: (p: number) => void
  onPerPageChange: (pp: number) => void
  onSort: (col: string) => void
  onSearch: (v: string) => void
}

export function ContactsGrid({
  contacts, loading, meta, page, perPage, sort, direction, search,
  onPageChange, onPerPageChange, onSort, onSearch,
}: ContactsGridProps) {
  const sortOptions = [
    { key: 'name', label: 'Nom' },
    { key: 'phone_number', label: 'Numéro' },
    { key: 'created_at', label: 'Date' },
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
            placeholder="Rechercher nom, numéro…"
            className="w-48 bg-transparent text-[12px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
          />
          {search && <button type="button" onClick={() => onSearch('')} className="text-[#9ca3af]"><X className="size-3" /></button>}
        </div>

        <div className="flex items-center gap-1.5">
          {sortOptions.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onSort(s.key)}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors"
              style={{
                background: sort === s.key ? '#111827' : '#f1f3f7',
                color: sort === s.key ? '#fff' : '#6b7280',
              }}
            >
              {s.label}
              <SortIcon column={s.key} active={sort} direction={direction} />
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
              {[
                { key: 'name', label: 'Nom', sortable: true },
                { key: 'phone_number', label: 'Numéro', sortable: true },
                { key: 'created_at', label: 'Ajouté le', sortable: true },
                { key: 'status', label: 'Statut', sortable: false },
              ].map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] ${col.sortable ? 'cursor-pointer select-none hover:text-[#374151]' : ''}`}
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
            {contacts.map((c) => {
              const initials = c.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
              return (
                <tr key={c.id} className="transition-colors hover:bg-[#fafafa]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f1f3f7] text-[11px] font-bold text-[#374151]">
                        {initials || <User className="size-3.5" />}
                      </div>
                      <span className="text-[12px] font-semibold text-[#111827]">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 font-mono text-[11px] text-[#6b7280]">
                      <Phone className="size-3 text-[#d1d5db]" />
                      {c.phone_number}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">{fmtDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    {c.deleted_at_source ? (
                      <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-500">Supprimé</span>
                    ) : (
                      <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Actif</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="py-12 text-center text-[12px] text-[#9ca3af]">
                  {search ? 'Aucun résultat' : 'Aucun contact enregistré'}
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
