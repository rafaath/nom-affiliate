export const PARTNER_TYPES = [
  'affiliate',
  'sales_partner',
  'implementation_partner',
  'full_service_partner',
  'agency_reseller',
  'unsure',
] as const;

export const PARTNER_TIERS = [
  'affiliate',
  'verified_sales_partner',
  'certified_setup_partner',
  'full_service_partner',
  'agency_locality_partner',
] as const;

export const APPLICATION_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved_affiliate',
  'approved_sales_partner',
  'approved_setup_pending_training',
  'approved_full_service',
  'rejected',
  'needs_more_information',
  'interview_requested',
] as const;

export const LEAD_STATUSES = [
  'submitted',
  'under_review',
  'accepted',
  'rejected',
  'duplicate',
  'already_in_pipeline',
  'needs_more_information',
] as const;

export const DEAL_STAGES = [
  'lead_submitted',
  'lead_accepted',
  'intro_sent',
  'contacted',
  'interested',
  'demo_scheduled',
  'demo_completed',
  'pricing_shared',
  'follow_up_needed',
  'won',
  'lost',
  'dormant',
  'setup_pending',
  'setup_in_progress',
  'live',
] as const;

export const SETUP_STATUSES = [
  'not_started',
  'assigned',
  'in_progress',
  'submitted_for_review',
  'corrections_requested',
  'approved',
  'failed',
] as const;

export const COMMISSION_TYPES = [
  'referral',
  'sales',
  'setup',
  'recurring',
  'addon',
  'bonus',
] as const;

export const COMMISSION_STATUSES = [
  'estimated',
  'pending',
  'under_review',
  'approved',
  'scheduled_for_payout',
  'paid',
  'held',
  'rejected',
  'reversed',
] as const;

export const PAYOUT_STATUSES = [
  'details_missing',
  'pending_approval',
  'approved',
  'scheduled',
  'processing',
  'paid',
  'failed',
  'held',
] as const;

export const DISPUTE_STATUSES = [
  'open',
  'under_review',
  'needs_partner_response',
  'resolved_partner_favored',
  'resolved_nom_favored',
  'closed',
] as const;

export const PRODUCT_INTERESTS = [
  'pos',
  'inventory',
  'qr_menu',
  'qr_ordering',
  'online_ordering',
  'website',
  'loyalty',
  'staff_order_management',
  'full_restaurant_setup',
  'not_sure',
] as const;

export const PAIN_POINTS = [
  'manual_billing',
  'old_pos',
  'no_inventory_tracking',
  'menu_update_issues',
  'order_mistakes',
  'no_direct_ordering',
  'high_aggregator_dependency',
  'poor_reporting',
  'staff_management_issues',
  'wants_qr_menu',
] as const;

export const PLATFORM_LINK_KINDS = [
  'new_restaurant',
  'existing_franchise',
  'existing_branch',
  'existing_customer_addon',
] as const;

export const SETUP_TASKS = [
  { key: 'business_profile', label: 'Business profile', sortOrder: 10 },
  { key: 'menu_setup', label: 'Menu setup', sortOrder: 20 },
  { key: 'pos_setup', label: 'POS setup', sortOrder: 30 },
  { key: 'qr_menu_setup', label: 'QR menu setup', sortOrder: 40 },
  { key: 'qr_ordering_setup', label: 'QR ordering setup', sortOrder: 50 },
  { key: 'inventory_setup', label: 'Inventory setup', sortOrder: 60 },
  { key: 'staff_setup', label: 'Staff setup', sortOrder: 70 },
  { key: 'training', label: 'Owner and staff training', sortOrder: 80 },
  { key: 'go_live_testing', label: 'Go-live testing', sortOrder: 90 },
  { key: 'final_go_live', label: 'Final go-live', sortOrder: 100 },
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];
export type PartnerTier = (typeof PARTNER_TIERS)[number];
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type DealStage = (typeof DEAL_STAGES)[number];
export type SetupStatus = (typeof SETUP_STATUSES)[number];
export type CommissionType = (typeof COMMISSION_TYPES)[number];
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];
export type ProductInterest = (typeof PRODUCT_INTERESTS)[number];
export type PainPoint = (typeof PAIN_POINTS)[number];
export type PlatformLinkKind = (typeof PLATFORM_LINK_KINDS)[number];

export type PartnerProfile = {
  id: string;
  auth_user_id: string;
  full_name: string;
  phone: string | null;
  email: string;
  city: string | null;
  locality_areas: string[];
  partner_type: PartnerType;
  tier: PartnerTier;
  application_status: ApplicationStatus;
  certification_status: string;
  quality_score: number;
  referral_code: string;
  created_at: string;
};

export type PartnerLead = {
  id: string;
  partner_id: string;
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  city: string;
  locality: string;
  restaurant_type: string;
  legal_business_name?: string | null;
  branch_address?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  timezone?: string | null;
  gst_registration_type?: string | null;
  outlet_count: number;
  current_system: string | null;
  products_interested: ProductInterest[];
  pain_points: PainPoint[];
  requested_plan_id?: string | null;
  requested_feature_codes?: string[];
  requested_branch_count?: number;
  requested_package_summary?: string | null;
  requested_monthly_revenue_cents?: number;
  requested_commission_preview_cents?: number;
  requested_commission_preview?: unknown;
  affiliate_reported_platform_link_kind?: PlatformLinkKind | null;
  affiliate_reported_existing_customer_notes?: string | null;
  onboarding_intent?: unknown;
  relationship_context: string;
  consent_to_contact: boolean;
  preferred_contact_time: string | null;
  notes: string | null;
  status: LeadStatus;
  rejection_reason: string | null;
  platform_match_kind?: PlatformLinkKind | null;
  platform_match_confidence?: number | null;
  platform_match_evidence?: unknown;
  platform_review_decision?: string | null;
  existing_franchise_id?: string | null;
  existing_branch_id?: string | null;
  created_at: string;
};

export type PartnerDeal = {
  id: string;
  partner_id: string;
  lead_id: string;
  franchise_id?: string | null;
  branch_id?: string | null;
  requested_plan_id?: string | null;
  requested_feature_codes?: string[];
  requested_branch_count?: number;
  requested_package_summary?: string | null;
  requested_monthly_revenue_cents?: number;
  requested_commission_preview_cents?: number;
  affiliate_package_snapshot?: unknown;
  approval_package_snapshot?: unknown;
  subscription_plan_id?: string | null;
  platform_link_kind?: PlatformLinkKind;
  onboarding_request_id?: string | null;
  platform_metadata?: unknown;
  stage: DealStage;
  sales_mode: string;
  package_summary: string | null;
  products_sold: string[];
  expected_commission_cents: number;
  currency_code: string;
  next_action: string | null;
  won_at: string | null;
  lost_at: string | null;
  live_at: string | null;
};

export type PartnerCommission = {
  id: string;
  partner_id: string;
  deal_id: string | null;
  lead_id: string | null;
  commission_type: CommissionType;
  status: CommissionStatus;
  amount_cents: number;
  currency_code: string;
  condition_summary: string;
  eligible_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  rejection_reason: string | null;
  held_reason: string | null;
};
