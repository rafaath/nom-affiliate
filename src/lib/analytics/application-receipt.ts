import { createHmac, timingSafeEqual } from 'node:crypto';

export const RECEIPT_COOKIE = 'nom-application-receipt';
export const RECEIPT_SECONDS = 7 * 24 * 60 * 60;

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createApplicationReceipt(profileId: string, authUserId: string, secret: string, now = Date.now()) {
  if (secret.length < 32) throw new Error('Advertising receipt secret must contain at least 32 characters.');
  const payload = Buffer.from(JSON.stringify({
    profileId, authUserId, expires: now + RECEIPT_SECONDS * 1000,
    transactionId: sign(`nom-application:${profileId}`, secret),
  })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyApplicationReceipt(token: string | undefined, profileId: string, authUserId: string, secret: string, now = Date.now()): string | null {
  if (!token || secret.length < 32 || token.length > 2048) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const expected = Buffer.from(sign(parts[0], secret));
    const signature = Buffer.from(parts[1]);
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
    const value = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (value.profileId !== profileId || value.authUserId !== authUserId ||
      typeof value.expires !== 'number' || value.expires <= now ||
      value.expires > now + RECEIPT_SECONDS * 1000 ||
      value.transactionId !== sign(`nom-application:${profileId}`, secret)) return null;
    return value.transactionId;
  } catch { return null; }
}
