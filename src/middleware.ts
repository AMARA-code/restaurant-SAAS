import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isAdminEmail } from '@/lib/admin-config'
const PROTECTED_ADMIN = /^\/admin(\/.*)?$/

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()          { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const pathname = request.nextUrl.pathname

  // ── Admin protection ──────────────────────────────────────────────────────
  if (PROTECTED_ADMIN.test(pathname)) {
    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = '/signin'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
    if (!isAdminEmail(session.user.email)) {
      // Authenticated but not admin → redirect home
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // ── Redirect already-signed-in users away from auth pages ─────────────────
  if (session && (pathname === '/signin' || pathname === '/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = isAdminEmail(session.user.email) ? '/admin' : '/'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/signin',
    '/signup',
    // Add more protected routes here as needed
  ],
}