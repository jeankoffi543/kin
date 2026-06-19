import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ownerLogout } from '@/app/actions/owner-auth'
import { LayoutDashboard, Users, ShieldCheck, Bell, MessageSquare, LogOut } from 'lucide-react'

const NAV = [
  { href: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/owner/admins', label: 'Admins', icon: ShieldCheck },
  { href: '/owner/users', label: 'Parents', icon: Users },
  { href: '/owner/notifications', label: 'Notifications', icon: Bell },
  { href: '/owner/conversations', label: 'Conversations', icon: MessageSquare },
]

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies()
  const raw = jar.get('kin_owner_session')?.value
  if (!raw) redirect('/owner/login')

  let session: { name?: string; email?: string; role?: string } = {}
  try { session = JSON.parse(raw) } catch {}

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="flex w-60 flex-col border-r border-zinc-800 bg-zinc-900">
        <div className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold">Kin Backoffice</span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <div className="mb-2 px-3">
            <p className="text-xs font-medium text-zinc-300">{session.name ?? session.email}</p>
            <p className="text-xs text-zinc-500">{session.role}</p>
          </div>
          <form action={ownerLogout}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
