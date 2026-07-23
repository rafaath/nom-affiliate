import { describe, expect, it } from 'vitest';
import { evaluatePartnerLeadAccess, PartnerLeadAccessError, assertPartnerLeadAccess } from '@/lib/partner-program/lead-access';
import {
  APPLICATION_STATUSES,
  LEAD_ENABLED_APPLICATION_STATUSES,
  type ApplicationStatus,
  type PartnerAgreementAcceptance,
  type PartnerProfile,
} from '@/lib/partner-program/types';
import { REFERRAL_PARTNER_AGREEMENT_VERSION } from '@/lib/partner-program/referral-agreement';

function profile(applicationStatus: ApplicationStatus, suspended = false): PartnerProfile {
  return {
    id: 'partner-id',
    auth_user_id: 'user-id',
    full_name: 'Partner',
    phone: null,
    email: 'partner@example.com',
    city: null,
    locality_areas: [],
    partner_type: 'affiliate',
    tier: 'affiliate',
    application_status: applicationStatus,
    certification_status: 'not_started',
    quality_score: 0,
    referral_code: 'PARTNER1',
    is_suspended: suspended,
    suspended_reason: suspended ? 'Compliance review' : null,
    created_at: '2026-07-21T00:00:00.000Z',
  };
}

const currentAcceptance: PartnerAgreementAcceptance = {
  id: 'acceptance-id',
  partner_id: 'partner-id',
  auth_user_id: 'user-id',
  accepted_email: 'partner@example.com',
  agreement_title: 'Nom Referral Partner Agreement',
  agreement_version: REFERRAL_PARTNER_AGREEMENT_VERSION,
  agreement_sha256: 'a'.repeat(64),
  accepted_at: '2026-07-23T00:00:00.000Z',
  source_path: '/partner/agreement',
};

describe('partner lead access', () => {
  it.each(LEAD_ENABLED_APPLICATION_STATUSES)('allows %s', (status) => {
    expect(evaluatePartnerLeadAccess(profile(status), currentAcceptance)).toMatchObject({ allowed: true });
  });

  it.each(APPLICATION_STATUSES.filter((status) => !LEAD_ENABLED_APPLICATION_STATUSES.includes(status as never)))(
    'blocks non-approved status %s',
    (status) => {
      expect(evaluatePartnerLeadAccess(profile(status))).toMatchObject({
        allowed: false,
        code: 'approval_required',
      });
    }
  );

  it.each(LEAD_ENABLED_APPLICATION_STATUSES)('blocks suspended %s partners', (status) => {
    expect(evaluatePartnerLeadAccess(profile(status, true), currentAcceptance)).toMatchObject({
      allowed: false,
      code: 'partner_suspended',
    });
  });

  it.each(LEAD_ENABLED_APPLICATION_STATUSES)('requires the current agreement for %s partners', (status) => {
    expect(evaluatePartnerLeadAccess(profile(status), null)).toMatchObject({
      allowed: false,
      code: 'agreement_required',
    });
    expect(evaluatePartnerLeadAccess(profile(status), {
      ...currentAcceptance,
      agreement_version: '2026-01-01-v1',
    })).toMatchObject({
      allowed: false,
      code: 'agreement_required',
    });
  });

  it('returns and throws a typed profile-required result', () => {
    expect(evaluatePartnerLeadAccess(null)).toMatchObject({ allowed: false, code: 'profile_required' });
    expect(() => assertPartnerLeadAccess(null)).toThrow(PartnerLeadAccessError);
  });
});
