import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { readSupabaseAuthEnv } from '@/lib/supabase/env';

const PROTECTED_PREFIXES = ['/partner', '/admin'];
const AUTH_ROUTES = ['/login'];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAuthPath(pathname: string) {
  return AUTH_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function addSecurityHeaders(response: NextResponse, requestId: string) {
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export async function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const { url, anonKey } = readSupabaseAuthEnv();

  if (!url || !anonKey || (!isProtectedPath(pathname) && !isAuthPath(pathname))) {
    return addSecurityHeaders(response, requestId);
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl), requestId);
  }

  if (pathname === '/login' && user) {
    return addSecurityHeaders(NextResponse.redirect(new URL('/partner', request.url)), requestId);
  }

  return addSecurityHeaders(response, requestId);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
