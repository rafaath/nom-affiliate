import {
  assertPartnerPlatformSchemaReady,
  assertPartnerSchemaReady,
  getDatabase,
  toPartnerDatabaseError,
  type SqlExecutor,
} from '@/lib/db/client';
import { getActivePlatformPlan, getDefaultPlatformPlan } from './platform/catalog';
import { assertCommissionCanBeApproved, refreshCommissionEligibility } from './platform/commission-eligibility';
import { createOnboardingRequestForDeal, syncDealFeatureSelections } from './platform/onboarding-requests';
import { reconcileAndPersistLead } from './platform/reconciliation';
import { upsertSetupChecklistForDeal } from './platform/setup-task-generator';
import { verifySetupChecklist } from './platform/setup-verification';
import type { PlatformLinkKind } from './platform/types';

export async function isPartnerAdmin(authUserId: string, email?: string | null) {
  try {
    await assertPartnerSchemaReady();
    const sql = getDatabase();
    const rows = await sql`
      select auth_user_id
      from public.partner_admins
      where auth_user_id = ${authUserId}
        and is_active = true
      limit 1
    `;

    if (rows.length > 0) return true;
  } catch (error) {
    throw toPartnerDatabaseError(error);
  }

  const bootstrapEmails = (process.env.PARTNER_ADMIN_BOOTSTRAP_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email && bootstrapEmails.includes(email.toLowerCase()));
}

async function resolvePlan(planId: string | null | undefined, sql: SqlExecutor) {
  return planId ? getActivePlatformPlan(planId, sql) : getDefaultPlatformPlan(sql);
}

async function upsertPlatformAttributionForDeal(dealId: string, sql: SqlExecutor) {
  const rows = await sql`
    select
      d.id,
      d.partner_id,
      d.lead_id,
      d.franchise_id,
      d.branch_id,
      d.sales_mode,
      d.onboarding_request_id
    from public.partner_deals d
    where d.id = ${dealId}
    limit 1
  `;
  const deal = rows[0] as any;
  if (!deal?.franchise_id) return;

  await sql`
    insert into public.partner_platform_attributions (
      partner_id,
      lead_id,
      deal_id,
      source_request_id,
      franchise_id,
      branch_id,
      attribution_kind,
      ownership_ends_at,
      metadata
    )
    values (
      ${deal.partner_id},
      ${deal.lead_id},
      ${deal.id},
      ${deal.onboarding_request_id || null},
      ${deal.franchise_id},
      ${deal.branch_id || null},
      ${deal.sales_mode === 'simple_referral' ? 'referred' : 'sold'},
      now() + interval '90 days',
      ${JSON.stringify({ source: 'partner_admin_deal_update' })}::jsonb
    )
    on conflict do nothing
  `;
}

export async function reviewApplication(input: {
  actorAuthUserId: string;
  applicationId: string;
  partnerId: string;
  status: string;
  note: string;
}) {
  await assertPartnerSchemaReady();
  const sql = getDatabase();

  await sql.begin(async (tx) => {
    await tx`
      update public.partner_applications
      set
        status = ${input.status},
        review_note = ${input.note || null},
        reviewed_by = ${input.actorAuthUserId},
        reviewed_at = now(),
        updated_at = now()
      where id = ${input.applicationId}
    `;

    await tx`
      update public.partner_profiles
      set
        application_status = ${input.status},
        tier = case
          when ${input.status} = 'approved_sales_partner' then 'verified_sales_partner'::public.partner_tier
          when ${input.status} = 'approved_setup_pending_training' then 'verified_sales_partner'::public.partner_tier
          when ${input.status} = 'approved_full_service' then 'full_service_partner'::public.partner_tier
          else tier
        end,
        updated_at = now()
      where id = ${input.partnerId}
    `;

    await tx`
      insert into public.partner_audit_events (actor_auth_user_id, entity_type, entity_id, action, metadata)
      values (
        ${input.actorAuthUserId},
        'partner_application',
        ${input.applicationId},
        'review_application',
        ${tx.json({ status: input.status, note: input.note })}
      )
    `;
  });
}

export async function reviewLead(input: {
  actorAuthUserId: string;
  leadId: string;
  partnerId: string;
  status: string;
  note: string;
  platformLinkKind?: PlatformLinkKind;
  existingFranchiseId?: string | null;
  existingBranchId?: string | null;
  requestedPlanId?: string | null;
  requestedFeatureCodes?: string[];
  requestedBranchCount?: number;
}) {
  await assertPartnerPlatformSchemaReady();
  const sql = getDatabase();

  await sql.begin(async (tx) => {
    const previousRows = await tx`
      select *
      from public.partner_leads
      where id = ${input.leadId}
      limit 1
    `;
    const previousLead = previousRows[0] as any;
    if (!previousLead) throw new Error('Lead not found.');
    const reconciliation = await reconcileAndPersistLead(input.leadId, tx);
    const platformLinkKind = input.platformLinkKind || reconciliation.matchKind;
    const existingFranchiseId = input.existingFranchiseId || reconciliation.existingFranchiseId;
    const existingBranchId = input.existingBranchId || reconciliation.existingBranchId;

    await tx`
      update public.partner_leads
      set
        status = ${input.status},
        rejection_reason = case
          when ${input.status} in ('rejected', 'duplicate', 'already_in_pipeline') then ${input.note || null}
          else null
        end,
        reviewed_by = ${input.actorAuthUserId},
        reviewed_at = now(),
        accepted_at = case when ${input.status} = 'accepted' then now() else null end,
        ownership_expires_at = case when ${input.status} = 'accepted' then now() + interval '90 days' else null end,
        platform_review_decision = case
          when ${input.status} = 'accepted' and ${platformLinkKind} = 'new_restaurant' then 'new_restaurant'
          when ${input.status} = 'accepted' then 'link_existing'
          when ${input.status} in ('duplicate', 'already_in_pipeline', 'needs_more_information', 'rejected') then ${input.status}
          else platform_review_decision
        end,
        platform_reviewed_by = ${input.actorAuthUserId},
        platform_reviewed_at = now(),
        existing_franchise_id = ${existingFranchiseId},
        existing_branch_id = ${existingBranchId},
        updated_at = now()
      where id = ${input.leadId}
    `;

    await tx`
      insert into public.partner_lead_events (
        lead_id,
        actor_auth_user_id,
        event_type,
        from_status,
        to_status,
        note
      )
      values (
        ${input.leadId},
        ${input.actorAuthUserId},
        'admin_review',
        ${previousLead.status},
        ${input.status},
        ${input.note || null}
      )
    `;

    if (input.status === 'accepted') {
      if (platformLinkKind !== 'new_restaurant' && !existingFranchiseId) {
        throw new Error('Accepted existing-customer leads must be linked to a platform franchise.');
      }
      if (['existing_branch', 'existing_customer_addon'].includes(platformLinkKind) && !existingBranchId) {
        throw new Error('Branch-scoped accepted leads must be linked to a platform branch.');
      }

      const affiliateRequestedPlanId = previousLead.requested_plan_id || null;
      const affiliateRequestedFeatureCodes = Array.isArray(previousLead.requested_feature_codes)
        ? previousLead.requested_feature_codes.filter(Boolean)
        : [];
      const affiliateRequestedBranchCount = previousLead.requested_branch_count || previousLead.outlet_count || 1;
      const approvedPlanId = input.requestedPlanId || affiliateRequestedPlanId;
      const approvedBranchCount = input.requestedBranchCount || affiliateRequestedBranchCount;
      const plan = await resolvePlan(approvedPlanId, tx);
      const adminFeatureCodes = input.requestedFeatureCodes?.filter(Boolean) ?? [];
      const selectedFeatureCodes =
        adminFeatureCodes.length > 0
          ? adminFeatureCodes
          : affiliateRequestedFeatureCodes.length > 0
            ? affiliateRequestedFeatureCodes
            : plan.feature_codes;
      const approvalPackageSnapshot = {
        approved_by: input.actorAuthUserId,
        approved_at: new Date().toISOString(),
        plan_id: plan.id,
        plan_code: plan.code,
        plan_name: plan.name,
        branch_count: approvedBranchCount,
        feature_codes: selectedFeatureCodes,
        affiliate_requested_plan_id: affiliateRequestedPlanId,
        affiliate_requested_feature_codes: affiliateRequestedFeatureCodes,
        affiliate_requested_branch_count: affiliateRequestedBranchCount,
        admin_overrode_plan: Boolean(affiliateRequestedPlanId && affiliateRequestedPlanId !== plan.id),
        admin_overrode_features:
          adminFeatureCodes.length > 0 &&
          adminFeatureCodes.slice().sort().join('|') !== affiliateRequestedFeatureCodes.slice().sort().join('|'),
        admin_overrode_branch_count: approvedBranchCount !== affiliateRequestedBranchCount,
      };
      const dealRows = await tx`
        insert into public.partner_deals (
          lead_id,
          partner_id,
          stage,
          sales_mode,
          next_action,
          platform_link_kind,
          franchise_id,
          branch_id,
          requested_plan_id,
          requested_feature_codes,
          requested_branch_count,
          requested_package_summary,
          requested_monthly_revenue_cents,
          requested_commission_preview_cents,
          affiliate_package_snapshot,
          approval_package_snapshot,
          subscription_plan_id,
          products_sold,
          updated_at
        )
        values (
          ${input.leadId},
          ${input.partnerId},
          'lead_accepted',
          'simple_referral',
          ${platformLinkKind === 'new_restaurant'
            ? 'Internal dashboard must approve and execute platform onboarding.'
            : 'Confirm scope, plan, and partner attribution against existing platform records.'},
          ${platformLinkKind},
          ${existingFranchiseId},
          ${existingBranchId},
          ${affiliateRequestedPlanId},
          ${affiliateRequestedFeatureCodes},
          ${affiliateRequestedBranchCount},
          ${previousLead.requested_package_summary || null},
          ${previousLead.requested_monthly_revenue_cents || 0},
          ${previousLead.requested_commission_preview_cents || 0},
          ${JSON.stringify(previousLead.onboarding_intent || {})}::jsonb,
          ${JSON.stringify(approvalPackageSnapshot)}::jsonb,
          ${plan.id},
          ${selectedFeatureCodes},
          now()
        )
        on conflict (lead_id)
        do update set
          partner_id = excluded.partner_id,
          stage = excluded.stage,
          sales_mode = excluded.sales_mode,
          next_action = excluded.next_action,
          platform_link_kind = excluded.platform_link_kind,
          franchise_id = excluded.franchise_id,
          branch_id = excluded.branch_id,
          requested_plan_id = excluded.requested_plan_id,
          requested_feature_codes = excluded.requested_feature_codes,
          requested_branch_count = excluded.requested_branch_count,
          requested_package_summary = excluded.requested_package_summary,
          requested_monthly_revenue_cents = excluded.requested_monthly_revenue_cents,
          requested_commission_preview_cents = excluded.requested_commission_preview_cents,
          affiliate_package_snapshot = excluded.affiliate_package_snapshot,
          approval_package_snapshot = excluded.approval_package_snapshot,
          subscription_plan_id = excluded.subscription_plan_id,
          products_sold = excluded.products_sold,
          updated_at = now()
        returning *
      `;
      const deal = dealRows[0] as any;
      if (!deal) throw new Error('Failed to create accepted lead deal.');

      await syncDealFeatureSelections({
        dealId: deal.id,
        franchiseId: existingFranchiseId,
        branchId: existingBranchId,
        planId: plan.id,
        requestedFeatureCodes: selectedFeatureCodes,
        sql: tx,
      });

      if (platformLinkKind === 'new_restaurant') {
        await createOnboardingRequestForDeal({
          dealId: deal.id,
          requestedPlanId: plan.id,
          requestedFeatureCodes: selectedFeatureCodes,
          requestedBranchCount: approvedBranchCount,
          sql: tx,
        });
      }
    }
  });
}

export async function updateDealStage(input: {
  actorAuthUserId: string;
  dealId: string;
  stage: string;
  note: string;
  expectedCommissionCents: number;
  requestedPlanId?: string | null;
  requestedFeatureCodes?: string[];
  requestedBranchCount?: number;
}) {
  await assertPartnerPlatformSchemaReady();
  const sql = getDatabase();

  await sql.begin(async (tx) => {
    const previousRows = await tx`
      select d.*, req.status as onboarding_request_status
      from public.partner_deals d
      left join public.partner_platform_onboarding_requests req on req.id = d.onboarding_request_id
      where d.id = ${input.dealId}
      limit 1
    `;
    const previousDeal = previousRows[0] as any;
    if (!previousDeal) throw new Error('Deal not found.');
    const approvedBranchCount = input.requestedBranchCount || previousDeal.requested_branch_count || 1;
    const plan = input.requestedPlanId
      ? await getActivePlatformPlan(input.requestedPlanId, tx)
      : previousDeal.subscription_plan_id
        ? await getActivePlatformPlan(previousDeal.subscription_plan_id, tx)
        : await getDefaultPlatformPlan(tx);
    const requestedFeatureCodes = input.requestedFeatureCodes?.filter(Boolean) ?? [];
    const selectedFeatureCodes = requestedFeatureCodes.length > 0 ? requestedFeatureCodes : previousDeal.products_sold?.length ? previousDeal.products_sold : plan.feature_codes;

    await syncDealFeatureSelections({
      dealId: input.dealId,
      franchiseId: previousDeal.franchise_id,
      branchId: previousDeal.branch_id,
      planId: plan.id,
      requestedFeatureCodes: selectedFeatureCodes,
      sql: tx,
    });

    const dealRows = await tx`
      update public.partner_deals
      set
        stage = ${input.stage},
        next_action = ${input.note || null},
        expected_commission_cents = case
          when ${input.expectedCommissionCents} > 0 then ${input.expectedCommissionCents}
          else expected_commission_cents
        end,
        subscription_plan_id = ${plan.id},
        products_sold = ${selectedFeatureCodes},
        approval_package_snapshot = approval_package_snapshot || ${JSON.stringify({
          updated_by: input.actorAuthUserId,
          updated_at: new Date().toISOString(),
          plan_id: plan.id,
          plan_code: plan.code,
          plan_name: plan.name,
          branch_count: approvedBranchCount,
          feature_codes: selectedFeatureCodes,
        })}::jsonb,
        won_at = case when ${input.stage} = 'won' then now() else won_at end,
        lost_at = case when ${input.stage} = 'lost' then now() else lost_at end,
        live_at = case when ${input.stage} = 'live' then now() else live_at end,
        updated_at = now()
      where id = ${input.dealId}
      returning *
    `;
    const deal = dealRows[0] as any;
    if (!deal) throw new Error('Deal not found.');

    await tx`
      insert into public.partner_deal_events (deal_id, actor_auth_user_id, event_type, to_stage, note)
      values (${input.dealId}, ${input.actorAuthUserId}, 'stage_updated', ${input.stage}, ${input.note || null})
    `;

    if (deal.platform_link_kind === 'new_restaurant') {
      const onboardingEditable =
        !deal.onboarding_request_id ||
        ['draft', 'submitted', 'rejected', 'failed'].includes(String(previousDeal.onboarding_request_status || ''));
      if (onboardingEditable) {
        await createOnboardingRequestForDeal({
          dealId: deal.id,
          requestedPlanId: plan.id,
          requestedFeatureCodes: selectedFeatureCodes,
          requestedBranchCount: approvedBranchCount,
          sql: tx,
        });
      }
    }

    if (input.stage === 'won') {
      if (deal.platform_link_kind !== 'new_restaurant') {
        await upsertPlatformAttributionForDeal(deal.id, tx);
      }

      await tx`
        insert into public.partner_commissions (
          partner_id,
          lead_id,
          deal_id,
          commission_type,
          status,
          amount_cents,
          currency_code,
          condition_summary,
          eligible_at
        )
        select
          ${deal.partner_id},
          ${deal.lead_id},
          ${deal.id},
          'referral',
          'pending',
          ${input.expectedCommissionCents || deal.expected_commission_cents || 0},
          ${deal.currency_code || 'INR'},
          'Pending validation after restaurant becomes a paying Nom customer.',
          now() + interval '30 days'
        where not exists (
          select 1
          from public.partner_commissions existing
          where existing.deal_id = ${deal.id}
            and existing.commission_type = 'referral'
        )
      `;

      await upsertSetupChecklistForDeal(deal.id, tx);
    }

    if (input.stage === 'live') {
      await upsertPlatformAttributionForDeal(deal.id, tx);
      const commissionRows = await tx`
        select id
        from public.partner_commissions
        where deal_id = ${deal.id}
        limit 10
      `;
      for (const commission of commissionRows as any[]) {
        await refreshCommissionEligibility(commission.id, tx);
      }
    }
  });
}

export async function reviewSetup(input: {
  actorAuthUserId: string;
  checklistId: string;
  status: string;
  note: string;
}) {
  await assertPartnerPlatformSchemaReady();
  const sql = getDatabase();

  await sql.begin(async (tx) => {
    const verification = await verifySetupChecklist(input.checklistId, tx);
    if (input.status === 'approved' && !verification.passed) {
      throw new Error(
        `Setup cannot be approved until all blocking platform checks pass: ${verification.blockingFailures
          .map((item) => item.summary)
          .join(' ')}`
      );
    }

    await tx`
      update public.partner_setup_checklists
      set
        status = ${input.status},
        admin_review_note = ${input.note || null},
        admin_approved_by = case when ${input.status} = 'approved' then ${input.actorAuthUserId}::uuid else null end,
        admin_approved_at = case when ${input.status} = 'approved' then now() else null end,
        updated_at = now()
      where id = ${input.checklistId}
    `;
  });
}

export async function reviewCommission(input: {
  actorAuthUserId: string;
  commissionId: string;
  status: string;
  amountCents: number;
  note: string;
}) {
  await assertPartnerPlatformSchemaReady();
  const sql = getDatabase();

  await sql.begin(async (tx) => {
    if (input.status === 'approved') {
      await assertCommissionCanBeApproved(input.commissionId, tx);
    } else {
      await refreshCommissionEligibility(input.commissionId, tx);
    }

    await tx`
      update public.partner_commissions
      set
        status = ${input.status},
        review_note = ${input.note || null},
        reviewed_by = ${input.actorAuthUserId},
        amount_cents = case when ${input.amountCents} > 0 then ${input.amountCents} else amount_cents end,
        approved_at = case when ${input.status} = 'approved' then now() else approved_at end,
        rejection_reason = case when ${input.status} = 'rejected' then ${input.note || 'Rejected by admin'} else rejection_reason end,
        held_reason = case when ${input.status} = 'held' then ${input.note || 'Held by admin'} else held_reason end,
        updated_at = now()
      where id = ${input.commissionId}
    `;
  });
}

export async function createPayoutBatch(input: {
  actorAuthUserId: string;
  label: string;
}) {
  await assertPartnerSchemaReady();
  const sql = getDatabase();

  await sql.begin(async (tx) => {
    const commissions = await tx`
      select *
      from public.partner_commissions
      where status = 'approved'
      order by approved_at nulls last, created_at asc
      limit 500
    `;
    const total = commissions.reduce((sum, commission: any) => sum + Number(commission.amount_cents || 0), 0);

    const batchRows = await tx`
      insert into public.partner_payout_batches (label, status, currency_code, total_amount_cents, created_by)
      values (${input.label}, 'pending_approval', 'INR', ${total}, ${input.actorAuthUserId})
      returning *
    `;
    const batch = batchRows[0] as { id: string } | undefined;
    if (!batch) throw new Error('Failed to create payout batch.');

    for (const commission of commissions as any[]) {
      await tx`
        insert into public.partner_payout_items (
          payout_batch_id,
          partner_id,
          commission_id,
          amount_cents,
          currency_code,
          status
        )
        values (
          ${batch.id},
          ${commission.partner_id},
          ${commission.id},
          ${commission.amount_cents},
          ${commission.currency_code},
          'scheduled'
        )
      `;
    }

    if (commissions.length > 0) {
      await tx`
        update public.partner_commissions
        set status = 'scheduled_for_payout', updated_at = now()
        where id = any(${commissions.map((commission: any) => commission.id)}::uuid[])
      `;
    }
  });
}

export async function resolveDispute(input: {
  actorAuthUserId: string;
  disputeId: string;
  status: string;
  decision: string;
}) {
  await assertPartnerSchemaReady();
  const sql = getDatabase();

  await sql`
    update public.partner_disputes
    set
      status = ${input.status},
      admin_decision = ${input.decision},
      decided_by = ${input.actorAuthUserId},
      decided_at = now(),
      updated_at = now()
    where id = ${input.disputeId}
  `;
}
