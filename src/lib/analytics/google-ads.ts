export type AdsConsent = 'granted' | 'denied';
export const CONSENT_KEY = 'nom-ads-consent-v1';
export const ATTRIBUTION_KEY = 'nom-ads-attribution-v1';
export const CONSENT_DAYS = 180;
export const ATTRIBUTION_DAYS = 30;
const DAY = 86_400_000;

export function readConsent(raw: string | null, now = Date.now()): AdsConsent | null {
  try {
    const value = JSON.parse(raw || 'null');
    return value && ['granted', 'denied'].includes(value.choice) &&
      typeof value.expires === 'number' && value.expires > now
      ? value.choice : null;
  } catch { return null; }
}

export function consentRecord(choice: AdsConsent, now = Date.now()) {
  return JSON.stringify({ choice, expires: now + CONSENT_DAYS * DAY });
}

// Never forward arbitrary query strings (OAuth codes, error messages, email, etc.).
export function extractAttribution(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  for (const key of ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const value = params.get(key);
    if (value && /^[a-zA-Z0-9_-]{1,250}$/.test(value)) result[key] = value;
  }
  return result;
}

export function attributionRecord(values: Record<string, string>, now = Date.now()) {
  return JSON.stringify({ values, expires: now + ATTRIBUTION_DAYS * DAY });
}

export function readAttribution(raw: string | null, now = Date.now()): Record<string, string> {
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || typeof value.expires !== 'number' || value.expires <= now || !value.values || typeof value.values !== 'object') return {};
    return extractAttribution(new URLSearchParams(value.values).toString());
  } catch { return {}; }
}

export function getGoogleAdsConfig() {
  const id = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
  const label = process.env.NEXT_PUBLIC_GOOGLE_ADS_APPLICATION_LABEL || '';
  const origin = process.env.NEXT_PUBLIC_APP_URL || '';
  if (process.env.NEXT_PUBLIC_GOOGLE_ADS_ENABLED !== 'true' || !/^AW-\d+$/.test(id) || !/^[\w-]+$/.test(label)) return null;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return null;
    return { id, label, origin: url.origin };
  } catch { return null; }
}

export const DENIED_CONSENT = {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
} as const;

export const MEASUREMENT_CONSENT = {
  ...DENIED_CONSENT, ad_storage: 'granted', ad_user_data: 'granted',
} as const;
