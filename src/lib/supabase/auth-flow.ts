export const GOOGLE_ONLY_NOTICE =
  'The Nom Partner Program uses Google sign-in only. Continue with Google using the email associated with your partner account.';

export const ACCOUNT_ACCESS_NOTICE =
  'Your application was saved. Continue with Google using the same email to access it.';

export function getSafeAuthRedirectPath(value: string | null | undefined, fallback = '/partner') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }

  try {
    const applicationOrigin = 'https://affiliate.invalid';
    const parsed = new URL(value, applicationOrigin);

    if (parsed.origin !== applicationOrigin) return fallback;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
