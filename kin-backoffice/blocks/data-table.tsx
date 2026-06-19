'use client'

import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  RowData,
  SortingState,
  Table as TanstackTable,
  Updater,
  VisibilityState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  EyeOff,
  Settings2,
  X,
} from 'lucide-react'
import * as React from 'react'

const emptyArray: unknown[] = []

export type DataTableAction = 'edit' | 'delete' | 'view' | 'configure'

interface DataTableProps<TData extends RowData, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  columnFilters?: ColumnFiltersState
  pagination: PaginationState
  pageCount: number
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>
  onPaginationChange: OnChangeFn<PaginationState>
  onGlobalSearchChange: OnChangeFn<string>
  globalSearch: string
  searchPlaceholder?: string
  onAction?: (action: DataTableAction, row: TData) => void
  columnsLabel?: string
  columnsMenuLabel?: string
  paginationSiblingCount?: number
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
  /** Slot for additional toolbar content (filters, etc.) */
  toolbarExtra?: React.ReactNode
}

export function DataTable<TData extends RowData, TValue = unknown>({
  columns,
  data,
  columnFilters = emptyArray as ColumnFiltersState,
  pagination,
  pageCount,
  onColumnFiltersChange,
  onPaginationChange,
  onGlobalSearchChange,
  globalSearch,
  searchPlaceholder,
  onAction,
  columnsLabel,
  columnsMenuLabel,
  paginationSiblingCount = 2,
  sorting: sortingProp,
  onSortingChange: onSortingChangeProp,
  toolbarExtra,
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const activeSorting = sortingProp ?? internalSorting
  const activeOnSortingChange = onSortingChangeProp ?? setInternalSorting

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: activeSorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
      globalFilter: globalSearch,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: activeOnSortingChange,
    onColumnFiltersChange: onColumnFiltersChange ?? (() => {}),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updaterOrValue: Updater<PaginationState>) => {
      const newPagination =
        typeof updaterOrValue === 'function' ? updaterOrValue(pagination) : updaterOrValue
      onPaginationChange(newPagination)
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    onGlobalFilterChange: onGlobalSearchChange,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    pageCount,
    meta: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onAction: (action: DataTableAction, row: TData) => onAction?.(action, row),
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        table={table}
        searchPlaceholder={searchPlaceholder}
        columnsLabel={columnsLabel}
        columnsMenuLabel={columnsMenuLabel}
        toolbarExtra={toolbarExtra}
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        firstPage={() => table.setPageIndex(0)}
        previousPage={() => table.previousPage()}
        nextPage={() => table.nextPage()}
        lastPage={() => table.setPageIndex(table.getPageCount() - 1)}
        setPage={(page) => table.setPageIndex(page - 1)}
        selectedRows={table.getFilteredSelectedRowModel().rows.length}
        totalRows={table.getFilteredRowModel().rows.length}
        pageIndex={pagination.pageIndex}
        pageCount={pageCount}
        table={table}
        siblingCount={paginationSiblingCount}
      />
    </div>
  )
}

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className="data-[popup-open]:bg-accent -ml-3 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium hover:bg-muted cursor-default outline-none">
          <span>{title}</span>
          {column.getIsSorted() === 'desc' ? (
            <ArrowDown className="size-4" />
          ) : column.getIsSorted() === 'asc' ? (
            <ArrowUp className="size-4" />
          ) : (
            <ChevronsUpDown className="size-4" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp /> Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown /> Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
            <EyeOff /> Masquer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface DataTablePaginationProps<TData> {
  table: TanstackTable<TData>
  canPreviousPage: boolean
  canNextPage: boolean
  siblingCount: number
  firstPage: () => void
  previousPage: () => void
  nextPage: () => void
  lastPage: () => void
  setPage: (page: number) => void
  selectedRows: number
  totalRows: number
  pageIndex: number
  pageCount: number
}

const DOTS = '...'

export function DataTablePagination<TData>({
  table,
  canPreviousPage,
  canNextPage,
  siblingCount,
  firstPage,
  previousPage,
  nextPage,
  lastPage,
  setPage,
  selectedRows,
  totalRows,
  pageIndex,
  pageCount,
}: DataTablePaginationProps<TData>) {
  const ranges = useSelectorRange(pageCount, siblingCount, pageIndex + 1)

  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-muted-foreground flex-1 text-sm">
        {selectedRows > 0 && `${selectedRows} / ${totalRows} ligne(s) sélectionnée(s)`}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Lignes</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 25, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} / {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden size-8 lg:flex"
                  onClick={firstPage}
                  disabled={!canPreviousPage}
                >
                  <span className="sr-only">Première page</span>
                  <ChevronsLeft />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={previousPage}
                  disabled={!canPreviousPage}
                >
                  <span className="sr-only">Page précédente</span>
                  <ChevronLeft />
                </Button>
              </PaginationItem>
              {ranges.map((page, index) => (
                <PaginationItem key={`${index}-${page}`}>
                  {page === DOTS ? (
                    <PaginationEllipsis />
                  ) : (
                    <Button
                      variant={page === pageIndex + 1 ? 'secondary' : 'outline'}
                      size="icon"
                      className="size-8"
                      onClick={() => setPage(Number(page))}
                    >
                      <span>{page}</span>
                    </Button>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  onClick={nextPage}
                  disabled={!canNextPage}
                >
                  <span className="sr-only">Page suivante</span>
                  <ChevronRight />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden size-8 lg:flex"
                  onClick={lastPage}
                  disabled={!canNextPage}
                >
                  <span className="sr-only">Dernière page</span>
                  <ChevronsRight />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  )
}

export function DataTableViewOptions<TData>({
  table,
  triggerLabel,
  menuLabel,
}: {
  table: TanstackTable<TData>
  triggerLabel: string
  menuLabel: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-auto hidden h-8 lg:inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted cursor-default outline-none">
        <Settings2 className="size-4" />
        {triggerLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())
          .map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              className="capitalize"
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {String(column.columnDef.header ?? column.id)}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface DataTableToolbarProps<TData> {
  table: TanstackTable<TData>
  searchPlaceholder?: string
  columnsLabel?: string
  columnsMenuLabel?: string
  toolbarExtra?: React.ReactNode
}

export function DataTableToolbar<TData>({
  table,
  searchPlaceholder,
  columnsLabel,
  columnsMenuLabel,
  toolbarExtra,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().globalFilter

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder={searchPlaceholder ?? 'Rechercher…'}
          value={(table.getState().globalFilter as string) ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            table.setGlobalFilter(event.target.value)
            table.resetPageIndex()
          }}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {toolbarExtra}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              table.setGlobalFilter('')
              table.resetPageIndex()
            }}
          >
            Réinitialiser
            <X />
          </Button>
        )}
      </div>
      {columnsLabel && columnsMenuLabel && (
        <DataTableViewOptions
          table={table}
          triggerLabel={columnsLabel}
          menuLabel={columnsMenuLabel}
        />
      )}
    </div>
  )
}

function range(start: number, end: number) {
  const length = end - start + 1
  return Array.from({ length }, (_, idx) => idx + start)
}

function useSelectorRange(pagesCount: number, siblingCount: number, currentPage: number) {
  return React.useMemo(() => {
    const totalPageNumbers = siblingCount + 5
    if (totalPageNumbers >= pagesCount) return range(1, pagesCount)

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
    const rightSiblingIndex = Math.min(currentPage + siblingCount, pagesCount)
    const shouldShowLeftDots = leftSiblingIndex > 2
    const shouldShowRightDots = rightSiblingIndex < pagesCount - 2

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftRange = range(1, 3 + 2 * siblingCount)
      return [...leftRange, DOTS, pagesCount]
    }
    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightRange = range(pagesCount - (3 + 2 * siblingCount) + 1, pagesCount)
      return [1, DOTS, ...rightRange]
    }
    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex)
      return [1, DOTS, ...middleRange, DOTS, pagesCount]
    }
    return []
  }, [pagesCount, siblingCount, currentPage])
}
