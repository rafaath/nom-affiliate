export const AUTH_PASSWORD_MIN_LENGTH = 8;

export const ACCOUNT_ACCESS_NOTICE =
  'Your application was saved. If you already have a Nom account, sign in or reset your password. If this is a new account, check your inbox for the confirmation email.';

type SignupUser = {
  identities?: unknown[] | null;
};

export function shouldRedirectToExistingAccountAccess(user: SignupUser | null) {
  return !user || user.identities?.length === 0;
}

export function validatePasswordReset(password: string, confirmation: string) {
  if (password.length < AUTH_PASSWORD_MIN_LENGTH) {
    return `Use at least ${AUTH_PASSWORD_MIN_LENGTH} characters for your new password.`;
  }

  if (password !== confirmation) {
    return 'The password confirmation does not match.';
  }

  return null;
}

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
