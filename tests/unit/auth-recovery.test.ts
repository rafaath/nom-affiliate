import { describe, expect, it } from 'vitest';
import { ACCOUNT_ACCESS_NOTICE, GOOGLE_ONLY_NOTICE, getSafeAuthRedirectPath } from '@/lib/supabase/auth-flow';

describe('Google-only auth redirects', () => {
  it('keeps callback redirects on the application', () => {
    expect(getSafeAuthRedirectPath('/partner/leads?submitted=1')).toBe('/partner/leads?submitted=1');
    for (const path of ['https://attacker.example/reset', '//attacker.example/reset', '/\\\\attacker.example/reset']) {
      expect(getSafeAuthRedirectPath(path)).toBe('/partner');
    }
  });

  it('directs existing and pending applicants to Google using the same email', () => {
    expect(ACCOUNT_ACCESS_NOTICE).toContain('Google');
    expect(ACCOUNT_ACCESS_NOTICE).toContain('same email');
    expect(GOOGLE_ONLY_NOTICE).toContain('Google sign-in only');
    expect(ACCOUNT_ACCESS_NOTICE).not.toMatch(/reset|confirmation email/i);
  });
});
