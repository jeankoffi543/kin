'use client'

import { parentLogin } from '@/app/actions/parent-auth'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { useActionState } from 'react'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export function LoginForm() {
  const [state, action, pending] = useActionState(parentLogin, undefined)

  return (
    <div
      className={`${plusJakarta.variable} flex min-h-screen items-center justify-center px-4`}
      style={{
        background: '#0b0d11',
        fontFamily: 'var(--font-plus-jakarta), system-ui, sans-serif',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500 text-xl font-black text-black">
            K
          </div>
          <div className="text-center">
            <h1 className="text-[22px] font-black tracking-tight text-[#e8eaf2]">
              Kin Parent
            </h1>
            <p className="mt-0.5 text-[12px] font-medium text-[#5b6278]">
              Contrôle parental · Espace parent
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            background: '#161920',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[12px] font-semibold text-[#8892a8]"
              >
                Adresse e-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="parent@example.com"
                className="w-full rounded-xl px-4 py-2.5 text-[13px] text-[#e8eaf2] placeholder:text-[#3d4557] outline-none transition focus:ring-2 focus:ring-amber-500/40"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[12px] font-semibold text-[#8892a8]"
              >
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-2.5 text-[13px] text-[#e8eaf2] placeholder:text-[#3d4557] outline-none transition focus:ring-2 focus:ring-amber-500/40"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>

            {state?.error && (
              <div
                className="rounded-xl px-4 py-2.5 text-[12px] text-red-400"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-xl bg-amber-500 py-2.5 text-[13px] font-bold text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {pending ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#3d4557]">
          <a href="/owner/login" className="transition hover:text-[#8892a8]">
            Accès espace propriétaire →
          </a>
        </p>
      </div>
    </div>
  )
}
