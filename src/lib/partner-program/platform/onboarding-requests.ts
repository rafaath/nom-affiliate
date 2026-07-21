import { getDatabase, toJsonValue, type SqlExecutor } from '@/lib/db/client';
import { assertFeatureCodesExist, getActivePlatformPlan } from './catalog';
import type { OnboardingRequestDraft } from './types';

function slugCode(value: string, suffix: string, maxBaseLength = 12) {
  const base = value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, maxBaseLength);
  return `${base || 'NOM'}${suffix}`.slice(0, 20);
}

function splitOwnerName(ownerName: string) {
  const parts = ownerName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || 'Restaurant';
  const lastName = parts.slice(1).join(' ') || 'Owner';
  return { firstName, lastName };
}

function buildRequestPayload(input: OnboardingRequestDraft) {
  const suffix = input.leadId.replace(/-/g, '').slice(0, 5).toUpperCase();
  const franchiseCode = slugCode(input.restaurantName, suffix);
  const branchCode = slugCode(input.locality || input.city || input.restaurantName, `B${suffix}`, 10);
  const owner = splitOwnerName(input.ownerName);
  const currencyCode = input.currencyCode || 'INR';
  const currencySymbol = input.currencySymbol || '₹';
  const country = input.country || 'India';
  const timezone = input.timezone || 'Asia/Kolkata';
  const branchAddress = input.branchAddress || input.locality || input.city;

  const plannedFranchises = [
    {
      name: input.restaurantName,
      code: franchiseCode,
      legal_business_name: input.legalBusinessName || input.restaurantName,
      owner_name: input.ownerName,
      contact_email: input.ownerEmail,
      contact_phone: input.ownerPhone || null,
      branches: [
        {
          name: input.locality || input.restaurantName,
          code: branchCode,
          address: branchAddress,
          city: input.city,
          state: input.state || null,
          country,
          postal_code: input.postalCode || null,
          number_of_tables: 10,
          timezone,
          currency_code: currencyCode,
          currency_symbol: currencySymbol,
          opening_time: '',
          closing_time: '',
          is_primary: true,
        },
      ],
    },
  ];

  return {
    owner,
    plannedFranchises,
    apiPayload: {
      email: input.ownerEmail,
      firstName: owner.firstName,
      lastName: owner.lastName,
      phone: input.ownerPhone || null,
      franchises: [
        {
          name: input.restaurantName,
          code: franchiseCode,
          legalBusinessName: input.legalBusinessName || input.restaurantName,
          ownerName: input.ownerName,
          contactEmail: input.ownerEmail,
          contactPhone: input.ownerPhone || null,
          branches: [
            {
              name: input.locality || input.restaurantName,
              code: branchCode,
              address: branchAddress,
              city: input.city,
              state: input.state || null,
              country,
              postalCode: input.postalCode || null,
              numberOfTables: 10,
              timezone,
              currencyCode,
              currencySymbol,
              openingTime: '',
              closingTime: '',
              isPrimary: true,
            },
          ],
        },
      ],
      defaultPlanId: input.requestedPlanId,
    },
  };
}

export async function syncDealFeatureSelections(input: {
  dealId: string;
  franchiseId: string | null;
  branchId: string | null;
  planId: string;
  requestedFeatureCodes: string[];
  sql?: SqlExecutor;
}) {
  const sql = input.sql ?? getDatabase();
  const plan = await getActivePlatformPlan(input.planId, sql);
  const requestedFeatureCodes = await assertFeatureCodesExist(input.requestedFeatureCodes, sql);
  const featureCodes = [...new Set([...plan.feature_codes, ...requestedFeatureCodes])];

  const features = featureCodes.length
    ? await sql`
        select id, code
        from public.features
        where code = any(${featureCodes}::text[])
          and is_active = true
      `
    : [];

  await sql`
    update public.partner_deals
    set
      subscription_plan_id = ${plan.id},
      products_sold = ${featureCodes},
      package_summary = ${`${plan.name} · ${featureCodes.length} platform capabilities`},
      updated_at = now()
    where id = ${input.dealId}
  `;

  if (!input.franchiseId) return { plan, featureCodes };

  for (const feature of features as any[]) {
    const scopeKind = input.branchId ? 'branch' : 'franchise';
    await sql`
      insert into public.partner_deal_feature_selections (
        deal_id,
        feature_id,
        feature_code,
        scope_kind,
        franchise_id,
        branch_id,
        source,
        is_required,
        metadata
      )
      values (
        ${input.dealId},
        ${feature.id},
        ${feature.code},
        ${scopeKind},
        ${input.franchiseId},
        ${input.branchId},
        ${plan.feature_codes.includes(feature.code) ? 'plan' : 'addon'},
        true,
        ${sql.json(toJsonValue({ plan_id: plan.id }))}
      )
      on conflict do nothing
    `;
  }

  return { plan, featureCodes };
}

export async function createOrUpdateOnboardingRequest(input: OnboardingRequestDraft, sql: SqlExecutor = getDatabase()) {
  const plan = await getActivePlatformPlan(input.requestedPlanId, sql);
  const requestedFeatureCodes = await assertFeatureCodesExist(input.requestedFeatureCodes, sql);
  const approvedFeatureCodes = [...new Set([...plan.feature_codes, ...requestedFeatureCodes])];
  const payload = buildRequestPayload({ ...input, requestedFeatureCodes });

  const rows = await sql`
    insert into public.partner_platform_onboarding_requests (
      deal_id,
      lead_id,
      partner_id,
      status,
      requested_plan_id,
      requested_feature_codes,
      requested_branch_count,
      affiliate_requested_plan_id,
      affiliate_requested_feature_codes,
      affiliate_requested_branch_count,
      affiliate_package_snapshot,
      restaurant_name,
      legal_business_name,
      owner_first_name,
      owner_last_name,
      owner_email,
      owner_phone,
      city,
      locality,
      branch_address,
      state,
      country,
      postal_code,
      timezone,
      currency_code,
      currency_symbol,
      restaurant_type,
      gst_registration_type,
      affiliate_sales_context,
      planned_franchises,
      request_payload,
      updated_at
    )
    values (
      ${input.dealId},
      ${input.leadId},
      ${input.partnerId},
      'submitted',
      ${plan.id},
      ${approvedFeatureCodes},
      ${input.requestedBranchCount},
      ${input.affiliateRequestedPlanId || null},
      ${input.affiliateRequestedFeatureCodes || []},
      ${input.affiliateRequestedBranchCount || input.requestedBranchCount},
      ${sql.json(toJsonValue(input.affiliatePackageSnapshot || {}))},
      ${input.restaurantName},
      ${input.legalBusinessName || null},
      ${payload.owner.firstName},
      ${payload.owner.lastName},
      ${input.ownerEmail},
      ${input.ownerPhone || null},
      ${input.city},
      ${input.locality || null},
      ${input.branchAddress || null},
      ${input.state || null},
      ${input.country || 'India'},
      ${input.postalCode || null},
      ${input.timezone || 'Asia/Kolkata'},
      ${input.currencyCode || 'INR'},
      ${input.currencySymbol || '₹'},
      ${input.restaurantType || null},
      ${input.gstRegistrationType || null},
      ${sql.json(toJsonValue({
        source: 'affiliate_partner_program',
        affiliate_requested_plan_id: input.affiliateRequestedPlanId || null,
        affiliate_requested_feature_codes: input.affiliateRequestedFeatureCodes || [],
        affiliate_requested_branch_count: input.affiliateRequestedBranchCount || input.requestedBranchCount,
      }))},
      ${sql.json(toJsonValue(payload.plannedFranchises))},
      ${sql.json(toJsonValue(payload.apiPayload))},
      now()
    )
    on conflict (deal_id)
    do update set
      status = case
        when public.partner_platform_onboarding_requests.status in ('draft', 'submitted', 'rejected', 'failed')
          then 'submitted'::public.partner_platform_onboarding_request_status
        else public.partner_platform_onboarding_requests.status
      end,
      requested_plan_id = excluded.requested_plan_id,
      requested_feature_codes = excluded.requested_feature_codes,
      requested_branch_count = excluded.requested_branch_count,
      affiliate_requested_plan_id = excluded.affiliate_requested_plan_id,
      affiliate_requested_feature_codes = excluded.affiliate_requested_feature_codes,
      affiliate_requested_branch_count = excluded.affiliate_requested_branch_count,
      affiliate_package_snapshot = excluded.affiliate_package_snapshot,
      restaurant_name = excluded.restaurant_name,
      legal_business_name = excluded.legal_business_name,
      owner_first_name = excluded.owner_first_name,
      owner_last_name = excluded.owner_last_name,
      owner_email = excluded.owner_email,
      owner_phone = excluded.owner_phone,
      city = excluded.city,
      locality = excluded.locality,
      branch_address = excluded.branch_address,
      state = excluded.state,
      country = excluded.country,
      postal_code = excluded.postal_code,
      timezone = excluded.timezone,
      currency_code = excluded.currency_code,
      currency_symbol = excluded.currency_symbol,
      restaurant_type = excluded.restaurant_type,
      gst_registration_type = excluded.gst_registration_type,
      affiliate_sales_context = excluded.affiliate_sales_context,
      planned_franchises = excluded.planned_franchises,
      request_payload = excluded.request_payload,
      updated_at = now()
    where public.partner_platform_onboarding_requests.status in ('draft', 'submitted', 'rejected', 'failed')
    returning *
  `;

  const request = rows[0] as any;
  if (!request) throw new Error('Failed to create platform onboarding request.');

  await sql`
    update public.partner_deals
    set
      onboarding_request_id = ${request.id},
      subscription_plan_id = ${plan.id},
      products_sold = ${approvedFeatureCodes},
      platform_metadata = platform_metadata || ${sql.json(toJsonValue({ onboarding_request_status: request.status }))},
      updated_at = now()
    where id = ${input.dealId}
  `;

  return request;
}

export async function createOnboardingRequestForDeal(input: {
  dealId: string;
  requestedPlanId: string;
  requestedFeatureCodes: string[];
  requestedBranchCount?: number;
  sql?: SqlExecutor;
}) {
  const sql = input.sql ?? getDatabase();
  const rows = await sql`
    select
      d.id as deal_id,
      d.partner_id,
      d.lead_id,
      l.restaurant_name,
      l.legal_business_name,
      l.owner_name,
      l.email,
      l.phone,
      l.city,
      l.locality,
      l.branch_address,
      l.state,
      l.country,
      l.postal_code,
      l.timezone,
      l.gst_registration_type,
      l.restaurant_type,
      l.requested_plan_id as affiliate_requested_plan_id,
      l.requested_feature_codes as affiliate_requested_feature_codes,
      l.requested_branch_count as affiliate_requested_branch_count,
      l.onboarding_intent as affiliate_package_snapshot,
      d.requested_plan_id as deal_requested_plan_id,
      d.requested_feature_codes as deal_requested_feature_codes,
      d.requested_branch_count as deal_requested_branch_count
    from public.partner_deals d
    join public.partner_leads l on l.id = d.lead_id
    where d.id = ${input.dealId}
    limit 1
  `;

  const row = rows[0] as any;
  if (!row) throw new Error('Deal not found.');
  if (!row.email) {
    throw new Error('A restaurant owner email is required before creating a platform onboarding request.');
  }

  return createOrUpdateOnboardingRequest(
    {
      dealId: row.deal_id,
      leadId: row.lead_id,
      partnerId: row.partner_id,
      requestedPlanId: input.requestedPlanId,
      requestedFeatureCodes: input.requestedFeatureCodes,
      requestedBranchCount: input.requestedBranchCount || 1,
      affiliateRequestedPlanId: row.affiliate_requested_plan_id || row.deal_requested_plan_id || null,
      affiliateRequestedFeatureCodes: row.affiliate_requested_feature_codes || row.deal_requested_feature_codes || [],
      affiliateRequestedBranchCount: row.affiliate_requested_branch_count || row.deal_requested_branch_count || input.requestedBranchCount || 1,
      affiliatePackageSnapshot: row.affiliate_package_snapshot || {},
      restaurantName: row.restaurant_name,
      legalBusinessName: row.legal_business_name,
      ownerName: row.owner_name,
      ownerEmail: row.email,
      ownerPhone: row.phone,
      city: row.city,
      locality: row.locality,
      branchAddress: row.branch_address,
      state: row.state,
      country: row.country,
      postalCode: row.postal_code,
      timezone: row.timezone,
      gstRegistrationType: row.gst_registration_type,
      restaurantType: row.restaurant_type,
      currencyCode: 'INR',
      currencySymbol: '₹',
    },
    sql
  );
}
