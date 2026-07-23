import { unstable_noStore as noStore } from 'next/cache';
import {
  assertPartnerPlatformSchemaReady,
  assertPartnerSchemaReady,
  getDatabase,
  toJsonValue,
  toPartnerDatabaseError,
  type SqlExecutor,
} from '@/lib/db/client';
import { assertFeatureCodesExist, getActivePlatformPlan, getPlatformCatalog } from './platform/catalog';
import { buildRequestedPackageSnapshot, type PackageCommissionRule } from './platform/package';
import { reconcileLeadAgainstPlatform, persistLeadReconciliation } from './platform/reconciliation';
import { createReferralCode } from './referral';
import { defaultPartnerResources } from './resources';
import { assertPartnerLeadAccess, evaluatePartnerLeadAccess, type LeadAccessResult } from './lead-access';
import { getCurrentReferralPartnerAgreementDocument } from './referral-agreement.server';
import { REFERRAL_PARTNER_AGREEMENT_VERSION } from './referral-agreement';
import {
  LEAD_ENABLED_APPLICATION_STATUSES,
  type PartnerAgreementAcceptance,
  type PartnerLead,
  type PartnerProfile,
} from './types';

export type PartnerDashboard = {
  profile: PartnerProfile | null;
  agreementAcceptance: PartnerAgreementAcceptance | null;
  leads: any[];
  deals: any[];
  commissions: any[];
  setupChecklists: any[];
  payoutMethods: any[];
  notifications: any[];
};

export type PartnerSalesCatalog = {
  platformCatalog: Awaited<ReturnType<typeof getPlatformCatalog>>;
  commissionRules: any[];
};

export type AdminDashboard = {
  partners: any[];
  applications: any[];
  leads: any[];
  deals: any[];
  setupChecklists: any[];
  commissions: any[];
  payoutMethods: any[];
  payoutBatches: any[];
  disputes: any[];
  platformCatalog: Awaited<ReturnType<typeof getPlatformCatalog>>;
  onboardingRequests: any[];
  platformAttributions: any[];
  verificationRules: any[];
};

export type PartnerApplicationInput = {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  localityAreas: string[];
  partnerType: string;
  restaurantExperience: string;
  restaurantNetworkSize: number;
  canVisitRestaurants: boolean;
  canHelpSetup: boolean;
  applicantKind: string;
  businessName?: string;
  linkedinProfileUrl?: string;
  resumeDriveUrl?: string;
  background: string;
  preferredLanguage: string;
  heardFrom: string;
  programTermsVersion: string | null;
  programTermsAcceptedAt: string | null;
  programContactConsentAt: string | null;
  privacyNoticeVersion: string | null;
  privacyNoticeAcknowledgedAt: string | null;
};

export type PartnerPayoutMethodInput = {
  payoutName: string;
  payoutType: string;
  upiId?: string;
  bankName?: string;
  bankAccountLast4?: string;
  bankAccountReference?: string;
  taxId?: string;
  gstNumber?: string;
};

export type PartnerLeadInput = {
  restaurant_name: string;
  legal_business_name?: string | null;
  owner_name: string;
  phone: string;
  email?: string | null;
  city: string;
  locality: string;
  branch_address?: string | null;
  state?: string | null;
  country: string;
  postal_code?: string | null;
  timezone: string;
  gst_registration_type?: string | null;
  restaurant_type?: string | null;
  outlet_count: number;
  requested_plan_id?: string | null;
  requested_feature_codes: string[];
  requested_branch_count: number;
  affiliate_reported_platform_link_kind?: string | null;
  affiliate_reported_existing_customer_notes?: string | null;
  current_system?: string | null;
  products_interested: string[];
  pain_points: string[];
  relationship_context: string;
  consent_to_contact: boolean;
  preferred_contact_time?: string | null;
  notes?: string | null;
};

export type PendingPartnerApplicationRow = {
  full_name: string;
  phone: string;
  email: string;
  city: string;
  locality_areas: string[];
  requested_partner_type: string;
  restaurant_experience: string;
  restaurant_network_size: number;
  can_visit_restaurants: boolean;
  can_help_setup: boolean;
  applicant_kind: string;
  business_name: string | null;
  linkedin_profile_url: string | null;
  resume_drive_url: string | null;
  background: string;
  preferred_language: string;
  heard_from: string;
  program_terms_version: string | null;
  program_terms_accepted_at: string | null;
  program_contact_consent_at: string | null;
  privacy_notice_version: string | null;
  privacy_notice_acknowledged_at: string | null;
};

function maybeSingle<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function firstRow<T>(rows: readonly T[], message: string) {
  const row = rows[0];
  if (!row) throw new Error(message);
  return row;
}

async function getPartnerProfileByAuthUserWithClient(sql: SqlExecutor, authUserId: string) {
  const rows = await sql`
    select *
    from public.partner_profiles
    where auth_user_id = ${authUserId}
    limit 1
  `;

  return (rows[0] as PartnerProfile | undefined) ?? null;
}

async function getPartnerProfileForUpdate(sql: SqlExecutor, authUserId: string) {
  const rows = await sql`
    select *
    from public.partner_profiles
    where auth_user_id = ${authUserId}
    limit 1
    for update
  `;

  return (rows[0] as PartnerProfile | undefined) ?? null;
}

async function getCurrentAgreementAcceptanceWithClient(sql: SqlExecutor, partnerId: string) {
  const rows = await sql`
    select
      id,
      partner_id,
      auth_user_id,
      accepted_email,
      agreement_title,
      agreement_version,
      agreement_sha256,
      accepted_at,
      source_path
    from public.partner_agreement_acceptances
    where partner_id = ${partnerId}
      and agreement_version = ${REFERRAL_PARTNER_AGREEMENT_VERSION}
    order by accepted_at desc
    limit 1
  `;

  return (rows[0] as PartnerAgreementAcceptance | undefined) ?? null;
}

export async function getPartnerProfileByAuthUser(authUserId: string, sql: SqlExecutor = getDatabase()) {
  try {
    await assertPartnerSchemaReady();
    return getPartnerProfileByAuthUserWithClient(sql, authUserId);
  } catch (error) {
    throw toPartnerDatabaseError(error);
  }
}

async function getCommissionPreviewRules(sql: SqlExecutor, partnerType?: string | null): Promise<PackageCommissionRule[]> {
  const rows = await sql`
    select
      code,
      partner_type,
      commission_type,
      fixed_amount_cents,
      percent_bps,
      currency_code,
      validation_days
    from public.partner_commission_rules
    where is_active = true
      and commission_type in ('referral', 'sales')
      and (
        partner_type is null
        or partner_type = ${partnerType || null}
        or partner_type = 'affiliate'
      )
    order by
      case when partner_type = ${partnerType || null} then 0 when partner_type = 'affiliate' then 1 else 2 end,
      case when commission_type = 'referral' then 0 else 1 end,
      created_at desc
  `;

  return rows as unknown as PackageCommissionRule[];
}

export async function getPartnerSalesCatalog(authUserId: string): Promise<PartnerSalesCatalog> {
  noStore();
  try {
    await assertPartnerPlatformSchemaReady();
    const sql = getDatabase();
    const profile = await getPartnerProfileByAuthUserWithClient(sql, authUserId);
    const agreementAcceptance = profile
      ? await getCurrentAgreementAcceptanceWithClient(sql, profile.id)
      : null;
    const eligibleProfile = assertPartnerLeadAccess(profile, agreementAcceptance);
    const [platformCatalog, commissionRules] = await Promise.all([
      getPlatformCatalog(sql),
      getCommissionPreviewRules(sql, eligibleProfile.partner_type),
    ]);

    return {
      platformCatalog,
      commissionRules: [...commissionRules],
    };
  } catch (error) {
    throw toPartnerDatabaseError(error);
  }
}

export async function getPartnerLeadAccess(authUserId: string): Promise<LeadAccessResult> {
  try {
    await assertPartnerSchemaReady();
    const sql = getDatabase();
    const profile = await getPartnerProfileByAuthUserWithClient(sql, authUserId);
    const agreementAcceptance = profile
      ? await getCurrentAgreementAcceptanceWithClient(sql, profile.id)
      : null;
    return evaluatePartnerLeadAccess(profile, agreementAcceptance);
  } catch (error) {
    throw toPartnerDatabaseError(error);
  }
}

export async function getPartnerAgreementState(authUserId: string) {
  noStore();
  try {
    await assertPartnerSchemaReady();
    const sql = getDatabase();
    const profile = await getPartnerProfileByAuthUserWithClient(sql, authUserId);
    const agreementAcceptance = profile
      ? await getCurrentAgreementAcceptanceWithClient(sql, profile.id)
      : null;

    return { profile, agreementAcceptance };
  } catch (error) {
    throw toPartnerDatabaseError(error);
  }
}

export async function getPartnerDashboard(authUserId: string, authEmail?: string | null): Promise<PartnerDashboard> {
  noStore();
  try {
    await assertPartnerPlatformSchemaReady();
    const sql = getDatabase();
    let profile = await getPartnerProfileByAuthUserWithClient(sql, authUserId);

    if (!profile && authEmail) {
      profile = await claimPendingPartnerApplication(authUserId, authEmail);
    }

    if (!profile) {
      return {
        profile: null,
        agreementAcceptance: null,
        leads: [],
        deals: [],
        commissions: [],
        setupChecklists: [],
        payoutMethods: [],
        notifications: [],
      };
    }

    const agreementAcceptance = await getCurrentAgreementAcceptanceWithClient(sql, profile.id);

    const leads = await sql`
      select
        l.*,
        case
          when sp.id is null then null
          else json_build_object('id', sp.id, 'name', sp.name, 'code', sp.code, 'price_cents', sp.price_cents, 'currency_code', sp.currency_code)
        end as requested_subscription_plans
      from public.partner_leads l
      left join public.subscription_plans sp on sp.id = l.requested_plan_id
      where l.partner_id = ${profile.id}
      order by l.created_at desc
      limit 100
    `;
    const deals = await sql`
      select
        d.*,
        case
          when l.id is null then null
          else json_build_object(
            'restaurant_name', l.restaurant_name,
            'city', l.city,
            'locality', l.locality,
            'requested_package_summary', l.requested_package_summary,
            'requested_commission_preview_cents', l.requested_commission_preview_cents
          )
        end as partner_leads,
        case
          when requested_sp.id is null then null
          else json_build_object('id', requested_sp.id, 'name', requested_sp.name, 'code', requested_sp.code, 'price_cents', requested_sp.price_cents, 'currency_code', requested_sp.currency_code)
        end as requested_subscription_plans,
        case
          when approved_sp.id is null then null
          else json_build_object('id', approved_sp.id, 'name', approved_sp.name, 'code', approved_sp.code, 'price_cents', approved_sp.price_cents, 'currency_code', approved_sp.currency_code)
        end as subscription_plans,
        case
          when req.id is null then null
          else json_build_object('id', req.id, 'status', req.status, 'created_franchise_id', req.created_franchise_id, 'created_branch_id', req.created_branch_id, 'execution_error', req.execution_error)
        end as partner_platform_onboarding_requests
      from public.partner_deals d
      left join public.partner_leads l on l.id = d.lead_id
      left join public.subscription_plans requested_sp on requested_sp.id = d.requested_plan_id
      left join public.subscription_plans approved_sp on approved_sp.id = d.subscription_plan_id
      left join public.partner_platform_onboarding_requests req on req.id = d.onboarding_request_id
      where d.partner_id = ${profile.id}
      order by d.updated_at desc
      limit 100
    `;
    const commissions = await sql`
      select
        c.*,
        case when l.id is null then null else json_build_object('restaurant_name', l.restaurant_name) end as partner_leads,
        case when d.id is null then null else json_build_object('stage', d.stage) end as partner_deals
      from public.partner_commissions c
      left join public.partner_leads l on l.id = c.lead_id
      left join public.partner_deals d on d.id = c.deal_id
      where c.partner_id = ${profile.id}
      order by c.created_at desc
      limit 100
    `;
    const setupChecklists = await sql`
      select
        sc.*,
        case
          when d.id is null then null
          else json_build_object('stage', d.stage, 'restaurant_name', l.restaurant_name)
        end as partner_deals,
        coalesce(tasks.partner_setup_tasks, '[]'::json) as partner_setup_tasks
      from public.partner_setup_checklists sc
      left join public.partner_deals d on d.id = sc.deal_id
      left join public.partner_leads l on l.id = d.lead_id
      left join lateral (
        select json_agg(t order by t.sort_order asc, t.created_at asc) as partner_setup_tasks
        from public.partner_setup_tasks t
        where t.checklist_id = sc.id
      ) tasks on true
      where sc.partner_id = ${profile.id}
      order by sc.updated_at desc
      limit 50
    `;
    const payoutMethods = await sql`
      select *
      from public.partner_payout_methods
      where partner_id = ${profile.id}
      order by created_at desc
      limit 10
    `;
    const notifications = await sql`
      select *
      from public.partner_notifications
      where partner_id = ${profile.id}
      order by created_at desc
      limit 30
    `;
    return {
      profile,
      agreementAcceptance,
      leads: [...leads],
      deals: [...deals],
      commissions: [...commissions],
      setupChecklists: [...setupChecklists],
      payoutMethods: [...payoutMethods],
      notifications: [...notifications],
    };
  } catch (error) {
    throw toPartnerDatabaseError(error);
  }
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  noStore();
  try {
    await assertPartnerPlatformSchemaReady();
    const sql = getDatabase();
    const platformCatalog = await getPlatformCatalog(sql);
    const partners = await sql`
      select
        p.*,
        paa.agreement_version as current_agreement_version,
        paa.accepted_at as current_agreement_accepted_at
      from public.partner_profiles p
      left join lateral (
        select agreement_version, accepted_at
        from public.partner_agreement_acceptances
        where partner_id = p.id
          and agreement_version = ${REFERRAL_PARTNER_AGREEMENT_VERSION}
        order by accepted_at desc
        limit 1
      ) paa on true
      order by created_at desc
      limit 200
    `;
    const applications = await sql`
      select
        a.*,
        paa.agreement_version as current_agreement_version,
        paa.accepted_at as current_agreement_accepted_at,
        paa.agreement_sha256 as current_agreement_sha256,
        case
          when p.id is null then null
          else json_build_object('full_name', p.full_name, 'email', p.email, 'city', p.city)
        end as partner_profiles
      from public.partner_applications a
      left join public.partner_profiles p on p.id = a.partner_id
      left join lateral (
        select agreement_version, accepted_at, agreement_sha256
        from public.partner_agreement_acceptances
        where partner_id = a.partner_id
          and agreement_version = ${REFERRAL_PARTNER_AGREEMENT_VERSION}
        order by accepted_at desc
        limit 1
      ) paa on true
      order by a.submitted_at desc
      limit 200
    `;
    const leads = await sql`
      select
        l.*,
        case
          when p.id is null then null
          else json_build_object('full_name', p.full_name, 'email', p.email)
        end as partner_profiles,
        case
          when sp.id is null then null
          else json_build_object('id', sp.id, 'name', sp.name, 'code', sp.code, 'price_cents', sp.price_cents, 'currency_code', sp.currency_code)
        end as requested_subscription_plans
      from public.partner_leads l
      left join public.partner_profiles p on p.id = l.partner_id
      left join public.subscription_plans sp on sp.id = l.requested_plan_id
      order by l.created_at desc
      limit 200
    `;
    const deals = await sql`
      select
        d.*,
        case
          when l.id is null then null
          else json_build_object('restaurant_name', l.restaurant_name, 'city', l.city, 'email', l.email)
        end as partner_leads,
        case when p.id is null then null else json_build_object('full_name', p.full_name) end as partner_profiles,
        case when requested_sp.id is null then null else json_build_object('id', requested_sp.id, 'name', requested_sp.name, 'code', requested_sp.code, 'price_cents', requested_sp.price_cents, 'currency_code', requested_sp.currency_code) end as requested_subscription_plans,
        case when sp.id is null then null else json_build_object('id', sp.id, 'name', sp.name, 'code', sp.code, 'price_cents', sp.price_cents, 'currency_code', sp.currency_code) end as subscription_plans,
        case when req.id is null then null else json_build_object('id', req.id, 'status', req.status, 'created_franchise_id', req.created_franchise_id, 'created_branch_id', req.created_branch_id) end as partner_platform_onboarding_requests
      from public.partner_deals d
      left join public.partner_leads l on l.id = d.lead_id
      left join public.partner_profiles p on p.id = d.partner_id
      left join public.subscription_plans requested_sp on requested_sp.id = d.requested_plan_id
      left join public.subscription_plans sp on sp.id = d.subscription_plan_id
      left join public.partner_platform_onboarding_requests req on req.id = d.onboarding_request_id
      order by d.updated_at desc
      limit 200
    `;
    const setupChecklists = await sql`
      select
        sc.*,
        case when p.id is null then null else json_build_object('full_name', p.full_name) end as partner_profiles,
        case when d.id is null then null else json_build_object('stage', d.stage) end as partner_deals,
        coalesce(tasks.partner_setup_tasks, '[]'::json) as partner_setup_tasks
      from public.partner_setup_checklists sc
      left join public.partner_profiles p on p.id = sc.partner_id
      left join public.partner_deals d on d.id = sc.deal_id
      left join lateral (
        select json_agg(t order by t.sort_order asc, t.created_at asc) as partner_setup_tasks
        from public.partner_setup_tasks t
        where t.checklist_id = sc.id
      ) tasks on true
      order by sc.updated_at desc
      limit 100
    `;
    const commissions = await sql`
      select
        c.*,
        case when p.id is null then null else json_build_object('full_name', p.full_name) end as partner_profiles,
        case when l.id is null then null else json_build_object('restaurant_name', l.restaurant_name) end as partner_leads,
        case when d.id is null then null else json_build_object('stage', d.stage, 'platform_link_kind', d.platform_link_kind) end as partner_deals
      from public.partner_commissions c
      left join public.partner_profiles p on p.id = c.partner_id
      left join public.partner_leads l on l.id = c.lead_id
      left join public.partner_deals d on d.id = c.deal_id
      order by c.created_at desc
      limit 200
    `;
    const payoutMethods = await sql`
      select
        pm.*,
        case
          when p.id is null then null
          else json_build_object('full_name', p.full_name, 'email', p.email)
        end as partner_profiles
      from public.partner_payout_methods pm
      left join public.partner_profiles p on p.id = pm.partner_id
      order by pm.created_at desc
      limit 100
    `;
    const payoutBatches = await sql`
      select *
      from public.partner_payout_batches
      order by created_at desc
      limit 50
    `;
    const disputes = await sql`
      select
        d.*,
        case when p.id is null then null else json_build_object('full_name', p.full_name) end as partner_profiles,
        case when l.id is null then null else json_build_object('restaurant_name', l.restaurant_name) end as partner_leads
      from public.partner_disputes d
      left join public.partner_profiles p on p.id = d.partner_id
      left join public.partner_leads l on l.id = d.lead_id
      order by d.created_at desc
      limit 100
    `;
    const onboardingRequests = await sql`
      select
        req.*,
        case when p.id is null then null else json_build_object('full_name', p.full_name, 'email', p.email) end as partner_profiles,
        case when l.id is null then null else json_build_object('restaurant_name', l.restaurant_name, 'city', l.city, 'locality', l.locality) end as partner_leads,
        case when d.id is null then null else json_build_object('stage', d.stage, 'platform_link_kind', d.platform_link_kind) end as partner_deals,
        case when affiliate_sp.id is null then null else json_build_object('name', affiliate_sp.name, 'code', affiliate_sp.code, 'price_cents', affiliate_sp.price_cents, 'currency_code', affiliate_sp.currency_code) end as affiliate_subscription_plans,
        case when sp.id is null then null else json_build_object('name', sp.name, 'code', sp.code, 'price_cents', sp.price_cents, 'currency_code', sp.currency_code) end as subscription_plans,
        case when f.id is null then null else json_build_object('name', f.name, 'code', f.code, 'status', f.status) end as franchises,
        case when b.id is null then null else json_build_object('name', b.name, 'code', b.code, 'status', b.status) end as branches
      from public.partner_platform_onboarding_requests req
      left join public.partner_profiles p on p.id = req.partner_id
      left join public.partner_leads l on l.id = req.lead_id
      left join public.partner_deals d on d.id = req.deal_id
      left join public.subscription_plans affiliate_sp on affiliate_sp.id = req.affiliate_requested_plan_id
      left join public.subscription_plans sp on sp.id = req.requested_plan_id
      left join public.franchises f on f.id = req.created_franchise_id
      left join public.branches b on b.id = req.created_branch_id
      order by req.updated_at desc
      limit 200
    `;
    const platformAttributions = await sql`
      select
        a.*,
        case when p.id is null then null else json_build_object('full_name', p.full_name, 'email', p.email) end as partner_profiles,
        case when f.id is null then null else json_build_object('name', f.name, 'code', f.code, 'status', f.status) end as franchises,
        case when b.id is null then null else json_build_object('name', b.name, 'code', b.code, 'status', b.status) end as branches
      from public.partner_platform_attributions a
      left join public.partner_profiles p on p.id = a.partner_id
      left join public.franchises f on f.id = a.franchise_id
      left join public.branches b on b.id = a.branch_id
      order by a.created_at desc
      limit 200
    `;
    const verificationRules = await sql`
      select *
      from public.partner_setup_verification_rules
      where is_active = true
      order by sort_order asc, code asc
    `;

    return {
      partners: [...partners],
      applications: [...applications],
      leads: [...leads],
      deals: [...deals],
      setupChecklists: [...setupChecklists],
      commissions: [...commissions],
      payoutMethods: [...payoutMethods],
      payoutBatches: [...payoutBatches],
      disputes: [...disputes],
      platformCatalog,
      onboardingRequests: [...onboardingRequests],
      platformAttributions: [...platformAttributions],
      verificationRules: [...verificationRules],
    };
  } catch (error) {
    throw toPartnerDatabaseError(error);
  }
}

export function pendingRowToApplicationInput(row: PendingPartnerApplicationRow): PartnerApplicationInput {
  return {
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    localityAreas: row.locality_areas,
    partnerType: row.requested_partner_type,
    restaurantExperience: row.restaurant_experience,
    restaurantNetworkSize: row.restaurant_network_size,
    canVisitRestaurants: row.can_visit_restaurants,
    canHelpSetup: row.can_help_setup,
    applicantKind: row.applicant_kind,
    businessName: row.business_name ?? undefined,
    linkedinProfileUrl: row.linkedin_profile_url ?? undefined,
    resumeDriveUrl: row.resume_drive_url ?? undefined,
    background: row.background,
    preferredLanguage: row.preferred_language,
    heardFrom: row.heard_from,
    programTermsVersion: row.program_terms_version,
    programTermsAcceptedAt: row.program_terms_accepted_at,
    programContactConsentAt: row.program_contact_consent_at,
    privacyNoticeVersion: row.privacy_notice_version,
    privacyNoticeAcknowledgedAt: row.privacy_notice_acknowledged_at,
  };
}

export async function savePendingPartnerApplication(input: PartnerApplicationInput) {
  await assertPartnerSchemaReady();
  const sql = getDatabase();

  await sql`
    insert into public.partner_pending_applications (
      email,
      email_normalized,
      full_name,
      phone,
      city,
      locality_areas,
      requested_partner_type,
      restaurant_experience,
      restaurant_network_size,
      can_visit_restaurants,
      can_help_setup,
      applicant_kind,
      business_name,
      linkedin_profile_url,
      resume_drive_url,
      background,
      preferred_language,
      heard_from,
      program_terms_version,
      program_terms_accepted_at,
      program_contact_consent_at,
      privacy_notice_version,
      privacy_notice_acknowledged_at,
      status,
      updated_at
    )
    values (
      ${input.email},
      ${input.email.toLowerCase()},
      ${input.fullName},
      ${input.phone},
      ${input.city},
      ${input.localityAreas},
      ${input.partnerType},
      ${input.restaurantExperience},
      ${input.restaurantNetworkSize},
      ${input.canVisitRestaurants},
      ${input.canHelpSetup},
      ${input.applicantKind},
      ${input.businessName || null},
      ${input.linkedinProfileUrl || null},
      ${input.resumeDriveUrl || null},
      ${input.background},
      ${input.preferredLanguage},
      ${input.heardFrom},
      ${input.programTermsVersion},
      ${input.programTermsAcceptedAt},
      ${input.programContactConsentAt},
      ${input.privacyNoticeVersion},
      ${input.privacyNoticeAcknowledgedAt},
      'awaiting_email_confirmation',
      now()
    )
    on conflict (email_normalized)
    do update set
      email = excluded.email,
      full_name = excluded.full_name,
      phone = excluded.phone,
      city = excluded.city,
      locality_areas = excluded.locality_areas,
      requested_partner_type = excluded.requested_partner_type,
      restaurant_experience = excluded.restaurant_experience,
      restaurant_network_size = excluded.restaurant_network_size,
      can_visit_restaurants = excluded.can_visit_restaurants,
      can_help_setup = excluded.can_help_setup,
      applicant_kind = excluded.applicant_kind,
      business_name = excluded.business_name,
      linkedin_profile_url = excluded.linkedin_profile_url,
      resume_drive_url = excluded.resume_drive_url,
      background = excluded.background,
      preferred_language = excluded.preferred_language,
      heard_from = excluded.heard_from,
      program_terms_version = excluded.program_terms_version,
      program_terms_accepted_at = excluded.program_terms_accepted_at,
      program_contact_consent_at = excluded.program_contact_consent_at,
      privacy_notice_version = excluded.privacy_notice_version,
      privacy_notice_acknowledged_at = excluded.privacy_notice_acknowledged_at,
      status = 'awaiting_email_confirmation',
      auth_user_id = null,
      claimed_at = null,
      updated_at = now()
  `;
}

export async function claimPendingPartnerApplication(authUserId: string, email: string) {
  await assertPartnerSchemaReady();
  const sql = getDatabase();
  const normalizedEmail = email.toLowerCase();
  const rows = await sql`
    select *
    from public.partner_pending_applications
    where email_normalized = ${normalizedEmail}
      and status = 'awaiting_email_confirmation'
    order by updated_at desc
    limit 1
  `;
  const pendingApplication = rows[0] as PendingPartnerApplicationRow | undefined;

  if (!pendingApplication) return null;

  const profile = await upsertPartnerApplication(authUserId, pendingRowToApplicationInput(pendingApplication));

  await sql`
    update public.partner_pending_applications
    set
      status = 'claimed',
      auth_user_id = ${authUserId},
      claimed_at = now(),
      updated_at = now()
    where email_normalized = ${normalizedEmail}
  `;

  return profile;
}

export async function upsertPartnerApplication(authUserId: string, input: PartnerApplicationInput) {
  await assertPartnerSchemaReady();
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    const existingProfile = await getPartnerProfileForUpdate(tx, authUserId);
    if (existingProfile) {
      throw new Error('A partner application already exists for this account. Open the partner portal to view its status.');
    }
    const referralCode = createReferralCode(input.fullName, input.city);

    const profileRows = await tx`
      insert into public.partner_profiles (
        auth_user_id,
        full_name,
        phone,
        email,
        city,
        locality_areas,
        partner_type,
        tier,
        application_status,
        certification_status,
        referral_code,
        updated_at
      )
      values (
        ${authUserId},
        ${input.fullName},
        ${input.phone},
        ${input.email},
        ${input.city},
        ${input.localityAreas},
        ${input.partnerType},
        'affiliate',
        'submitted',
        'not_started',
        ${referralCode},
        now()
      )
      returning *
    `;
    const profile = firstRow(profileRows as unknown as PartnerProfile[], 'Failed to save partner profile.');

    await tx`
      insert into public.partner_referral_codes (partner_id, code, status, updated_at)
      values (${profile.id}, ${referralCode}, 'active', now())
      on conflict (code)
      do update set
        partner_id = excluded.partner_id,
        status = 'active',
        updated_at = now()
    `;

    await tx`
      insert into public.partner_applications (
        partner_id,
        auth_user_id,
        full_name,
        phone,
        email,
        city,
        locality_areas,
        requested_partner_type,
        restaurant_experience,
        restaurant_network_size,
        can_visit_restaurants,
        can_help_setup,
        applicant_kind,
        business_name,
        linkedin_profile_url,
        resume_drive_url,
        background,
        preferred_language,
        heard_from,
        program_terms_version,
        program_terms_accepted_at,
        program_contact_consent_at,
        privacy_notice_version,
        privacy_notice_acknowledged_at,
        status,
        submitted_at,
        updated_at
      )
      values (
        ${profile.id},
        ${authUserId},
        ${input.fullName},
        ${input.phone},
        ${input.email},
        ${input.city},
        ${input.localityAreas},
        ${input.partnerType},
        ${input.restaurantExperience},
        ${input.restaurantNetworkSize},
        ${input.canVisitRestaurants},
        ${input.canHelpSetup},
        ${input.applicantKind},
        ${input.businessName || null},
        ${input.linkedinProfileUrl || null},
        ${input.resumeDriveUrl || null},
        ${input.background},
        ${input.preferredLanguage},
        ${input.heardFrom},
        ${input.programTermsVersion},
        ${input.programTermsAcceptedAt},
        ${input.programContactConsentAt},
        ${input.privacyNoticeVersion},
        ${input.privacyNoticeAcknowledgedAt},
        'submitted',
        now(),
        now()
      )
    `;

    await tx`
      update public.partner_pending_applications
      set
        status = 'claimed',
        auth_user_id = ${authUserId},
        claimed_at = coalesce(claimed_at, now()),
        updated_at = now()
      where email_normalized = ${input.email.toLowerCase()}
    `;

    return profile;
  });
}

export async function acceptReferralPartnerAgreement(authUserId: string, acceptedEmail: string) {
  await assertPartnerSchemaReady();
  const sql = getDatabase();
  const document = getCurrentReferralPartnerAgreementDocument();

  return sql.begin(async (tx) => {
    const profile = await getPartnerProfileForUpdate(tx, authUserId);

    if (!profile) {
      throw new Error('Complete your partner application before accepting the Referral Partner Agreement.');
    }

    if (profile.is_suspended) {
      throw new Error('Agreement acceptance is unavailable while this partner account is suspended.');
    }

    if (!LEAD_ENABLED_APPLICATION_STATUSES.includes(profile.application_status as never)) {
      throw new Error('Nom must approve your application before you can accept the Referral Partner Agreement.');
    }

    await tx`
      insert into public.partner_agreement_acceptances (
        partner_id,
        auth_user_id,
        accepted_email,
        agreement_title,
        agreement_version,
        agreement_sha256,
        agreement_text,
        source_path,
        accepted_at
      )
      values (
        ${profile.id},
        ${authUserId},
        ${acceptedEmail},
        ${document.title},
        ${document.version},
        ${document.sha256},
        ${document.text},
        '/partner/agreement',
        now()
      )
      on conflict (partner_id, agreement_version) do nothing
    `;

    const acceptance = await getCurrentAgreementAcceptanceWithClient(tx, profile.id);
    if (!acceptance) throw new Error('Failed to record the Referral Partner Agreement acceptance.');
    if (acceptance.agreement_sha256 !== document.sha256) {
      throw new Error('The stored agreement version does not match the current document. Contact Nom before submitting leads.');
    }

    return acceptance;
  });
}

export async function createPartnerLead(
  authUserId: string,
  input: PartnerLeadInput
) {
  await assertPartnerPlatformSchemaReady();
  const sql = getDatabase();

  return sql.begin(async (tx) => {
    const currentProfile = await getPartnerProfileForUpdate(tx, authUserId);
    const agreementAcceptance = currentProfile
      ? await getCurrentAgreementAcceptanceWithClient(tx, currentProfile.id)
      : null;
    const profile = assertPartnerLeadAccess(currentProfile, agreementAcceptance);
    let packageSnapshot: ReturnType<typeof buildRequestedPackageSnapshot> | null = null;

    if (input.requested_plan_id) {
      const plan = await getActivePlatformPlan(input.requested_plan_id, tx);
      const requestedFeatureCodes = await assertFeatureCodesExist(input.requested_feature_codes, tx);
      const platformCatalog = await getPlatformCatalog(tx);
      const commissionRules = await getCommissionPreviewRules(tx, profile.partner_type);
      packageSnapshot = buildRequestedPackageSnapshot({
        plan,
        selectedFeatureCodes: requestedFeatureCodes,
        requestedBranchCount: input.requested_branch_count,
        features: platformCatalog.features,
        commissionRules: [...commissionRules],
        partnerType: profile.partner_type,
      });
    }

    const requestedBranchCount = packageSnapshot?.branch_count ?? input.outlet_count;

    const leadRows = await tx`
      insert into public.partner_leads (
        partner_id,
        restaurant_name,
        legal_business_name,
        owner_name,
        phone,
        email,
        city,
        locality,
        branch_address,
        state,
        country,
        postal_code,
        timezone,
        gst_registration_type,
        restaurant_type,
        outlet_count,
        requested_plan_id,
        requested_feature_codes,
        requested_branch_count,
        requested_package_summary,
        requested_monthly_revenue_cents,
        requested_commission_preview_cents,
        requested_commission_preview,
        affiliate_reported_platform_link_kind,
        affiliate_reported_existing_customer_notes,
        onboarding_intent,
        current_system,
        products_interested,
        pain_points,
        relationship_context,
        consent_to_contact,
        preferred_contact_time,
        notes,
        status
      )
      values (
        ${profile.id},
        ${input.restaurant_name},
        ${input.legal_business_name || null},
        ${input.owner_name},
        ${input.phone},
        ${input.email || null},
        ${input.city},
        ${input.locality},
        ${input.branch_address || null},
        ${input.state || null},
        ${input.country || 'India'},
        ${input.postal_code || null},
        ${input.timezone || 'Asia/Kolkata'},
        ${input.gst_registration_type || null},
        ${input.restaurant_type || null},
        ${input.outlet_count},
        ${packageSnapshot?.plan_id || null},
        ${packageSnapshot?.feature_codes || []},
        ${requestedBranchCount},
        ${packageSnapshot?.summary || null},
        ${packageSnapshot?.monthly_revenue_cents || 0},
        ${packageSnapshot?.commission_preview_cents || 0},
        ${tx.json(toJsonValue(packageSnapshot?.commission_preview || {}))},
        ${input.affiliate_reported_platform_link_kind || null},
        ${input.affiliate_reported_existing_customer_notes || null},
        ${tx.json(toJsonValue({
          source: 'affiliate_partner_portal',
          requested_package: packageSnapshot,
          affiliate_reported_platform_link_kind: input.affiliate_reported_platform_link_kind || null,
          affiliate_reported_existing_customer_notes: input.affiliate_reported_existing_customer_notes || null,
          branch_handoff_complete: Boolean(input.branch_address && input.state && input.country),
        }))},
        ${input.current_system || null},
        ${input.products_interested},
        ${input.pain_points},
        ${input.relationship_context},
        ${input.consent_to_contact},
        ${input.preferred_contact_time || null},
        ${input.notes || null},
        'submitted'
      )
      returning *
    `;
    const lead = firstRow(leadRows as unknown as PartnerLead[], 'Failed to submit lead.');
    const reconciliation = await reconcileLeadAgainstPlatform(
      {
        leadId: lead.id,
        restaurantName: lead.restaurant_name,
        ownerName: lead.owner_name,
        phone: lead.phone,
        email: lead.email,
        city: lead.city,
        locality: lead.locality,
      },
      tx
    );
    await persistLeadReconciliation(lead.id, reconciliation, tx);

    await tx`
      insert into public.partner_lead_events (
        lead_id,
        actor_auth_user_id,
        actor_partner_id,
        event_type,
        to_status,
        note,
        metadata
      )
      values (
        ${lead.id},
        ${authUserId},
        ${profile.id},
        'lead_submitted',
        'submitted',
        'Partner submitted restaurant lead.',
        ${tx.json(toJsonValue({ platform_reconciliation: reconciliation, requested_package: packageSnapshot }))}
      )
    `;

    return lead;
  });
}

export async function savePartnerPayoutMethod(authUserId: string, input: PartnerPayoutMethodInput) {
  await assertPartnerSchemaReady();
  const sql = getDatabase();
  const currentProfile = await getPartnerProfileByAuthUserWithClient(sql, authUserId);
  const agreementAcceptance = currentProfile
    ? await getCurrentAgreementAcceptanceWithClient(sql, currentProfile.id)
    : null;
  const profile = assertPartnerLeadAccess(currentProfile, agreementAcceptance);

  await sql`
    insert into public.partner_payout_methods (
      partner_id,
      payout_name,
      payout_type,
      upi_id,
      bank_name,
      bank_account_last4,
      bank_account_reference,
      tax_id,
      gst_number,
      status
    )
    values (
      ${profile.id},
      ${input.payoutName},
      ${input.payoutType},
      ${input.upiId || null},
      ${input.bankName || null},
      ${input.bankAccountLast4 || null},
      ${input.bankAccountReference || null},
      ${input.taxId || null},
      ${input.gstNumber || null},
      'pending_approval'
    )
  `;
}

export async function ensureDefaultResources() {
  await assertPartnerSchemaReady();
  const sql = getDatabase();

  for (const [index, resource] of defaultPartnerResources.entries()) {
    await sql`
      insert into public.partner_resources (title, category, description, content, is_active, sort_order, updated_at)
      values (
        ${resource.title},
        ${resource.category},
        ${resource.description},
        ${resource.content},
        true,
        ${index * 10},
        now()
      )
      on conflict (title)
      do update set
        category = excluded.category,
        description = excluded.description,
        content = excluded.content,
        is_active = true,
        sort_order = excluded.sort_order,
        updated_at = now()
    `;
  }
}

export function summarizeEarnings(commissions: any[]) {
  return commissions.reduce(
    (summary, commission) => {
      const amount = Number(commission.amount_cents || 0);
      if (commission.status === 'paid') summary.paid += amount;
      else if (commission.status === 'approved' || commission.status === 'scheduled_for_payout') {
        summary.approved += amount;
      } else if (commission.status === 'pending' || commission.status === 'under_review') {
        summary.pending += amount;
      } else if (commission.status === 'estimated') {
        summary.estimated += amount;
      }
      return summary;
    },
    { estimated: 0, pending: 0, approved: 0, paid: 0 }
  );
}

export function firstRelation<T>(value: T | T[] | null | undefined) {
  return maybeSingle(value ?? null);
}
