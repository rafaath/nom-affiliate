import { redirect } from 'next/navigation';
import { cache } from 'react';
import { isPartnerAdmin } from '@/lib/partner-program/admin-data';
import { createSupabaseServerClient } from './server';
import { getGoogleSessionUser } from './google-session';

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName?: string | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createSupabaseServerClient();
  const user = await getGoogleSessionUser(supabase);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : null,
  };
});

export async function requireUser(returnTo = '/partner') {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return user;
}

export async function isCurrentUserPartnerAdmin(authUserId: string) {
  return isPartnerAdmin(authUserId);
}

export async function requirePartnerAdmin(returnTo = '/admin') {
  const user = await requireUser(returnTo);
  const isAdmin = await isPartnerAdmin(user.id, user.email);

  if (!isAdmin) {
    redirect('/partner?access=admin-required');
  }

  return user;
}
