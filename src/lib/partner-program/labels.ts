import type {
  ApplicationStatus,
  CommissionStatus,
  DealStage,
  LeadStatus,
  PartnerTier,
  PartnerType,
  PayoutStatus,
  SetupStatus,
} from './types';

export const partnerTypeLabels: Record<PartnerType, string> = {
  affiliate: 'Affiliate',
  sales_partner: 'Sales Partner',
  implementation_partner: 'Implementation Partner',
  full_service_partner: 'Full-Service Partner',
  agency_reseller: 'Agency / Reseller',
  unsure: 'Not sure yet',
};

export const partnerTierLabels: Record<PartnerTier, string> = {
  affiliate: 'Tier 1 · Affiliate',
  verified_sales_partner: 'Tier 2 · Verified Sales Partner',
  certified_setup_partner: 'Tier 3 · Certified Setup Partner',
  full_service_partner: 'Tier 4 · Full-Service Partner',
  agency_locality_partner: 'Tier 5 · Agency / Locality Partner',
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved_affiliate: 'Approved Affiliate',
  approved_sales_partner: 'Approved Sales Partner',
  approved_setup_pending_training: 'Setup Pending Training',
  approved_full_service: 'Approved Full-Service',
  rejected: 'Rejected',
  needs_more_information: 'Needs More Information',
  interview_requested: 'Interview Requested',
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  duplicate: 'Duplicate',
  already_in_pipeline: 'Already in Pipeline',
  needs_more_information: 'Needs More Information',
};

export const dealStageLabels: Record<DealStage, string> = {
  lead_submitted: 'Lead Submitted',
  lead_accepted: 'Lead Accepted',
  intro_sent: 'Intro Sent',
  contacted: 'Contacted',
  interested: 'Interested',
  demo_scheduled: 'Demo Scheduled',
  demo_completed: 'Demo Completed',
  pricing_shared: 'Pricing Shared',
  follow_up_needed: 'Follow-Up Needed',
  won: 'Won',
  lost: 'Lost',
  dormant: 'Dormant',
  setup_pending: 'Setup Pending',
  setup_in_progress: 'Setup In Progress',
  live: 'Live',
};

export const setupStatusLabels: Record<SetupStatus, string> = {
  not_started: 'Not Started',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  submitted_for_review: 'Submitted for Review',
  corrections_requested: 'Corrections Requested',
  approved: 'Approved',
  failed: 'Failed',
};

export const commissionStatusLabels: Record<CommissionStatus, string> = {
  estimated: 'Estimated',
  pending: 'Pending',
  under_review: 'Under Review',
  approved: 'Approved',
  scheduled_for_payout: 'Scheduled for Payout',
  paid: 'Paid',
  held: 'Held',
  rejected: 'Rejected',
  reversed: 'Reversed',
};

export const payoutStatusLabels: Record<PayoutStatus, string> = {
  details_missing: 'Details Missing',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  scheduled: 'Scheduled',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  held: 'Held',
};
