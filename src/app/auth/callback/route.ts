import { NextResponse, type NextRequest } from 'next/server';
import { getSafeAuthRedirectPath } from '@/lib/supabase/auth-flow';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = getSafeAuthRedirectPath(requestUrl.searchParams.get('next'));
  const isPasswordRecovery = next === '/reset-password';
  const failurePath = isPasswordRecovery ? '/forgot-password' : '/login';

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const failureUrl = new URL(failurePath, request.url);
  failureUrl.searchParams.set(
    'error',
    isPasswordRecovery
      ? 'This password-reset link is invalid or expired. Request a new one.'
      : 'This authentication link is invalid or expired.'
  );
  return NextResponse.redirect(failureUrl);
}
