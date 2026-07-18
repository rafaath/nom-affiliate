import { redirect } from 'next/navigation';
import { isPartnerAdmin } from '@/lib/partner-program/admin-data';
import { createSupabaseServerClient } from './server';

export type CurrentUser = {
  id: string;
  email: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

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
