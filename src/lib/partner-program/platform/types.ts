import type { ProductInterest } from '@/lib/partner-program/types';

export const PLATFORM_LINK_KINDS = [
  'new_restaurant',
  'existing_franchise',
  'existing_branch',
  'existing_customer_addon',
] as const;

export const PLATFORM_ONBOARDING_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'provisioning',
  'provisioned',
  'rejected',
  'cancelled',
  'failed',
] as const;

export const PLATFORM_ATTRIBUTION_KINDS = ['referred', 'sold', 'setup', 'account_expansion'] as const;

export const VERIFICATION_STATUSES = ['not_checked', 'passed', 'failed', 'blocked', 'warning'] as const;

export const ELIGIBILITY_STATUSES = ['not_checked', 'eligible', 'ineligible', 'blocked', 'warning'] as const;

export type PlatformLinkKind = (typeof PLATFORM_LINK_KINDS)[number];
export type PlatformOnboardingStatus = (typeof PLATFORM_ONBOARDING_STATUSES)[number];
export type PlatformAttributionKind = (typeof PLATFORM_ATTRIBUTION_KINDS)[number];
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];
export type EligibilityStatus = (typeof ELIGIBILITY_STATUSES)[number];

export type PlatformFeature = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_core: boolean;
  is_active: boolean;
};

export type PlatformPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency_code: string;
  billing_period: string;
  is_active: boolean;
  features: PlatformFeature[];
  feature_codes: string[];
};

export type PlatformCatalog = {
  plans: PlatformPlan[];
  features: PlatformFeature[];
  productInterestFeatureCodes: Record<ProductInterest, string[]>;
};

export type ReconciliationSignal = {
  field: string;
  weight: number;
  reason: string;
};

export type ReconciliationEvidence = {
  source: 'partner_lead' | 'franchise' | 'branch';
  id: string;
  label: string;
  score: number;
  signals: ReconciliationSignal[];
  metadata: Record<string, unknown>;
};

export type LeadReconciliationInput = {
  leadId?: string;
  restaurantName: string;
  ownerName?: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
  locality?: string | null;
};

export type LeadReconciliationResult = {
  matchKind: PlatformLinkKind;
  confidence: number;
  evidence: ReconciliationEvidence[];
  duplicateLeadId: string | null;
  existingFranchiseId: string | null;
  existingBranchId: string | null;
  reviewDecision: 'new_restaurant' | 'link_existing' | 'duplicate' | 'already_in_pipeline' | 'needs_more_information';
};

export type OnboardingRequestDraft = {
  dealId: string;
  leadId: string;
  partnerId: string;
  requestedPlanId: string;
  requestedFeatureCodes: string[];
  requestedBranchCount: number;
  affiliateRequestedPlanId?: string | null;
  affiliateRequestedFeatureCodes?: string[];
  affiliateRequestedBranchCount?: number;
  affiliatePackageSnapshot?: Record<string, unknown>;
  restaurantName: string;
  legalBusinessName?: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  city: string;
  locality?: string | null;
  branchAddress?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  timezone?: string | null;
  gstRegistrationType?: string | null;
  restaurantType?: string | null;
  currencyCode?: string;
  currencySymbol?: string;
};

export type SetupTaskTemplate = {
  key: string;
  label: string;
  sortOrder: number;
  verificationRuleCode: string;
  platformArea: string;
  featureCode: string | null;
  isBlocking: boolean;
};

export type SetupVerificationResult = {
  taskId: string;
  taskKey: string;
  ruleCode: string | null;
  status: VerificationStatus;
  summary: string;
  evidence: Record<string, unknown>;
  isBlocking: boolean;
};

export type CommissionEligibilityResult = {
  status: EligibilityStatus;
  eligible: boolean;
  summary: string;
  blockers: string[];
  evidence: Record<string, unknown>;
};
