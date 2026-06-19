'use client'

import type { Admin, CreateInput, EditInput } from '@/schema/admin'
import type { FormState, ResponseCollection } from '@/types/api'
import type { Row, Table } from '@tanstack/react-table'
import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useActionForm } from '@/hooks/use-action-form'
import { adminRoles } from '@/schema/admin'
import { createAdmin, deleteAdmin, updateAdmin } from '@/app/actions/admin'
import { useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { toast } from 'sonner'

interface DataTableRowActionsProps {
  row: Row<Admin>
  table: Table<Admin>
}

export function DataTableRowActions({ row, table }: DataTableRowActionsProps) {
  const admin = row.original
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = table.options.meta as any

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="data-[popup-open]:bg-muted inline-flex size-8 items-center justify-center rounded-md bg-transparent text-sm hover:bg-muted cursor-default outline-none">
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Ouvrir le menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => meta?.onAction?.('edit', admin)}>
          Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => meta?.onAction?.('delete', admin)}
        >
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CreateAdminAction() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = React.useState(searchParams.has('new'))

  const onOpenChange = (next: boolean) => {
    const query = new URLSearchParams(searchParams.toString())
    if (next) query.append('new', '')
    else query.delete('new')
    const qs = query.toString()
    setOpen(next)
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <FormDialog
      formDefaultValues={{ name: '', email: '', password: '', role: 'admin' }}
      open={open}
      action={createAdmin}
      isCreateForm
      onOpenChange={onOpenChange}
    />
  )
}

interface EditAdminActionProps {
  data: Admin
  onOpenChange?: (next: boolean) => void
}

export function EditAdminAction({ data, onOpenChange }: EditAdminActionProps) {
  const [open, setOpen] = React.useState(true)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    onOpenChange?.(next)
  }

  return (
    <FormDialog
      formDefaultValues={{
        _method: 'PUT',
        name: data.name,
        email: data.email,
        password: '',
        role: data.role,
      }}
      open={open}
      action={updateAdmin}
      onOpenChange={handleOpenChange}
      defaultState={{ success: false, data }}
      adminId={data.id}
    />
  )
}

interface FormDialogProps {
  formDefaultValues: Partial<CreateInput & EditInput & { id?: number }>
  action: (
    state: FormState<Admin>,
    payload: FormData,
  ) => FormState<Admin> | Promise<FormState<Admin>>
  isCreateForm?: boolean
  onOpenChange?: (next: boolean) => void
  open: boolean
  defaultState?: FormState<Admin>
  adminId?: number
}

function FormDialog({
  formDefaultValues,
  action,
  isCreateForm = false,
  open,
  onOpenChange,
  defaultState,
  adminId,
}: FormDialogProps) {
  const queryClient = useQueryClient()

  const handleSuccess = (data?: Admin) => {
    onOpenChange?.(false)
    if (!data) return

    queryClient
      .getQueriesData<ResponseCollection<Admin>>({ queryKey: ['admins'] })
      .forEach(([queryKey, existing]) => {
        if (!existing) return

        const existingIndex = existing.data.findIndex((item) => item.id === data.id)
        const canInsert = existingIndex === -1 && isCreateForm && existing.meta.current_page === 1

        if (!canInsert && existingIndex === -1) return

        const updatedData =
          existingIndex !== -1
            ? existing.data.map((item, i) => (i === existingIndex ? data : item))
            : [...existing.data, data]

        const trimmed = updatedData.slice(0, existing.meta.per_page)
        const nextTotal = existing.meta.total + (existingIndex === -1 ? 1 : 0)

        queryClient.setQueryData(queryKey, {
          ...existing,
          data: trimmed,
          meta: {
            ...existing.meta,
            total: nextTotal,
            last_page: Math.max(
              existing.meta.last_page,
              Math.ceil(nextTotal / existing.meta.per_page),
            ),
            to:
              existing.meta.current_page === 1
                ? Math.min((existing.meta.from ?? 1) + trimmed.length - 1, nextTotal)
                : existing.meta.to,
          },
        })
      })
  }

  const { form, submit, pending } = useActionForm<
    CreateInput | EditInput,
    Admin
  >({
    action,
    formDefaultValues: {
      ...formDefaultValues,
      ...(isCreateForm ? {} : { _method: 'PUT' as const }),
    },
    onSuccess: handleSuccess,
    defaultState,
  })

  const { isDirty } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {isCreateForm && (
        <DialogTrigger className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground whitespace-nowrap outline-none hover:bg-primary/80 cursor-default">
          <Plus className="size-4" />
          Nouvel admin
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isCreateForm ? 'Créer un administrateur' : "Modifier l'administrateur"}
          </DialogTitle>
          <DialogDescription>
            {isCreateForm
              ? 'Renseignez les informations du nouvel administrateur.'
              : "Modifiez les informations de l'administrateur."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={submit}>
          {/* ID hidden for updates */}
          {adminId && <input type="hidden" name="id" value={adminId} />}

          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-name">Nom *</FieldLabel>
                <Input id="admin-name" placeholder="Jean Dupont" {...field} value={field.value ?? ''} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-email">Email *</FieldLabel>
                <Input id="admin-email" type="email" placeholder="admin@example.com" {...field} value={field.value ?? ''} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="admin-password">
                  {isCreateForm ? 'Mot de passe *' : 'Nouveau mot de passe'}
                </FieldLabel>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder={isCreateForm ? '••••••••' : 'Laisser vide pour ne pas changer'}
                  {...field}
                  value={field.value ?? ''}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="role"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Rôle *</FieldLabel>
                <Select value={field.value ?? ''} onValueChange={(val) => field.onChange(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminRoles.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type="submit" className="w-full" disabled={!isDirty || pending}>
            {pending && <Spinner />}
            {isCreateForm ? "Créer l'administrateur" : 'Enregistrer les modifications'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteAdminActionProps {
  admin: Admin
  onClose: () => void
}

export function DeleteAdminAction({ admin, onClose }: DeleteAdminActionProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(true)
  const [pending, setPending] = React.useState(false)

  const handleDelete = async () => {
    setPending(true)
    const formData = new FormData()
    formData.append('id', String(admin.id))
    const result = await deleteAdmin({ success: false }, formData)

    if (result.success) {
      queryClient
        .getQueriesData<ResponseCollection<Admin>>({ queryKey: ['admins'] })
        .forEach(([queryKey, existing]) => {
          if (!existing) return
          const updatedData = existing.data.filter((item) => item.id !== admin.id)
          queryClient.setQueryData(queryKey, {
            ...existing,
            data: updatedData,
            meta: { ...existing.meta, total: existing.meta.total - 1 },
          })
        })
      toast.success('Administrateur supprimé')
      setOpen(false)
      onClose()
    } else {
      toast.error(result.message ?? 'Erreur lors de la suppression')
    }
    setPending(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) onClose() }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Supprimer l'administrateur</DialogTitle>
          <DialogDescription>
            Vous êtes sur le point de supprimer <strong>{admin.name}</strong>. Cette action est
            irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => { setOpen(false); onClose() }}>
            Annuler
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? <Spinner /> : <Trash2 />}
            Supprimer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
