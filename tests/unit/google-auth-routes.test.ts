import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), getClaims: vi.fn(), exchangeCodeForSession: vi.fn(),
  createServerClient: vi.fn(), createSupabaseServerClient: vi.fn(),
}));
vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: mocks.createSupabaseServerClient }));
vi.mock('@/lib/supabase/env', () => ({
  readSupabaseAuthEnv: () => ({ url: 'https://example.supabase.co', anonKey: 'test-public-key' }),
}));
import { proxy } from '@/proxy';
import { GET } from '@/app/auth/callback/route';

const origin = 'https://affiliate.nom.enterprises';
const request = (path: string) => new NextRequest(origin + path);
const client = { auth: mocks };

describe('Google-only routing and callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue(client);
    mocks.createServerClient.mockImplementation((_url, _key, options) => {
      options.cookies.setAll([{ name: 'refreshed-session', value: 'test', options: { path: '/' } }]);
      return client;
    });
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user', email: 'partner@example.com', email_confirmed_at: '2026-09-13',
        identities: [{ provider: 'google' }] } }, error: null,
    });
    mocks.getClaims.mockResolvedValue({
      data: { claims: { sub: 'user', amr: [{ method: 'oauth' }] } }, error: null,
    });
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it('allows the Google session into protected routes', async () => {
    const response = await proxy(request('/partner/leads'));
    expect(response.headers.get('location')).toBeNull();
    expect(response.cookies.get('refreshed-session')?.value).toBe('test');
  });

  it('redirects password sessions to Google without a login/partner loop', async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user', amr: [{ method: 'password' }] } }, error: null });
    const response = await proxy(request('/partner/leads?filter=submitted'));
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('notice')).toBe('google-only');
    expect(location.searchParams.get('returnTo')).toBe('/partner/leads?filter=submitted');
    expect(response.cookies.get('refreshed-session')?.value).toBe('test');
    expect((await proxy(request('/login'))).headers.get('location')).toBeNull();
  });

  it('checks admin routes too', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await proxy(request('/admin'))).headers.get('location')).toContain('/login?');
  });

  it('redirects Google-authenticated login requests to the portal with refreshed cookies', async () => {
    const response = await proxy(request('/login'));
    expect(response.headers.get('location')).toBe(origin + '/partner');
    expect(response.cookies.get('refreshed-session')?.value).toBe('test');
  });

  it('completes a verified Google callback to a safe destination', async () => {
    const response = await GET(request('/auth/callback?code=test&next=%2Fapply'));
    expect(response.headers.get('location')).toBe(origin + '/apply');
  });

  it('does not accept a recovery callback or exchange its code', async () => {
    const response = await GET(request('/auth/callback?code=test&next=%2Freset-password'));
    expect(response.headers.get('location')).toBe(origin + '/login?notice=google-only');
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('rejects an exchanged non-OAuth session', async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: 'user', amr: [{ method: 'otp' }] } }, error: null });
    const response = await GET(request('/auth/callback?code=test&next=%2Fapply'));
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('returnTo')).toBe('/apply');
  });

  it('rejects failed exchanges and missing callback codes', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: new Error('expired') });
    for (const path of ['/auth/callback?code=expired', '/auth/callback']) {
      expect((await GET(request(path))).headers.get('location')).toContain(origin + '/login?');
    }
  });
});
