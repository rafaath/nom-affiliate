import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(), getPartnerProfileByAuthUser: vi.fn(),
  upsertPartnerApplication: vi.fn(), assertPartnerSchemaReady: vi.fn(),
  recordApplicationReceipt: vi.fn(), redirect: vi.fn(),
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/supabase/auth', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/lib/db/client', () => ({
  assertPartnerSchemaReady: mocks.assertPartnerSchemaReady,
  toPartnerDatabaseError: (error: unknown) => error,
}));
vi.mock('@/lib/partner-program/data', () => ({
  getPartnerProfileByAuthUser: mocks.getPartnerProfileByAuthUser,
  upsertPartnerApplication: mocks.upsertPartnerApplication,
}));
vi.mock('@/lib/analytics/application-receipt.server', () => ({
  recordApplicationReceipt: mocks.recordApplicationReceipt,
}));
import { submitApplicationAction } from '@/app/actions/partner';
import { APPLICATION_TERMS_VERSION } from '@/lib/partner-program/terms';

describe('Google-only application submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => { throw new Error('REDIRECT:' + path); });
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getPartnerProfileByAuthUser.mockResolvedValue(null);
    mocks.assertPartnerSchemaReady.mockResolvedValue(undefined);
    mocks.upsertPartnerApplication.mockResolvedValue({ id: 'profile' });
    mocks.recordApplicationReceipt.mockResolvedValue(undefined);
  });

  it('rejects anonymous/stale password submissions before any database or tracking write', async () => {
    const form = new FormData();
    form.set('email', 'partner@example.com');
    form.set('password', 'old-long-password');
    await expect(submitApplicationAction(form)).rejects.toThrow('REDIRECT:/login?notice=google-only&returnTo=%2Fapply');
    expect(mocks.assertPartnerSchemaReady).not.toHaveBeenCalled();
    expect(mocks.upsertPartnerApplication).not.toHaveBeenCalled();
    expect(mocks.recordApplicationReceipt).not.toHaveBeenCalled();
  });

  it('uses the verified account email, never a posted email, for a Google application', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'google-user', email: 'verified@example.com' });
    const form = new FormData();
    Object.entries({
      fullName: 'Test Partner', email: 'forged@example.com', phone: '9999999999',
      city: 'Bengaluru', localityAreasCsv: 'Indiranagar', partnerType: 'affiliate',
      restaurantExperience: 'New to restaurant sales', restaurantNetworkSize: '0',
      applicantKind: 'individual', background: 'Independent sales professional',
      preferredLanguage: 'English', heardFrom: 'Google ads',
      applicationTermsVersion: APPLICATION_TERMS_VERSION, applicationTermsAccepted: 'on',
    }).forEach(([key, value]) => form.set(key, value));
    await expect(submitApplicationAction(form)).rejects.toThrow('REDIRECT:/partner?applied=1');
    expect(mocks.upsertPartnerApplication).toHaveBeenCalledWith(
      'google-user', expect.objectContaining({ email: 'verified@example.com' }),
    );
    expect(mocks.recordApplicationReceipt).toHaveBeenCalledWith('profile', 'google-user');
  });

  it('has no password/OTP/signup implementation left in affiliate auth actions', () => {
    const auth = readFileSync('src/app/actions/auth.ts', 'utf8');
    const application = readFileSync('src/app/actions/partner.ts', 'utf8');
    expect(auth + application).not.toMatch(/\.signInWithPassword\(|\.signUp\(|\.resetPasswordForEmail\(|\.updateUser\(|\.signInWithOtp\(/);
  });

  it('keeps login and apply free of password forms and redirects old recovery routes', () => {
    for (const path of ['src/app/login/page.tsx', 'src/app/apply/page.tsx']) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain('GoogleSignInButton');
      expect(source).not.toMatch(/type="password"|href="\/forgot-password"|Log in instead/);
    }
    for (const path of ['src/app/forgot-password/page.tsx', 'src/app/reset-password/page.tsx']) {
      expect(readFileSync(path, 'utf8')).toContain("redirect('/login?notice=google-only')");
    }
  });
});
