import { NextResponse, type NextRequest } from 'next/server';
import { getSafeAuthRedirectPath } from '@/lib/supabase/auth-flow';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGoogleSessionUser } from '@/lib/supabase/google-session';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeAuthRedirectPath(requestUrl.searchParams.get('next'));
  // Old recovery/confirmation links must not establish affiliate access.
  if (next.split('?')[0] === '/reset-password') {
    return NextResponse.redirect(new URL('/login?notice=google-only', request.url));
  }

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && await getGoogleSessionUser(supabase)) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const failureUrl = new URL('/login', request.url);
  failureUrl.searchParams.set('returnTo', next);
  failureUrl.searchParams.set(
    'error',
    'Google sign-in could not be completed. Please continue with Google again.'
  );
  return NextResponse.redirect(failureUrl);
}
