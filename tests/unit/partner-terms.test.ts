import { describe, expect, it } from 'vitest';
import { partnerApplicationSchema } from '@/lib/partner-program/schemas';
import { PARTNER_PROGRAM_TERMS_VERSION } from '@/lib/partner-program/terms';

const validApplication = {
  fullName: 'Rohan Partner',
  phone: '+91 99999 99999',
  email: 'partner@example.com',
  city: 'Bengaluru',
  localityAreas: ['Indiranagar'],
  partnerType: 'affiliate',
  restaurantExperience: 'Works with restaurant operators.',
  restaurantNetworkSize: 5,
  canVisitRestaurants: true,
  canHelpSetup: false,
  applicantKind: 'individual',
  background: 'Hospitality consultant.',
  preferredLanguage: 'English',
  heardFrom: 'Nom website',
  programTermsVersion: PARTNER_PROGRAM_TERMS_VERSION,
  programTermsAccepted: true,
};

describe('partner program terms acceptance', () => {
  it('accepts the exact current version with checked consent', () => {
    expect(partnerApplicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it('rejects unchecked consent', () => {
    const result = partnerApplicationSchema.safeParse({ ...validApplication, programTermsAccepted: false });
    expect(result.success).toBe(false);
  });

  it('rejects a stale terms version', () => {
    const result = partnerApplicationSchema.safeParse({ ...validApplication, programTermsVersion: '2026-01-01-v1' });
    expect(result.success).toBe(false);
  });

  it('accepts optional LinkedIn and Google Drive profile links', () => {
    const result = partnerApplicationSchema.safeParse({
      ...validApplication,
      linkedinProfileUrl: 'https://www.linkedin.com/in/rohan-partner',
      resumeDriveUrl: 'https://drive.google.com/file/d/resume-id/view',
    });

    expect(result.success).toBe(true);
  });

  it('rejects non-LinkedIn and non-Google resume links', () => {
    expect(partnerApplicationSchema.safeParse({
      ...validApplication,
      linkedinProfileUrl: 'https://example.com/profile',
    }).success).toBe(false);
    expect(partnerApplicationSchema.safeParse({
      ...validApplication,
      resumeDriveUrl: 'https://example.com/resume.pdf',
    }).success).toBe(false);
  });
});
