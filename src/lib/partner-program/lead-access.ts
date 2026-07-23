import {
  LEAD_ENABLED_APPLICATION_STATUSES,
  type ApplicationStatus,
  type PartnerAgreementAcceptance,
  type PartnerProfile,
} from './types';
import { REFERRAL_PARTNER_AGREEMENT_VERSION } from './referral-agreement';

export const LEAD_ACCESS_ERROR_CODES = [
  'profile_required',
  'approval_required',
  'partner_suspended',
  'agreement_required',
] as const;

export type LeadAccessErrorCode = (typeof LEAD_ACCESS_ERROR_CODES)[number];

export type LeadAccessResult =
  | { allowed: true; profile: PartnerProfile }
  | {
      allowed: false;
      code: LeadAccessErrorCode;
      message: string;
      profile: PartnerProfile | null;
    };

const enabledStatuses = new Set<ApplicationStatus>(LEAD_ENABLED_APPLICATION_STATUSES);

export class PartnerLeadAccessError extends Error {
  readonly code: LeadAccessErrorCode;

  constructor(code: LeadAccessErrorCode, message: string) {
    super(message);
    this.name = 'PartnerLeadAccessError';
    this.code = code;
  }
}

export function evaluatePartnerLeadAccess(
  profile: PartnerProfile | null,
  agreementAcceptance: PartnerAgreementAcceptance | null = null
): LeadAccessResult {
  if (!profile) {
    return {
      allowed: false,
      code: 'profile_required',
      message: 'Complete your partner application before submitting restaurant leads.',
      profile: null,
    };
  }

  if (profile.is_suspended) {
    return {
      allowed: false,
      code: 'partner_suspended',
      message: profile.suspended_reason
        ? `Lead submission is paused: ${profile.suspended_reason}`
        : 'Lead submission is paused for this partner account. Contact Nom for help.',
      profile,
    };
  }

  if (!enabledStatuses.has(profile.application_status)) {
    return {
      allowed: false,
      code: 'approval_required',
      message:
        profile.application_status === 'rejected'
          ? 'This application was not approved. Your existing portal history remains available.'
          : 'Nom must approve your application before you can submit restaurant leads.',
      profile,
    };
  }

  if (agreementAcceptance?.agreement_version !== REFERRAL_PARTNER_AGREEMENT_VERSION) {
    return {
      allowed: false,
      code: 'agreement_required',
      message: 'Review and accept the current Referral Partner Agreement before submitting restaurant leads.',
      profile,
    };
  }

  return { allowed: true, profile };
}

export function assertPartnerLeadAccess(
  profile: PartnerProfile | null,
  agreementAcceptance: PartnerAgreementAcceptance | null = null
): PartnerProfile {
  const result = evaluatePartnerLeadAccess(profile, agreementAcceptance);
  if (!result.allowed) throw new PartnerLeadAccessError(result.code, result.message);
  return result.profile;
}
