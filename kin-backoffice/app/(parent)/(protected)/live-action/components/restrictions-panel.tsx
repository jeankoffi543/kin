'use client'

import type { DeviceRestrictionRule } from '@/types/parent'
import { useDevice } from '@/contexts/device-context'
import { useDeviceFeed } from '@/hooks/use-device-feed'
import { storeRestriction } from '@/app/actions/device-commands'
import { Ban, Loader2, Phone, AppWindow, Plus, Shield } from 'lucide-react'
import * as React from 'react'

function RuleCard({ rule }: { rule: DeviceRestrictionRule }) {
  const icons: Record<string, React.ElementType> = {
    block_calls: Phone,
    app_block: AppWindow,
    sms_filter: Ban,
    module_toggle: Shield,
  }
  const labels: Record<string, string> = {
    block_calls: 'Blocage d\'appels',
    app_block: 'Blocage d\'apps',
    sms_filter: 'Filtre SMS',
    module_toggle: 'Module Toggle',
  }
  const Icon = icons[rule.rule_type] ?? Shield

  return (
    <div
      className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 shadow-sm"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="flex size-9 items-center justify-center rounded-lg bg-red-500/10">
        <Icon className="size-4 text-red-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#111827]">{labels[rule.rule_type] ?? rule.rule_type}</p>
        <p className="truncate font-mono text-[10px] text-[#9ca3af]">
          {JSON.stringify(rule.parameters)}
        </p>
      </div>
      <span
        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
          rule.is_enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 text-[#9ca3af]'
        }`}
      >
        {rule.is_enabled ? 'Actif' : 'Inactif'}
      </span>
    </div>
  )
}

function AddRestrictionForm({ deviceId, onSuccess }: { deviceId: number; onSuccess: () => void }) {
  const [open, setOpen] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.append('device_id', String(deviceId))
    const result = await storeRestriction({ success: false }, fd)
    if (result.success) {
      setOpen(false)
      onSuccess()
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-red-400"
      >
        <Plus className="size-4" />
        Ajouter une restriction
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-5 shadow-sm" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#374151]">Type</label>
          <select name="rule_type" required className="w-full rounded-lg border bg-white px-3 py-2 text-[12px] outline-none" style={{ borderColor: '#e5e7eb' }}>
            <option value="block_calls">Bloquer des appels</option>
            <option value="app_block">Bloquer des applications</option>
            <option value="sms_filter">Filtre SMS</option>
            <option value="module_toggle">Activer/désactiver un module</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium text-[#374151]">
            Paramètres (JSON)
          </label>
          <input
            name="parameters"
            placeholder='ex: ["0612345678"] ou ["com.tiktok"]'
            className="w-full rounded-lg border bg-white px-3 py-2 text-[12px] outline-none focus:border-amber-500"
            style={{ borderColor: '#e5e7eb' }}
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="rounded-lg bg-red-500 px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-red-400">
          Créer
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2 text-[12px] text-[#6b7280] hover:text-[#374151]">
          Annuler
        </button>
      </div>
    </form>
  )
}

export function RestrictionsPanel() {
  const { activeDevice } = useDevice()
  const deviceId = activeDevice?.id ?? 0

  const restrictions = useDeviceFeed<DeviceRestrictionRule>({
    routeBase: '/live-action',
    feed: 'restrictions',
    queryKey: 'restrictions',
    perPage: 50,
  })

  const rules = restrictions.data?.data ?? []

  return (
    <div
      className="rounded-2xl bg-white p-6 shadow-sm"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[#111827]">Restrictions actives</h2>
          <p className="text-[12px] text-[#9ca3af]">
            Règles de blocage appliquées sur l'appareil
          </p>
        </div>
        <AddRestrictionForm deviceId={deviceId} onSuccess={() => restrictions.refetch()} />
      </div>

      {restrictions.isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-5 animate-spin text-[#9ca3af]" />
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} />
          ))}
          {rules.length === 0 && (
            <p className="py-8 text-center text-[12px] text-[#9ca3af]">
              Aucune restriction configurée
            </p>
          )}
        </div>
      )}
    </div>
  )
}
