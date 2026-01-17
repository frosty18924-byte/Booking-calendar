import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/request'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // This refreshes the session if it's expired
  const { data: { session } } = await supabase.auth.getSession()

  // If no session and trying to access the home page (calendar)
  if (!session && req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return res
}

// THIS PART IS MANDATORY
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (allow the login page itself!)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
}