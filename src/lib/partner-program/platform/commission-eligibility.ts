import { isAfter } from 'date-fns';
import { getDatabase, toJsonValue, type SqlExecutor } from '@/lib/db/client';
import type { CommissionEligibilityResult } from './types';

function eligible(summary: string, evidence: Record<string, unknown> = {}): CommissionEligibilityResult {
  return { status: 'eligible', eligible: true, summary, blockers: [], evidence };
}

function blocked(summary: string, blockers: string[], evidence: Record<string, unknown> = {}): CommissionEligibilityResult {
  return { status: 'blocked', eligible: false, summary, blockers, evidence };
}

async function loadCommissionContext(commissionId: string, sql: SqlExecutor) {
  const rows = await sql`
    select
      c.id,
      c.commission_type,
      c.status,
      c.eligible_at,
      c.amount_cents,
      l.status as lead_status,
      d.id as deal_id,
      d.stage as deal_stage,
      d.platform_link_kind,
      d.franchise_id,
      d.branch_id,
      d.subscription_plan_id,
      d.onboarding_request_id,
      req.status as onboarding_status,
      req.created_franchise_id,
      req.created_branch_id,
      sc.id as setup_checklist_id,
      sc.status as setup_status,
      sc.restaurant_confirmed,
      sc.verification_summary,
      exists (
        select 1
        from public.partner_disputes pd
        where pd.commission_id = c.id
          and pd.status in ('open', 'under_review', 'needs_partner_response')
      ) as has_active_dispute
    from public.partner_commissions c
    left join public.partner_leads l on l.id = c.lead_id
    left join public.partner_deals d on d.id = c.deal_id
    left join public.partner_platform_onboarding_requests req on req.id = d.onboarding_request_id
    left join public.partner_setup_checklists sc on sc.id = c.setup_checklist_id or sc.deal_id = d.id
    where c.id = ${commissionId}
    limit 1
  `;

  const context = rows[0] as any;
  if (!context) throw new Error('Commission not found.');
  return context;
}

async function hasActiveSubscription(context: any, franchiseId: string, sql: SqlExecutor) {
  const rows = await sql`
    select fs.id, fs.plan_id, sp.name as plan_name
    from public.franchise_subscriptions fs
    join public.subscription_plans sp on sp.id = fs.plan_id
    where fs.franchise_id = ${franchiseId}
      and fs.is_active = true
      and (fs.end_date is null or fs.end_date >= current_date)
      and (${context.subscription_plan_id}::uuid is null or fs.plan_id = ${context.subscription_plan_id}::uuid)
    order by fs.start_date desc
    limit 1
  `;

  return rows[0] as any | undefined;
}

async function countBlockingSetupFailures(setupChecklistId: string | null, sql: SqlExecutor) {
  if (!setupChecklistId) return 0;
  const rows = await sql`
    select count(*)::int as failures
    from public.partner_setup_tasks
    where checklist_id = ${setupChecklistId}
      and is_blocking = true
      and verification_status <> 'passed'
  `;

  return Number((rows[0] as any)?.failures || 0);
}

export async function evaluatePlatformCommissionEligibility(
  commissionId: string,
  sql: SqlExecutor = getDatabase(),
  now = new Date()
): Promise<CommissionEligibilityResult> {
  const context = await loadCommissionContext(commissionId, sql);
  const blockers: string[] = [];

  if (context.has_active_dispute) blockers.push('An active dispute exists for this commission.');
  if (context.lead_status !== 'accepted') blockers.push('Lead must be accepted.');
  if (!['won', 'setup_pending', 'setup_in_progress', 'live'].includes(String(context.deal_stage))) {
    blockers.push('Deal must be won, in setup, or live.');
  }
  if (context.eligible_at && isAfter(new Date(context.eligible_at), now)) {
    blockers.push('Payment validation window has not completed.');
  }

  const franchiseId = context.franchise_id || context.created_franchise_id || null;
  const branchId = context.branch_id || context.created_branch_id || null;

  if (context.platform_link_kind === 'new_restaurant') {
    if (context.onboarding_status !== 'provisioned') blockers.push('New restaurant onboarding request must be provisioned.');
    if (!context.created_franchise_id) blockers.push('Provisioned onboarding request must record the created franchise.');
  }

  if (['existing_franchise', 'existing_branch', 'existing_customer_addon'].includes(String(context.platform_link_kind)) && !franchiseId) {
    blockers.push('Existing-customer commission must be linked to a franchise.');
  }

  if (['existing_branch', 'existing_customer_addon'].includes(String(context.platform_link_kind)) && !branchId) {
    blockers.push('Branch-scoped commission must be linked to a branch.');
  }

  if (franchiseId) {
    const subscription = await hasActiveSubscription(context, franchiseId, sql);
    if (!subscription) blockers.push('Linked franchise does not have an active matching subscription.');
  }

  if (context.commission_type === 'setup') {
    if (context.setup_status !== 'approved') blockers.push('Setup commission requires an approved setup checklist.');
    if (!context.restaurant_confirmed) blockers.push('Setup commission requires restaurant confirmation.');

    const blockingSetupFailures = await countBlockingSetupFailures(context.setup_checklist_id, sql);
    if (blockingSetupFailures > 0) {
      blockers.push(`${blockingSetupFailures} blocking setup verification task(s) have not passed.`);
    }
  }

  const evidence = {
    commission_id: context.id,
    commission_type: context.commission_type,
    lead_status: context.lead_status,
    deal_stage: context.deal_stage,
    platform_link_kind: context.platform_link_kind,
    onboarding_status: context.onboarding_status,
    franchise_id: franchiseId,
    branch_id: branchId,
    setup_status: context.setup_status,
    restaurant_confirmed: context.restaurant_confirmed,
    eligible_at: context.eligible_at,
  };

  return blockers.length === 0
    ? eligible('Commission is eligible based on platform source-of-truth checks.', evidence)
    : blocked('Commission is blocked by platform source-of-truth checks.', blockers, evidence);
}

export async function refreshCommissionEligibility(commissionId: string, sql: SqlExecutor = getDatabase()) {
  const evaluation = await evaluatePlatformCommissionEligibility(commissionId, sql);

  await sql`
    update public.partner_commissions
    set
      platform_eligibility_status = ${evaluation.status},
      platform_eligibility_checked_at = now(),
      platform_eligibility_evidence = ${sql.json(toJsonValue(evaluation.evidence))},
      platform_eligibility_blockers = ${evaluation.blockers},
      held_reason = case
        when ${evaluation.eligible} = false then ${evaluation.blockers.join(' ')}
        else held_reason
      end,
      updated_at = now()
    where id = ${commissionId}
  `;

  return evaluation;
}

export async function assertCommissionCanBeApproved(commissionId: string, sql: SqlExecutor = getDatabase()) {
  const evaluation = await refreshCommissionEligibility(commissionId, sql);
  if (!evaluation.eligible) {
    throw new Error(`Commission cannot be approved: ${evaluation.blockers.join(' ')}`);
  }
  return evaluation;
}
