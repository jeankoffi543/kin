'use client'

import type { Admin } from '@/schema/admin'
import type { ResponseCollection } from '@/types/api'
import type { SortingState } from '@tanstack/react-table'
import { DataTable } from '@/blocks/data-table'
import { useDebounce } from '@uidotdev/usehooks'
import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { CreateAdminAction, DeleteAdminAction, EditAdminAction } from './actions'
import { useColumns } from './columns'
import { AdminFilters } from './filters'

async function fetchAdmins(params: Record<string, string>) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== 'all')),
  ).toString()
  const res = await fetch(`/owner/admins/api${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error('Erreur lors du chargement des administrateurs')
  return res.json() as Promise<ResponseCollection<Admin>>
}

interface AdminListingProps {
  initialData: ResponseCollection<Admin>
}

export function AdminListing({ initialData }: AdminListingProps) {
  const columns = useColumns()

  const [globalSearch, setGlobalSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('all')
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = React.useState<SortingState>([])

  const debouncedSearch = useDebounce(globalSearch, 400)

  const sortBy = sorting[0]?.id ?? ''
  const sortDesc = sorting[0]?.desc ? 'true' : ''

  const queryParams = {
    search: debouncedSearch,
    role: roleFilter,
    page: String(pagination.pageIndex + 1),
    per_page: String(pagination.pageSize),
    sort_by: sortBy,
    sort_desc: sortDesc,
  }

  const { data } = useQuery({
    queryKey: ['admins', debouncedSearch, roleFilter, pagination, sortBy, sortDesc],
    queryFn: () => fetchAdmins(queryParams),
    initialData,
    placeholderData: (prev) => prev,
  })

  const [editTarget, setEditTarget] = React.useState<Admin | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Admin | null>(null)

  const handleAction = (action: string, admin: Admin) => {
    if (action === 'edit') setEditTarget(admin)
    if (action === 'delete') setDeleteTarget(admin)
  }

  const pageCount = data?.meta.last_page ?? 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Administrateurs</h1>
          <p className="text-muted-foreground text-sm">
            {data?.meta.total ?? 0} administrateur(s) au total
          </p>
        </div>
        <CreateAdminAction />
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        pagination={pagination}
        pageCount={pageCount}
        onPaginationChange={setPagination}
        globalSearch={globalSearch}
        onGlobalSearchChange={(val) => {
          setGlobalSearch(String(val))
          setPagination((p) => ({ ...p, pageIndex: 0 }))
        }}
        sorting={sorting}
        onSortingChange={(updater) => {
          const next = typeof updater === 'function' ? updater(sorting) : updater
          setSorting(next)
          setPagination((p) => ({ ...p, pageIndex: 0 }))
        }}
        searchPlaceholder="Rechercher un admin…"
        columnsLabel="Colonnes"
        columnsMenuLabel="Afficher les colonnes"
        onAction={handleAction}
        toolbarExtra={
          <AdminFilters
            role={roleFilter}
            onRoleChange={(val) => {
              setRoleFilter(val)
              setPagination((p) => ({ ...p, pageIndex: 0 }))
            }}
          />
        }
      />

      {editTarget && (
        <EditAdminAction data={editTarget} onOpenChange={(open) => { if (!open) setEditTarget(null) }} />
      )}
      {deleteTarget && (
        <DeleteAdminAction admin={deleteTarget} onClose={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}
