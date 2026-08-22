import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_ACCESS_NOTICE,
  getSafeAuthRedirectPath,
  shouldRedirectToExistingAccountAccess,
  validatePasswordReset,
} from '@/lib/supabase/auth-flow';

describe('auth recovery flow', () => {
  it('keeps callback redirects on the current application', () => {
    expect(getSafeAuthRedirectPath('/reset-password?from=email')).toBe('/reset-password?from=email');
    expect(getSafeAuthRedirectPath('https://attacker.example/reset')).toBe('/partner');
    expect(getSafeAuthRedirectPath('//attacker.example/reset')).toBe('/partner');
    expect(getSafeAuthRedirectPath('/\\attacker.example/reset')).toBe('/partner');
  });

  it('requires a strong enough matching password before calling Supabase', () => {
    expect(validatePasswordReset('short', 'short')).toBe('Use at least 8 characters for your new password.');
    expect(validatePasswordReset('long-enough', 'different')).toBe('The password confirmation does not match.');
    expect(validatePasswordReset('long-enough', 'long-enough')).toBeNull();
  });

  it('routes obfuscated or empty signup results to existing-account recovery', () => {
    expect(shouldRedirectToExistingAccountAccess(null)).toBe(true);
    expect(shouldRedirectToExistingAccountAccess({ identities: [] })).toBe(true);
    expect(shouldRedirectToExistingAccountAccess({ identities: [{ provider: 'email' }] })).toBe(false);
  });

  it('does not promise that a confirmation email was sent for an ambiguous signup', () => {
    expect(ACCOUNT_ACCESS_NOTICE).toMatch(/sign in/i);
    expect(ACCOUNT_ACCESS_NOTICE).toMatch(/reset/i);
    expect(ACCOUNT_ACCESS_NOTICE).not.toMatch(/confirmation email (was )?sent/i);
  });
});
