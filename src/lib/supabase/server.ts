import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { readSupabasePublicConfig } from './env';

export async function createSupabaseServerClient() {
  const { url, anonKey } = readSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; middleware/proxy refresh handles this path.
        }
      },
    },
  });
}
