import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  partnerApplicationSchema,
  referralPartnerAgreementAcceptanceSchema,
} from '@/lib/partner-program/schemas';
import { APPLICATION_TERMS_VERSION } from '@/lib/partner-program/terms';
import {
  buildReferralPartnerAgreementSnapshot,
  REFERRAL_PARTNER_AGREEMENT_VERSION,
} from '@/lib/partner-program/referral-agreement';
import { getCurrentReferralPartnerAgreementDocument } from '@/lib/partner-program/referral-agreement.server';

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
  applicationTermsVersion: APPLICATION_TERMS_VERSION,
  applicationTermsAccepted: true,
};

describe('partner application terms acceptance', () => {
  it('accepts the exact current version with checked consent', () => {
    expect(partnerApplicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it('rejects unchecked consent', () => {
    const result = partnerApplicationSchema.safeParse({ ...validApplication, applicationTermsAccepted: false });
    expect(result.success).toBe(false);
  });

  it('rejects a stale terms version', () => {
    const result = partnerApplicationSchema.safeParse({ ...validApplication, applicationTermsVersion: '2026-01-01-v1' });
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

describe('Referral Partner Agreement acceptance', () => {
  it('requires the exact current version and an affirmative acceptance', () => {
    expect(referralPartnerAgreementAcceptanceSchema.safeParse({
      agreementVersion: REFERRAL_PARTNER_AGREEMENT_VERSION,
      agreementAccepted: true,
    }).success).toBe(true);
    expect(referralPartnerAgreementAcceptanceSchema.safeParse({
      agreementVersion: '2026-01-01-v1',
      agreementAccepted: true,
    }).success).toBe(false);
    expect(referralPartnerAgreementAcceptanceSchema.safeParse({
      agreementVersion: REFERRAL_PARTNER_AGREEMENT_VERSION,
      agreementAccepted: false,
    }).success).toBe(false);
  });

  it('produces a stable SHA-256 fingerprint for the exact text snapshot', () => {
    const document = getCurrentReferralPartnerAgreementDocument();
    expect(document.text).toBe(buildReferralPartnerAgreementSnapshot());
    expect(document.sha256).toBe(createHash('sha256').update(document.text, 'utf8').digest('hex'));
    expect(document.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
