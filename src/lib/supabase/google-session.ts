import type { SupabaseClient } from '@supabase/supabase-js';

// Do not accept a password/OTP session merely because the account also has a
// linked Google identity. Google is the shared project's only enabled OAuth
// provider; the signed AMR claim must show an OAuth-authenticated session too.
export async function getGoogleSessionUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email || !user.email_confirmed_at ||
      !user.identities?.some((identity) => identity.provider === 'google')) {
    return null;
  }

  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || data?.claims.sub !== user.id ||
      !data.claims.amr?.some((entry) => typeof entry === 'object' && entry.method === 'oauth')) {
    return null;
  }

  return user;
}
