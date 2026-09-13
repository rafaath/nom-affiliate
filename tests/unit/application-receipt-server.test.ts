import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordApplicationReceipt, readApplicationTransaction } from '@/lib/analytics/application-receipt.server';
import { RECEIPT_COOKIE, createApplicationReceipt } from '@/lib/analytics/application-receipt';

const mocks = vi.hoisted(() => ({ set: vi.fn(), get: vi.fn(), config: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: async () => ({ set: mocks.set, get: mocks.get }) }));
vi.mock('@/lib/analytics/google-ads', () => ({ getGoogleAdsConfig: mocks.config }));
const secret = 'test-receipt-secret-of-at-least-32-characters';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.config.mockReturnValue({ id: 'AW-123' });
  vi.stubEnv('GOOGLE_ADS_RECEIPT_SECRET', secret);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('server receipt boundary', () => {
  it('issues a secure HttpOnly receipt after a saved application is passed in', async () => {
    await recordApplicationReceipt('profile', 'user');
    expect(mocks.set).toHaveBeenCalledWith(RECEIPT_COOKIE, expect.any(String), expect.objectContaining({
      httpOnly: true, secure: true, sameSite: 'lax', path: '/partner', maxAge: 604800,
    }));
  });
  it('does nothing when tracking is disabled', async () => {
    mocks.config.mockReturnValue(null);
    await recordApplicationReceipt('profile', 'user');
    expect(mocks.set).not.toHaveBeenCalled();
    expect(await readApplicationTransaction('profile', 'user')).toBeNull();
  });
  it('does not break a successful application if signing configuration or cookies fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('GOOGLE_ADS_RECEIPT_SECRET', '');
    await expect(recordApplicationReceipt('profile', 'user')).resolves.toBeUndefined();
    expect(mocks.set).not.toHaveBeenCalled();
    vi.stubEnv('GOOGLE_ADS_RECEIPT_SECRET', secret);
    mocks.set.mockImplementation(() => { throw new Error('cookies blocked'); });
    await expect(recordApplicationReceipt('profile', 'user')).resolves.toBeUndefined();
  });
  it('returns only an opaque ID after validating both server-known identities', async () => {
    mocks.get.mockReturnValue({ value: createApplicationReceipt('profile', 'user', secret) });
    expect(await readApplicationTransaction('profile', 'user')).toMatch(/^[\w-]{43}$/);
    expect(await readApplicationTransaction('profile', 'another-user')).toBeNull();
    mocks.get.mockReturnValue(undefined);
    expect(await readApplicationTransaction('profile', 'user')).toBeNull();
  });
});
