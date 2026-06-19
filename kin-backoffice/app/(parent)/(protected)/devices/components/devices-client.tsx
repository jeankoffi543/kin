'use client'

import type { Device } from '@/types/parent'
import { useDevice } from '@/contexts/device-context'
import { AddDeviceForm } from './add-device-form'
import { DeviceDetail } from './device-detail'
import { DevicesListing } from './listing'
import * as React from 'react'

export function DevicesClient() {
  const { devices, activeDevice } = useDevice()
  const [view, setView] = React.useState<'list' | 'add' | 'detail'>('list')

  return (
    <div className="space-y-6">
      {view === 'list' && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-[#111827]">Appareils liés</h2>
              <p className="text-[12px] text-[#9ca3af]">{devices.length} appareil(s)</p>
            </div>
            <div className="flex gap-2">
              {activeDevice && (
                <button
                  type="button"
                  onClick={() => setView('detail')}
                  className="rounded-xl bg-[#111827] px-4 py-2.5 text-[12px] font-bold text-white transition-colors hover:bg-[#1f2937]"
                >
                  Détail appareil
                </button>
              )}
              <button
                type="button"
                onClick={() => setView('add')}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-[12px] font-bold text-black shadow-sm shadow-amber-500/20 transition-colors hover:bg-amber-400"
              >
                + Ajouter un appareil
              </button>
            </div>
          </div>
          <DevicesListing />
        </>
      )}

      {view === 'add' && (
        <AddDeviceForm onBack={() => setView('list')} />
      )}

      {view === 'detail' && activeDevice && (
        <DeviceDetail device={activeDevice} onBack={() => setView('list')} />
      )}
    </div>
  )
}
