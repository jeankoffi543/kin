'use client'

import type { Device } from '@/types/parent'
import type { FormState } from '@/types/api'
import { registerDevice } from '@/app/actions/device-commands'
import { ArrowLeft, Check, Copy, QrCode, Smartphone } from 'lucide-react'
import * as React from 'react'

interface AddDeviceFormProps {
  onBack: () => void
}

type Step = 'form' | 'success'

export function AddDeviceForm({ onBack }: AddDeviceFormProps) {
  const [step, setStep] = React.useState<Step>('form')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [createdDevice, setCreatedDevice] = React.useState<Device | null>(null)
  const [copied, setCopied] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPending(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result: FormState<Device> = await registerDevice({ success: false }, fd)
    setPending(false)

    if (result.success && result.data) {
      setCreatedDevice(result.data)
      setStep('success')
    } else {
      setError(result.message ?? 'Erreur inconnue')
    }
  }

  const handleCopy = async () => {
    if (!createdDevice) return
    await navigator.clipboard.writeText(createdDevice.uuid)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const deepLink = createdDevice ? `kin://setup?uuid=${createdDevice.uuid}` : ''

  // QR code via Google Charts API (no extra deps)
  const qrUrl = createdDevice
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(deepLink)}`
    : ''

  if (step === 'success' && createdDevice) {
    return (
      <div className="mx-auto max-w-lg">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-[12px] font-medium text-[#6b7280] transition-colors hover:text-[#374151]"
        >
          <ArrowLeft className="size-3.5" />
          Retour aux appareils
        </button>

        <div
          className="flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-sm"
          style={{ border: '1px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10">
            <Check className="size-7 text-emerald-500" />
          </div>

          <div className="text-center">
            <h2 className="text-[17px] font-bold text-[#111827]">Appareil enregistré</h2>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              Scannez le QR code ci-dessous depuis l'application Kin sur le téléphone de l'enfant
            </p>
          </div>

          {/* QR Code */}
          <div
            className="flex items-center justify-center rounded-xl bg-white p-4"
            style={{ border: '2px dashed #e5e7eb' }}
          >
            <img
              src={qrUrl}
              alt="QR code d'appairage"
              width={200}
              height={200}
              className="rounded-lg"
            />
          </div>

          {/* UUID display */}
          <div className="w-full">
            <label className="mb-1.5 block text-[11px] font-medium text-[#9ca3af]">
              UUID de l'appareil
            </label>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 rounded-lg bg-[#f9fafb] px-4 py-3 font-mono text-[13px] text-[#111827]"
                style={{ border: '1px solid #e5e7eb' }}
              >
                {createdDevice.uuid}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-[#f1f3f7]"
                style={{ border: '1px solid #e5e7eb' }}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4 text-[#6b7280]" />
                )}
              </button>
            </div>
          </div>

          {/* Deep link */}
          <div className="w-full">
            <label className="mb-1.5 block text-[11px] font-medium text-[#9ca3af]">
              Lien d'appairage (alternatif)
            </label>
            <code className="block truncate rounded-lg bg-[#f9fafb] px-4 py-3 font-mono text-[11px] text-[#6b7280]" style={{ border: '1px solid #e5e7eb' }}>
              {deepLink}
            </code>
          </div>

          <div className="w-full rounded-xl bg-amber-500/5 px-4 py-3" style={{ border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-[12px] text-[#92400e]">
              <strong>Instructions :</strong> Ouvrez l'application Kin sur le téléphone de l'enfant, puis scannez ce QR code ou saisissez l'UUID manuellement dans l'écran de configuration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-[#9ca3af]">
              Nom : <strong>{createdDevice.device_name}</strong>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-medium text-[#6b7280] transition-colors hover:text-[#374151]"
      >
        <ArrowLeft className="size-3.5" />
        Retour aux appareils
      </button>

      <div
        className="flex flex-col gap-6 rounded-2xl bg-white p-8 shadow-sm"
        style={{ border: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Smartphone className="size-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-[#111827]">Ajouter un appareil enfant</h2>
            <p className="text-[12px] text-[#9ca3af]">
              Un UUID unique sera généré automatiquement pour l'appairage
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#374151]">
              Nom de l'appareil / prénom de l'enfant *
            </label>
            <input
              name="device_name"
              required
              placeholder="Ex : Téléphone de Lucas"
              className="w-full rounded-lg bg-white px-4 py-2.5 text-[13px] outline-none transition-colors focus:ring-2 focus:ring-amber-500/30"
              style={{ border: '1px solid #e5e7eb' }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#374151]">
              Plateforme
            </label>
            <select
              name="platform"
              className="w-full rounded-lg bg-white px-4 py-2.5 text-[13px] outline-none"
              style={{ border: '1px solid #e5e7eb' }}
            >
              <option value="android">Android</option>
              <option value="ios">iOS</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#374151]">
              UUID (optionnel — laissez vide pour générer automatiquement)
            </label>
            <input
              name="uuid"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full rounded-lg bg-white px-4 py-2.5 font-mono text-[12px] outline-none transition-colors focus:ring-2 focus:ring-amber-500/30"
              style={{ border: '1px solid #e5e7eb' }}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-[12px] text-red-600" style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-[13px] font-bold text-black shadow-sm shadow-amber-500/20 transition-all hover:bg-amber-400 disabled:opacity-50"
          >
            {pending ? (
              <span className="size-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            ) : (
              <QrCode className="size-4" />
            )}
            {pending ? 'Création en cours…' : 'Enregistrer et générer le QR code'}
          </button>
        </form>
      </div>
    </div>
  )
}
