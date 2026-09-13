import { cookies } from 'next/headers';
import { createApplicationReceipt, verifyApplicationReceipt, RECEIPT_COOKIE, RECEIPT_SECONDS } from './application-receipt';
import { getGoogleAdsConfig } from './google-ads';

// Called only after the application transaction commits. Tracking is optional:
// a misconfiguration must never turn a saved application into a form error.
export async function recordApplicationReceipt(profileId: string, authUserId: string) {
  if (!getGoogleAdsConfig()) return;
  const secret = process.env.GOOGLE_ADS_RECEIPT_SECRET || '';
  if (secret.length < 32) {
    console.warn('[ads-tracking] Application receipt disabled: missing signing secret.');
    return;
  }
  try {
    (await cookies()).set(RECEIPT_COOKIE, createApplicationReceipt(profileId, authUserId, secret), {
      httpOnly: true, secure: true, sameSite: 'lax', path: '/partner', maxAge: RECEIPT_SECONDS,
    });
  } catch {
    console.warn('[ads-tracking] Could not issue application receipt. Application remains saved.');
  }
}

export async function readApplicationTransaction(profileId: string, authUserId: string) {
  if (!getGoogleAdsConfig()) return null;
  return verifyApplicationReceipt(
    (await cookies()).get(RECEIPT_COOKIE)?.value,
    profileId, authUserId, process.env.GOOGLE_ADS_RECEIPT_SECRET || '',
  );
}
