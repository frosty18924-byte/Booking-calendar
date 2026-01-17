import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/request'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check the session
  const { data: { session } } = await supabase.auth.getSession()

  const isLoginPage = req.nextUrl.pathname === '/login'

  // 1. If NOT logged in and NOT on login page -> FORCE to /login
  if (!session && !isLoginPage) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. If ALREADY logged in and trying to go to /login -> FORCE to / (calendar)
  if (session && isLoginPage) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return res
}

// Ensure this matches everything EXCEPT static files and internal Next.js paths
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}