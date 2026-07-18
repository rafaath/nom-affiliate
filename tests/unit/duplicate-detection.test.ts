import { describe, expect, it } from 'vitest';
import {
  buildLeadIdentity,
  isLikelyDuplicate,
  normalizePhone,
  scoreDuplicateLead,
} from '@/lib/partner-program/duplicate-detection';

describe('lead duplicate detection', () => {
  it('normalizes Indian-style phone numbers to last ten digits', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
  });

  it('builds comparable identity keys', () => {
    expect(
      buildLeadIdentity({
        restaurantName: 'ABC Café!',
        city: ' Bengaluru ',
        locality: 'Koramangala  ',
        email: 'OWNER@ABC.COM',
      })
    ).toEqual({
      restaurantName: 'abc cafe',
      phone: '',
      email: 'owner@abc.com',
      city: 'bengaluru',
      locality: 'koramangala',
    });
  });

  it('flags phone matches as likely duplicates', () => {
    const result = scoreDuplicateLead(
      { restaurantName: 'A', phone: '+91 98765 43210' },
      { restaurantName: 'B', phone: '9876543210' }
    );
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(isLikelyDuplicate(result.score)).toBe(true);
  });
});
