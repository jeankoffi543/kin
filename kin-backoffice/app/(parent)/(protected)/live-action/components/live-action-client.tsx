'use client'

import { useDevice } from '@/contexts/device-context'
import { MicrophoneControl } from './microphone-control'
import { ScreenCapture } from './screen-capture'
import { RestrictionsPanel } from './restrictions-panel'
import { Radio } from 'lucide-react'

export function LiveActionClient() {
  const { activeDevice } = useDevice()
  const deviceName = activeDevice?.device_name ?? activeDevice?.model ?? 'Appareil'

  if (!activeDevice) {
    return (
      <div className="flex items-center justify-center py-24 text-[#9ca3af]">
        <p className="text-sm">Aucun appareil sélectionné</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10">
          <Radio className="size-4.5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-[#111827]">Live Action — {deviceName}</h2>
          <p className="text-[12px] text-[#9ca3af]">Surveillance temps réel et restrictions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <MicrophoneControl />
        <ScreenCapture />
      </div>

      <div className="mt-6">
        <RestrictionsPanel />
      </div>

      <p className="mt-4 text-[11px] text-[#9ca3af]">
        Toutes les actions sont journalisées. Les commandes sont transmises via FCM au mobile.
      </p>
    </div>
  )
}
