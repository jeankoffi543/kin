'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

type Variant = 'light' | 'dark'

interface PaginatorProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  perPageOptions?: number[]
  variant?: Variant
}

function getVisiblePages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = []

  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  } else if (current >= total - 3) {
    pages.push(1)
    pages.push('...')
    for (let i = total - 4; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    pages.push('...')
    for (let i = current - 1; i <= current + 1; i++) pages.push(i)
    pages.push('...')
    pages.push(total)
  }

  return pages
}

const themes = {
  light: {
    selectBg: 'bg-white',
    selectBorder: '1px solid #e5e7eb',
    selectText: 'text-[#374151]',
    meta: 'text-[#9ca3af]',
    btnBorder: '1px solid #e5e7eb',
    btnText: 'text-[#6b7280]',
    btnHover: 'hover:bg-[#f1f3f7]',
    activeBtn: 'bg-[#111827] text-white',
    ellipsis: 'text-[#9ca3af]',
  },
  dark: {
    selectBg: 'bg-[#161920]',
    selectBorder: '1px solid rgba(255,255,255,0.08)',
    selectText: 'text-[#c4c9d9]',
    meta: 'text-[#5b6278]',
    btnBorder: '1px solid rgba(255,255,255,0.08)',
    btnText: 'text-[#5b6278]',
    btnHover: 'hover:bg-white/[0.04]',
    activeBtn: 'bg-amber-500 text-black',
    ellipsis: 'text-[#5b6278]',
  },
}

export function Paginator({
  page,
  totalPages,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 30, 60, 100, 200, 500],
  variant = 'light',
}: PaginatorProps) {
  const pages = getVisiblePages(page, totalPages)
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  const t = themes[variant]

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className={`rounded-lg px-2.5 py-1.5 text-[12px] font-medium outline-none ${t.selectBg} ${t.selectText}`}
          style={{ border: t.selectBorder }}
        >
          {perPageOptions.map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <span className={`text-[11px] ${t.meta}`}>
          {from}–{to} sur {total}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className={`flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-25 disabled:cursor-default ${t.btnText} ${t.btnHover}`}
          style={{ border: t.btnBorder }}
        >
          <ChevronsLeft className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-25 disabled:cursor-default ${t.btnText} ${t.btnHover}`}
          style={{ border: t.btnBorder }}
        >
          <ChevronLeft className="size-3.5" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`e-${i}`} className={`flex size-7 items-center justify-center text-[11px] ${t.ellipsis}`}>
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`flex size-7 items-center justify-center rounded-lg text-[11px] font-semibold transition-colors ${
                p === page ? t.activeBtn : `${t.btnText} ${t.btnHover}`
              }`}
              style={p !== page ? { border: t.btnBorder } : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={`flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-25 disabled:cursor-default ${t.btnText} ${t.btnHover}`}
          style={{ border: t.btnBorder }}
        >
          <ChevronRight className="size-3.5" />
        </button>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className={`flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-25 disabled:cursor-default ${t.btnText} ${t.btnHover}`}
          style={{ border: t.btnBorder }}
        >
          <ChevronsRight className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
