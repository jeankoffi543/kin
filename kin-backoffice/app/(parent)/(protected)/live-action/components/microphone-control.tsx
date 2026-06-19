'use client'

import { useDevice } from '@/contexts/device-context'
import { sendCommand } from '@/app/actions/device-commands'
import { Mic, MicOff, RefreshCw, Volume2 } from 'lucide-react'
import * as React from 'react'

export function MicrophoneControl() {
  const { activeDevice } = useDevice()
  const [state, setState] = React.useState<'idle' | 'sending' | 'sent'>('idle')
  const [duration, setDuration] = React.useState(60)
  const [error, setError] = React.useState<string | null>(null)
  const [sentAt, setSentAt] = React.useState<string | null>(null)

  const [waveHeights] = React.useState(() =>
    Array.from({ length: 32 }, () => Math.random() * 0.6 + 0.2),
  )

  const handleStart = async () => {
    if (!activeDevice) return
    setState('sending')
    setError(null)

    const fd = new FormData()
    fd.append('device_id', String(activeDevice.id))
    fd.append('command_type', 'live_mic')
    fd.append('duration_seconds', String(duration))

    const res = await sendCommand({ success: false }, fd)

    if (res.success) {
      setState('sent')
      setSentAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } else {
      setState('idle')
      setError(res.message ?? 'Erreur')
    }
  }

  return (
    <div
      className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-sm"
      style={{ border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="text-center">
        <h2 className="text-[15px] font-bold text-[#111827]">Écoute microphone</h2>
        <p className="mt-1 text-[12px] text-[#9ca3af]">
          Enregistrement audio de l'environnement de l'appareil
        </p>
      </div>

      {/* Waveform */}
      <div className="flex h-12 w-full items-center justify-center gap-px px-4">
        {waveHeights.map((h, i) => (
          <div
            key={i}
            className="w-1 rounded-full transition-all"
            style={{
              height: state === 'sent' ? `${h * 100}%` : '20%',
              background: state === 'sent' ? `rgba(245,158,11,${0.3 + h * 0.7})` : '#e5e7eb',
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="text-center">
        {state === 'idle' && <p className="text-[12px] text-[#9ca3af]">Prêt à démarrer</p>}
        {state === 'sending' && (
          <div className="flex items-center gap-2 text-[#9ca3af]">
            <RefreshCw className="size-4 animate-spin" />
            <p className="text-[12px]">Envoi de la commande…</p>
          </div>
        )}
        {state === 'sent' && (
          <div>
            <p className="text-[12px] font-medium text-emerald-600">
              Commande envoyée — enregistrement {duration}s demandé
            </p>
            <p className="text-[11px] text-[#9ca3af]">{sentAt}</p>
          </div>
        )}
        {error && <p className="text-[12px] text-red-500">{error}</p>}
      </div>

      {/* Duration selector */}
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-[#6b7280]">Durée :</label>
        {[30, 60, 120, 300].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDuration(d)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
              duration === d
                ? 'bg-[#111827] text-white'
                : 'bg-[#f1f3f7] text-[#6b7280] hover:bg-[#e5e7eb]'
            }`}
          >
            {d < 60 ? `${d}s` : `${d / 60}min`}
          </button>
        ))}
      </div>

      {/* Action */}
      <button
        type="button"
        onClick={handleStart}
        disabled={state === 'sending'}
        className="flex size-14 items-center justify-center rounded-full bg-amber-500 text-black shadow-lg shadow-amber-500/30 transition-all hover:scale-105 hover:bg-amber-400 disabled:opacity-50"
      >
        {state === 'sending' ? <RefreshCw className="size-6 animate-spin" /> : <Mic className="size-6" />}
      </button>

      {state === 'sent' && (
        <button
          type="button"
          onClick={() => { setState('idle'); setError(null) }}
          className="text-[12px] font-medium text-[#6b7280] hover:text-[#374151]"
        >
          Nouvelle commande
        </button>
      )}
    </div>
  )
}
