'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AdminFiltersProps {
  role: string
  onRoleChange: (value: string) => void
}

export function AdminFilters({ role, onRoleChange }: AdminFiltersProps) {
  return (
    <Select value={role} onValueChange={(val) => onRoleChange(val ?? 'all')}>
      <SelectTrigger className="h-8 w-[140px]">
        <SelectValue placeholder="Rôle" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les rôles</SelectItem>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="support">Support</SelectItem>
      </SelectContent>
    </Select>
  )
}
