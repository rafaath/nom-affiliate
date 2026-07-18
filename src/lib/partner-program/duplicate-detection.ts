export type LeadIdentityInput = {
  restaurantName: string;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  locality?: string | null;
};

export type DuplicateSignal = {
  field: string;
  weight: number;
  reason: string;
};

export function normalizePhone(phone?: string | null) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 10) return digits;
  return digits.slice(-10);
}

export function normalizeText(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

export function buildLeadIdentity(input: LeadIdentityInput) {
  return {
    restaurantName: normalizeText(input.restaurantName),
    phone: normalizePhone(input.phone),
    email: normalizeEmail(input.email),
    city: normalizeText(input.city),
    locality: normalizeText(input.locality),
  };
}

export function scoreDuplicateLead(
  candidate: LeadIdentityInput,
  existing: LeadIdentityInput
): { score: number; signals: DuplicateSignal[] } {
  const next = buildLeadIdentity(candidate);
  const current = buildLeadIdentity(existing);
  const signals: DuplicateSignal[] = [];

  if (next.phone && current.phone && next.phone === current.phone) {
    signals.push({ field: 'phone', weight: 70, reason: 'Same normalized phone number' });
  }

  if (next.email && current.email && next.email === current.email) {
    signals.push({ field: 'email', weight: 55, reason: 'Same normalized email' });
  }

  if (next.restaurantName && current.restaurantName && next.restaurantName === current.restaurantName) {
    signals.push({ field: 'restaurant_name', weight: 35, reason: 'Same normalized restaurant name' });
  }

  if (next.city && current.city && next.city === current.city) {
    signals.push({ field: 'city', weight: 10, reason: 'Same city' });
  }

  if (next.locality && current.locality && next.locality === current.locality) {
    signals.push({ field: 'locality', weight: 10, reason: 'Same locality' });
  }

  return {
    score: signals.reduce((total, signal) => total + signal.weight, 0),
    signals,
  };
}

export function isLikelyDuplicate(score: number) {
  return score >= 70;
}
