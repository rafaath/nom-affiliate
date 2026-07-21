import { describe, expect, it } from 'vitest';
import { evaluatePartnerLeadAccess, PartnerLeadAccessError, assertPartnerLeadAccess } from '@/lib/partner-program/lead-access';
import {
  APPLICATION_STATUSES,
  LEAD_ENABLED_APPLICATION_STATUSES,
  type ApplicationStatus,
  type PartnerProfile,
} from '@/lib/partner-program/types';

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

describe('partner lead access', () => {
  it.each(LEAD_ENABLED_APPLICATION_STATUSES)('allows %s', (status) => {
    expect(evaluatePartnerLeadAccess(profile(status))).toMatchObject({ allowed: true });
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
    expect(evaluatePartnerLeadAccess(profile(status, true))).toMatchObject({
      allowed: false,
      code: 'partner_suspended',
    });
  });

  it('returns and throws a typed profile-required result', () => {
    expect(evaluatePartnerLeadAccess(null)).toMatchObject({ allowed: false, code: 'profile_required' });
    expect(() => assertPartnerLeadAccess(null)).toThrow(PartnerLeadAccessError);
  });
});
