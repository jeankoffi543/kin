'use client'

import type { DeviceCall, DeviceContact } from '@/types/parent'
import { useDeviceFeed } from '@/hooks/use-device-feed'
import { useDebounce } from '@/hooks/use-debounce'
import * as React from 'react'
import { CallsTable } from './calls-table'
import { ContactsGrid } from './contacts-grid'

export function TelephonyClient() {
  const [tab, setTab] = React.useState<'calls' | 'contacts'>('calls')

  // Calls state
  const [cPage, setCPage] = React.useState(1)
  const [cPerPage, setCPerPage] = React.useState(10)
  const [cSort, setCSort] = React.useState('recorded_at')
  const [cDir, setCDir] = React.useState<'asc' | 'desc'>('desc')
  const [cSearch, setCSearch] = React.useState('')
  const [cFilter, setCFilter] = React.useState('')

  // Contacts state
  const [ctPage, setCtPage] = React.useState(1)
  const [ctPerPage, setCtPerPage] = React.useState(10)
  const [ctSort, setCtSort] = React.useState('name')
  const [ctDir, setCtDir] = React.useState<'asc' | 'desc'>('asc')
  const [ctSearch, setCtSearch] = React.useState('')

  // Debounce search inputs (500ms) — avoids hammering the API on each keystroke
  const debouncedCSearch = useDebounce(cSearch, 500)
  const debouncedCtSearch = useDebounce(ctSearch, 500)

  const calls = useDeviceFeed<DeviceCall>({
    routeBase: '/telephony',
    feed: 'calls',
    queryKey: 'telephony-calls',
    page: cPage,
    perPage: cPerPage,
    sort: cSort,
    direction: cDir,
    search: debouncedCSearch || undefined,
    extraParams: cFilter ? { 'call_type__eq': cFilter } : undefined,
    refetchInterval: 30_000,
  })

  const contacts = useDeviceFeed<DeviceContact>({
    routeBase: '/telephony',
    feed: 'contacts',
    queryKey: 'telephony-contacts',
    page: ctPage,
    perPage: ctPerPage,
    sort: ctSort,
    direction: ctDir,
    search: debouncedCtSearch || undefined,
  })

  const cMeta = calls.data?.meta
  const ctMeta = contacts.data?.meta

  const handleCSort = (col: string) => {
    if (cSort === col) {
      setCDir(cDir === 'asc' ? 'desc' : 'asc')
    } else {
      setCSort(col)
      setCDir(col === 'recorded_at' ? 'desc' : 'asc')
    }
    setCPage(1)
  }

  const handleCtSort = (col: string) => {
    if (ctSort === col) {
      setCtDir(ctDir === 'asc' ? 'desc' : 'asc')
    } else {
      setCtSort(col)
      setCtDir('asc')
    }
    setCtPage(1)
  }

  return (
    <div className="space-y-5">
      <div
        className="flex w-fit gap-1 rounded-xl bg-white p-1 shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <button
          type="button"
          onClick={() => setTab('calls')}
          className={`rounded-lg px-4 py-2 text-[12px] font-semibold transition-all ${
            tab === 'calls' ? 'bg-[#111827] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#374151]'
          }`}
        >
          Journal d&apos;appels ({cMeta?.total ?? '…'})
        </button>
        <button
          type="button"
          onClick={() => setTab('contacts')}
          className={`rounded-lg px-4 py-2 text-[12px] font-semibold transition-all ${
            tab === 'contacts' ? 'bg-[#111827] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#374151]'
          }`}
        >
          Contacts ({ctMeta?.total ?? '…'})
        </button>
      </div>

      {tab === 'calls' && (
        <CallsTable
          calls={calls.data?.data ?? []}
          loading={calls.isLoading}
          meta={cMeta}
          page={cPage}
          perPage={cPerPage}
          sort={cSort}
          direction={cDir}
          search={cSearch}
          filter={cFilter}
          onPageChange={setCPage}
          onPerPageChange={(pp) => { setCPerPage(pp); setCPage(1) }}
          onSort={handleCSort}
          onSearch={(v) => { setCSearch(v); setCPage(1) }}
          onFilter={(v) => { setCFilter(v); setCPage(1) }}
        />
      )}

      {tab === 'contacts' && (
        <ContactsGrid
          contacts={contacts.data?.data ?? []}
          loading={contacts.isLoading}
          meta={ctMeta}
          page={ctPage}
          perPage={ctPerPage}
          sort={ctSort}
          direction={ctDir}
          search={ctSearch}
          onPageChange={setCtPage}
          onPerPageChange={(pp) => { setCtPerPage(pp); setCtPage(1) }}
          onSort={handleCtSort}
          onSearch={(v) => { setCtSearch(v); setCtPage(1) }}
        />
      )}
    </div>
  )
}
