const AMBIGUOUS = /[IO01]/g;

export function normalizeReferralCode(input: string) {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(AMBIGUOUS, '');
}

export function createReferralCodeSeed(fullName: string, city?: string | null) {
  const namePart =
    normalizeReferralCode(fullName)
      .slice(0, 6)
      .padEnd(3, 'NOM') || 'NOM';
  const cityPart = city ? normalizeReferralCode(city).slice(0, 3) : 'HQ';
  return `${namePart}${cityPart}`;
}

export function createReferralCode(fullName: string, city?: string | null, entropy = crypto.randomUUID()) {
  const suffix = normalizeReferralCode(entropy).slice(0, 6);
  return `${createReferralCodeSeed(fullName, city)}${suffix}`.slice(0, 16);
}
