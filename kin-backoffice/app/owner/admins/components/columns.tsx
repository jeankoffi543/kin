'use client'

import type { Admin } from '@/schema/admin'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableColumnHeader } from '@/blocks/data-table'
import { useMemo } from 'react'
import { DataTableRowActions } from './actions'

export function useColumns(): ColumnDef<Admin>[] {
  return useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Tout sélectionner"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Sélectionner la ligne"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Nom" />,
        cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
      },
      {
        accessorKey: 'email',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue('email')}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Rôle" />,
        cell: ({ row }) => {
          const role = row.getValue<string>('role')
          return <Badge variant="secondary">{role}</Badge>
        },
      },
      {
        accessorKey: 'created_at',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Créé le" />,
        cell: ({ row }) => {
          const date = row.getValue<string>('created_at')
          return date ? new Date(date).toLocaleDateString('fr-FR') : '—'
        },
      },
      {
        id: 'actions',
        cell: ({ row, table }) => <DataTableRowActions row={row} table={table} />,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [],
  )
}
