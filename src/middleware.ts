import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/request'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    const supabase = createMiddlewareClient({ req, res })
    const { data: { session } } = await supabase.auth.getSession()

    const isLoginPage = req.nextUrl.pathname === '/login'

    // Case 1: No session and trying to access app -> Redirect to /login
    if (!session && !isLoginPage) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Case 2: Has session and trying to access login -> Redirect to /
    if (session && isLoginPage) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  } catch (error) {
    // If middleware fails, we don't want a 500 error, we want to let the request through 
    // so the page can handle the auth check itself
    console.error('Middleware error:', error)
    return res
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}