import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGoogleSessionUser } from '@/lib/supabase/google-session';

const user = {
  id: 'google-user',
  email: 'partner@example.com',
  email_confirmed_at: '2026-09-13T00:00:00Z',
  identities: [{ provider: 'google' }],
  app_metadata: { provider: 'email' }, // Legacy account linked to Google.
};
const getUser = vi.fn();
const getClaims = vi.fn();
const client = { auth: { getUser, getClaims } } as unknown as SupabaseClient;

describe('affiliate Google session gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user }, error: null });
    getClaims.mockResolvedValue({
      data: { claims: { sub: user.id, amr: [{ method: 'oauth', timestamp: 123 }] } },
      error: null,
    });
  });

  it('accepts verified Google OAuth, including linked legacy email accounts', async () => {
    expect(await getGoogleSessionUser(client)).toEqual(user);
  });

  it.each(['password', 'otp', 'recovery', 'email/signup', 'anonymous'])(
    'rejects a %s session even if the account has a Google identity',
    async (method) => {
      getClaims.mockResolvedValue({ data: { claims: { sub: user.id, amr: [{ method }] } }, error: null });
      expect(await getGoogleSessionUser(client)).toBeNull();
    },
  );

  it('rejects OAuth without a Google identity', async () => {
    getUser.mockResolvedValue({ data: { user: { ...user, identities: [{ provider: 'github' }] } }, error: null });
    expect(await getGoogleSessionUser(client)).toBeNull();
    expect(getClaims).not.toHaveBeenCalled();
  });

  it('rejects missing or unconfirmed email', async () => {
    for (const fields of [{ email: null }, { email_confirmed_at: null }]) {
      getUser.mockResolvedValue({ data: { user: { ...user, ...fields } }, error: null });
      expect(await getGoogleSessionUser(client)).toBeNull();
    }
  });

  it('fails closed on missing, invalid or mismatched claims', async () => {
    for (const result of [
      { data: null, error: new Error('invalid JWT') },
      { data: { claims: { sub: user.id } }, error: null },
      { data: { claims: { sub: 'another-user', amr: [{ method: 'oauth' }] } }, error: null },
    ]) {
      getClaims.mockResolvedValue(result);
      expect(await getGoogleSessionUser(client)).toBeNull();
    }
  });

  it('rejects an expired or invalid user session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error('expired') });
    expect(await getGoogleSessionUser(client)).toBeNull();
    expect(getClaims).not.toHaveBeenCalled();
  });
});
