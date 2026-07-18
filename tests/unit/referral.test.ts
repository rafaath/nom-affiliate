import { describe, expect, it } from 'vitest';
import { createReferralCodeSeed, normalizeReferralCode } from '@/lib/partner-program/referral';

describe('referral code generation', () => {
  it('normalizes unsafe and ambiguous characters', () => {
    expect(normalizeReferralCode('ra-fi_01 io')).toBe('RAF');
  });

  it('creates deterministic readable seed from name and city', () => {
    expect(createReferralCodeSeed('Rafaath Ali', 'Bengaluru')).toBe('RAFAATBEN');
  });
});
