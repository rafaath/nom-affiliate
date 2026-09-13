import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApplicationReceipt, verifyApplicationReceipt, RECEIPT_SECONDS } from '@/lib/analytics/application-receipt';
import { attributionRecord, consentRecord, extractAttribution, getGoogleAdsConfig, readAttribution, readConsent } from '@/lib/analytics/google-ads';

const secret = 'a-server-only-test-secret-with-at-least-32-characters';
const now = 1_800_000_000_000;
afterEach(() => vi.unstubAllEnvs());

describe('application success receipts', () => {
  it('binds a signed receipt to the authenticated user and saved profile', () => {
    const token = createApplicationReceipt('profile-1', 'user-1', secret, now);
    expect(verifyApplicationReceipt(token, 'profile-1', 'user-1', secret, now)).toMatch(/^[\w-]{43}$/);
    expect(verifyApplicationReceipt(token, 'profile-2', 'user-1', secret, now)).toBeNull();
    expect(verifyApplicationReceipt(token, 'profile-1', 'user-2', secret, now)).toBeNull();
  });
  it('rejects query-like flags, missing, forged, expired and malformed receipts', () => {
    const token = createApplicationReceipt('p', 'u', secret, now);
    for (const invalid of [undefined, 'applied=1', `${token}x`, `${token}.extra`, 'invalid']) {
      expect(verifyApplicationReceipt(invalid, 'p', 'u', secret, now)).toBeNull();
    }
    expect(verifyApplicationReceipt(token, 'p', 'u', secret, now + RECEIPT_SECONDS * 1000)).toBeNull();
    expect(verifyApplicationReceipt(token, 'p', 'u', 'another-secret-longer-than-32-characters', now)).toBeNull();
    expect(verifyApplicationReceipt(token, 'p', 'u', '', now)).toBeNull();
  });
  it('uses a stable opaque transaction ID across repeat receipts', () => {
    const first = createApplicationReceipt('p', 'u', secret, now);
    const second = createApplicationReceipt('p', 'u', secret, now + 1000);
    expect(first).not.toBe(second);
    expect(verifyApplicationReceipt(first, 'p', 'u', secret, now + 1000))
      .toBe(verifyApplicationReceipt(second, 'p', 'u', secret, now + 1000));
    expect(() => createApplicationReceipt('p', 'u', 'short')).toThrow();
  });
});

describe('consent and attribution', () => {
  it('fails closed without a valid unexpired consent choice', () => {
    for (const raw of [null, 'true', '{', JSON.stringify({ choice: 'yes', expires: now + 1000 })]) {
      expect(readConsent(raw, now)).toBeNull();
    }
    expect(readConsent(consentRecord('granted', now), now)).toBe('granted');
    expect(readConsent(consentRecord('denied', now), now)).toBe('denied');
    expect(readConsent(consentRecord('granted', now), now + 181 * 86_400_000)).toBeNull();
  });
  it('only preserves allowlisted ad attribution through an auth roundtrip', () => {
    const attribution = extractAttribution('?gclid=click_123&utm_content=table_for_three&email=person@example.com&code=oauth-secret&error=name&returnTo=/admin&token=secret');
    expect(attribution).toEqual({ gclid: 'click_123', utm_content: 'table_for_three' });
    expect(readAttribution(attributionRecord(attribution, now), now + 1000)).toEqual(attribution);
    expect(readAttribution(attributionRecord(attribution, now), now + 31 * 86_400_000)).toEqual({});
    expect(extractAttribution('?utm_content=person@example.com&gclid=<script>')).toEqual({});
  });
  it('requires explicit enablement and valid IDs and HTTPS production origin', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ENABLED', 'false');
    expect(getGoogleAdsConfig()).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ENABLED', 'true');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_ID', 'AW-123456');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_ADS_APPLICATION_LABEL', 'label_123');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://affiliate.nom.enterprises');
    expect(getGoogleAdsConfig()?.id).toBe('AW-123456');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3021');
    expect(getGoogleAdsConfig()).toBeNull();
  });
});
