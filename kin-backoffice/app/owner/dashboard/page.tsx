import { cookies } from 'next/headers'
import { ownerLogout } from '@/app/actions/owner-auth'

interface OwnerSession {
  token: string
  admin_id: number
  name: string
  email: string
  role: string
}

export default async function OwnerDashboardPage() {
  const jar = await cookies()
  const raw = jar.get('kin_owner_session')?.value ?? '{}'
  const session = JSON.parse(raw) as Partial<OwnerSession>

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top bar */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-zinc-100">Kin Backoffice</span>
            <span className="rounded-full bg-indigo-600/20 px-2 py-0.5 text-xs font-medium text-indigo-400">
              Propriétaire
            </span>
          </div>

          <form action={ownerLogout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-1.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Bonjour, {session.name ?? session.email ?? 'Admin'} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Vous êtes connecté en tant que{' '}
            <span className="font-medium text-indigo-400">{session.role ?? 'admin'}</span>.
          </p>
        </div>

        {/* Session info card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Session active
          </h2>
          <dl className="divide-y divide-zinc-800">
            {[
              { label: 'Email', value: session.email },
              { label: 'Rôle', value: session.role },
              { label: 'ID', value: String(session.admin_id ?? '—') },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-3">
                <dt className="text-sm text-zinc-500">{label}</dt>
                <dd className="text-sm font-medium text-zinc-200">{value ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  )
}
