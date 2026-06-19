import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const OWNER_COOKIE = 'kin_owner_session'
const PARENT_COOKIE = 'kin_parent_session'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Owner space (/owner/*)  ────────────────────────────────────────────────
  if (pathname.startsWith('/owner')) {
    const isLoginPage = pathname === '/owner/login'
    const hasSession = request.cookies.has(OWNER_COOKIE)

    if (!hasSession && !isLoginPage) {
      return NextResponse.redirect(new URL('/owner/login', request.url))
    }

    if (hasSession && isLoginPage) {
      return NextResponse.redirect(new URL('/owner/dashboard', request.url))
    }
  }

  // ── Parent space (/parent/*) ───────────────────────────────────────────────
  if (pathname.startsWith('/parent')) {
    const isLoginPage = pathname === '/parent/login'
    const hasSession = request.cookies.has(PARENT_COOKIE)

    if (!hasSession && !isLoginPage) {
      return NextResponse.redirect(new URL('/parent/login', request.url))
    }

    if (hasSession && isLoginPage) {
      return NextResponse.redirect(new URL('/parent/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
