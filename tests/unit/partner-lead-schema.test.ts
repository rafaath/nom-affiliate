import { describe, expect, it } from 'vitest';
import { partnerLeadSchema } from '@/lib/partner-program/schemas';

const validLead = {
  restaurantName: 'Cafe Ledger',
  legalBusinessName: 'Cafe Ledger Foods LLP',
  ownerName: 'Asha Shah',
  phone: '+91 98765 43210',
  email: 'asha@example.com',
  city: 'Bengaluru',
  locality: 'Indiranagar',
  branchAddress: '12, 100 Feet Road',
  state: 'Karnataka',
  country: 'India',
  postalCode: '560038',
  timezone: 'Asia/Kolkata',
  gstRegistrationType: 'regular',
  restaurantType: 'Cafe',
  outletCount: 1,
  requestedPlanId: '11111111-1111-4111-8111-111111111111',
  requestedFeatureCodes: ['qr', 'menu'],
  requestedBranchCount: 1,
  currentSystem: 'manual',
  productsInterested: ['qr_menu'],
  painPoints: ['menu_update_issues'],
  relationshipContext: 'Owner asked for a Nom walkthrough after an in-person visit.',
  consentToContact: true,
  preferredContactTime: 'Afternoon',
  notes: '',
};

describe('partner lead schema', () => {
  it('accepts a complete RMS onboarding handoff', () => {
    const parsed = partnerLeadSchema.safeParse(validLead);

    expect(parsed.success).toBe(true);
  });

  it('accepts a lead before package and onboarding details are known', () => {
    const parsed = partnerLeadSchema.safeParse({
      restaurantName: 'Cafe Ledger',
      ownerName: 'Asha Shah',
      phone: '+91 98765 43210',
      city: 'Bengaluru',
      locality: 'Indiranagar',
      relationshipContext: 'Owner asked for a Nom walkthrough after an in-person visit.',
      consentToContact: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toMatchObject({
        country: 'India',
        timezone: 'Asia/Kolkata',
        outletCount: 1,
        requestedFeatureCodes: [],
        requestedBranchCount: 1,
        productsInterested: [],
        painPoints: [],
      });
      expect(parsed.data.requestedPlanId).toBeUndefined();
    }
  });

  it('still requires lead identity, location, relationship, and consent', () => {
    const parsed = partnerLeadSchema.safeParse({ consentToContact: false });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const paths = parsed.error.issues.map((issue) => issue.path.join('.'));
      expect(paths).toEqual(
        expect.arrayContaining([
          'restaurantName',
          'ownerName',
          'phone',
          'city',
          'locality',
          'relationshipContext',
          'consentToContact',
        ])
      );
    }
  });

  it('validates owner email when one is supplied', () => {
    const parsed = partnerLeadSchema.safeParse({ ...validLead, email: 'not-an-email' });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.path).toEqual(['email']);
  });
});
