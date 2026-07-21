import { describe, expect, it } from 'vitest';
import {
  pendingRowToApplicationInput,
  type PendingPartnerApplicationRow,
} from '@/lib/partner-program/data';

const pendingApplication: PendingPartnerApplicationRow = {
  full_name: 'Rohan Partner',
  phone: '+91 99999 99999',
  email: 'partner@example.com',
  city: 'Bengaluru',
  locality_areas: ['Indiranagar'],
  requested_partner_type: 'affiliate',
  restaurant_experience: 'New to restaurant sales.',
  restaurant_network_size: 0,
  can_visit_restaurants: false,
  can_help_setup: false,
  applicant_kind: 'individual',
  business_name: null,
  linkedin_profile_url: 'https://www.linkedin.com/in/rohan-partner',
  resume_drive_url: 'https://drive.google.com/file/d/resume-id/view',
  background: 'Independent sales professional.',
  preferred_language: 'English',
  heard_from: 'Nom website',
  program_terms_version: '2026-07-21-v1',
  program_terms_accepted_at: '2026-07-21T09:00:00.000Z',
  program_contact_consent_at: '2026-07-21T09:00:00.000Z',
};

describe('pending partner application recovery', () => {
  it('preserves optional profile links and consent audit fields exactly', () => {
    expect(pendingRowToApplicationInput(pendingApplication)).toMatchObject({
      linkedinProfileUrl: pendingApplication.linkedin_profile_url,
      resumeDriveUrl: pendingApplication.resume_drive_url,
      programTermsVersion: pendingApplication.program_terms_version,
      programTermsAcceptedAt: pendingApplication.program_terms_accepted_at,
      programContactConsentAt: pendingApplication.program_contact_consent_at,
    });
  });

  it('keeps legacy missing profile links optional', () => {
    expect(pendingRowToApplicationInput({
      ...pendingApplication,
      linkedin_profile_url: null,
      resume_drive_url: null,
    })).toMatchObject({
      linkedinProfileUrl: undefined,
      resumeDriveUrl: undefined,
    });
  });
});
