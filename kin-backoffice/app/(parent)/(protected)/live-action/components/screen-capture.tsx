'use client'

import { useDevice } from '@/contexts/device-context'
import { sendCommand } from '@/app/actions/device-commands'
import { Camera, Image, RefreshCw, Video } from 'lucide-react'
import * as React from 'react'

export function ScreenCapture() {
  const { activeDevice } = useDevice()
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<{ type: string; time: string } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const send = async (type: 'screenshot' | 'screen_recording', durationSeconds?: number) => {
    if (!activeDevice) return
    setLoading(true)
    setError(null)

    const fd = new FormData()
    fd.append('device_id', String(activeDevice.id))
    fd.append('command_type', type)
    if (durationSeconds) fd.append('duration_seconds', String(durationSeconds))

    const res = await sendCommand({ success: false }, fd)
    setLoading(false)

    if (res.success) {
      setResult({
        type: type === 'screenshot' ? 'Capture' : 'Enregistrement',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      })
    } else {
      setError(res.message ?? 'Erreur inconnue')
    }
  }

  return (
    <div
      className="flex flex-col gap-5 rounded-2xl bg-white p-8 shadow-sm"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div>
        <h2 className="text-[15px] font-bold text-[#111827]">Capture d'écran</h2>
        <p className="mt-1 text-[12px] text-[#9ca3af]">
          Envoie une commande au téléphone de {activeDevice?.device_name ?? 'l\'enfant'}
        </p>
      </div>

      <div
        className="flex items-center justify-center overflow-hidden rounded-xl"
        style={{ height: 200, background: '#f9fafb', border: '1px dashed #d1d5db' }}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-[#9ca3af]">
            <RefreshCw className="size-8 animate-spin" />
            <p className="text-[12px]">Commande envoyée… En attente du résultat</p>
          </div>
        ) : result ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-20 items-center justify-center rounded-xl" style={{ background: '#dbeafe' }}>
              <Image className="size-10 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-medium text-[#374151]">{result.type} demandé</p>
              <p className="text-[11px] text-[#9ca3af]">{result.time}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#9ca3af]">
            <Camera className="size-10 opacity-30" />
            <p className="text-[12px]">Aucune capture en cours</p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[12px] font-medium text-red-500">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => send('screenshot')}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-[13px] font-bold text-black shadow-sm shadow-amber-500/20 transition-all hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Screenshot
        </button>

        <button
          type="button"
          onClick={() => send('screen_recording', 30)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-[#1f2937] disabled:opacity-50"
        >
          <Video className="size-4" />
          Enregistrer 30s
        </button>
      </div>
    </div>
  )
}
