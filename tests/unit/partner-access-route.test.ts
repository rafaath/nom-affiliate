import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const user = vi.fn();
const access = vi.fn();

beforeEach(() => {
  vi.resetModules();
  user.mockReset().mockResolvedValue({ id: 'verified-google-user' });
  access.mockReset().mockResolvedValue({
    allowed: false,
    code: 'agreement_required',
    profile: { application_status: 'approved_affiliate', email: 'private@example.com' },
  });
  vi.doMock('@/lib/supabase/auth', () => ({ getCurrentUser: user }));
  vi.doMock('@/lib/partner-program/data', () => ({ getPartnerLeadAccess: access }));
});

afterEach(() => {
  vi.doUnmock('@/lib/supabase/auth');
  vi.doUnmock('@/lib/partner-program/data');
  vi.resetModules();
});

describe('partner access status endpoint', () => {
  it('rejects unauthenticated callers without touching partner data', async () => {
    user.mockResolvedValue(null);
    const { GET } = await import('@/app/api/partner/access/route');
    const response = await GET();
    expect(response.status).toBe(401);
    expect(access).not.toHaveBeenCalled();
  });

  it('uses the verified user ID and only returns an uncached state key', async () => {
    const { GET } = await import('@/app/api/partner/access/route');
    const response = await GET();
    expect(access).toHaveBeenCalledWith('verified-google-user');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(await response.json()).toEqual({ stateKey: 'approved_affiliate:agreement_required' });
  });

  it('returns a retryable status without exposing database errors', async () => {
    access.mockRejectedValue(new Error('private SQL details'));
    const { GET } = await import('@/app/api/partner/access/route');
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Temporarily unavailable' });
  });
});
