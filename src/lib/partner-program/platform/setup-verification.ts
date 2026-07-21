import { getDatabase, toJsonValue, type SqlExecutor } from '@/lib/db/client';
import type { SetupVerificationResult, VerificationStatus } from './types';

type ChecklistContext = {
  id: string;
  deal_id: string;
  partner_id: string;
  lead_id: string;
  franchise_id: string | null;
  branch_id: string | null;
  subscription_plan_id: string | null;
  owner_email: string | null;
};

type SetupTaskRow = {
  id: string;
  task_key: string;
  verification_rule_code: string | null;
  feature_code: string | null;
  is_blocking: boolean;
};

function result(
  task: SetupTaskRow,
  status: VerificationStatus,
  summary: string,
  evidence: Record<string, unknown> = {}
): SetupVerificationResult {
  return {
    taskId: task.id,
    taskKey: task.task_key,
    ruleCode: task.verification_rule_code,
    status,
    summary,
    evidence,
    isBlocking: task.is_blocking,
  };
}

function missingTarget(task: SetupTaskRow, target: 'franchise' | 'branch') {
  return result(task, 'blocked', `Cannot verify until a platform ${target} is linked to the deal.`, {});
}

async function loadChecklistContext(checklistId: string, sql: SqlExecutor): Promise<ChecklistContext> {
  const rows = await sql`
    select
      sc.id,
      sc.deal_id,
      sc.partner_id,
      sc.lead_id,
      coalesce(sc.franchise_id, d.franchise_id, req.created_franchise_id) as franchise_id,
      coalesce(sc.branch_id, d.branch_id, req.created_branch_id) as branch_id,
      d.subscription_plan_id,
      coalesce(req.owner_email, l.email) as owner_email
    from public.partner_setup_checklists sc
    join public.partner_deals d on d.id = sc.deal_id
    join public.partner_leads l on l.id = sc.lead_id
    left join public.partner_platform_onboarding_requests req on req.id = d.onboarding_request_id
    where sc.id = ${checklistId}
    limit 1
  `;

  const context = rows[0] as ChecklistContext | undefined;
  if (!context) throw new Error('Setup checklist not found.');
  return context;
}

async function verifyFranchiseExists(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');

  const rows = await sql`
    select id, name, status, primary_user_id
    from public.franchises
    where id = ${context.franchise_id}
    limit 1
  `;
  const franchise = rows[0] as any;

  return franchise
    ? result(task, 'passed', `Franchise ${franchise.name} exists.`, {
        franchise_id: franchise.id,
        status: franchise.status,
        primary_user_id: franchise.primary_user_id,
      })
    : result(task, 'failed', 'Linked franchise does not exist.', { franchise_id: context.franchise_id });
}

async function verifyBranchExists(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');
  if (!context.branch_id) return missingTarget(task, 'branch');

  const rows = await sql`
    select id, name, status, city, number_of_tables
    from public.branches
    where id = ${context.branch_id}
      and franchise_id = ${context.franchise_id}
    limit 1
  `;
  const branch = rows[0] as any;

  return branch
    ? result(task, 'passed', `Branch ${branch.name} exists.`, {
        branch_id: branch.id,
        status: branch.status,
        city: branch.city,
        number_of_tables: branch.number_of_tables,
      })
    : result(task, 'failed', 'Linked branch does not exist under the linked franchise.', {
        franchise_id: context.franchise_id,
        branch_id: context.branch_id,
      });
}

async function verifyOwnerStaffAuth(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');

  const rows = await sql`
    select
      s.id as staff_id,
      s.email,
      s.status,
      asm.auth_user_id,
      exists (
        select 1
        from public.staff_franchise_roles sfr
        where sfr.staff_id = s.id
          and sfr.franchise_id = ${context.franchise_id}
      ) as has_franchise_role,
      exists (
        select 1
        from public.staff_branch_assignments sba
        join public.branches b on b.id = sba.branch_id
        where sba.staff_id = s.id
          and b.franchise_id = ${context.franchise_id}
          and (${context.branch_id}::uuid is null or sba.branch_id = ${context.branch_id}::uuid)
          and coalesce(sba.status, 'ACTIVE') = 'ACTIVE'
      ) as has_branch_assignment
    from public.staff s
    left join public.auth_staff_mapping asm on asm.staff_id = s.id
    left join public.franchises f on f.primary_user_id = s.id
    where s.franchise_id = ${context.franchise_id}
      and (
        f.primary_user_id = s.id
        or (${context.owner_email}::text is not null and lower(coalesce(s.email, '')) = lower(${context.owner_email}::text))
      )
    order by case when f.primary_user_id = s.id then 0 else 1 end
    limit 1
  `;
  const owner = rows[0] as any;

  if (!owner) return result(task, 'failed', 'No owner staff record exists for the franchise.', { franchise_id: context.franchise_id });
  if (!owner.auth_user_id) return result(task, 'failed', 'Owner staff exists but is not linked to a Supabase Auth user.', owner);
  if (!owner.has_franchise_role) return result(task, 'failed', 'Owner staff is missing a franchise role.', owner);
  if (!owner.has_branch_assignment) return result(task, 'failed', 'Owner staff is missing an active branch assignment.', owner);

  return result(task, 'passed', 'Owner auth, staff, franchise role, and branch assignment are linked.', owner);
}

async function verifySubscriptionActive(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');

  const rows = await sql`
    select fs.id, fs.plan_id, sp.name as plan_name, fs.start_date, fs.end_date, fs.is_active
    from public.franchise_subscriptions fs
    join public.subscription_plans sp on sp.id = fs.plan_id
    where fs.franchise_id = ${context.franchise_id}
      and fs.is_active = true
      and (fs.end_date is null or fs.end_date >= current_date)
      and (${context.subscription_plan_id}::uuid is null or fs.plan_id = ${context.subscription_plan_id}::uuid)
    order by fs.start_date desc
    limit 1
  `;
  const subscription = rows[0] as any;

  return subscription
    ? result(task, 'passed', `Active subscription found for ${subscription.plan_name}.`, subscription)
    : result(task, 'failed', 'No active matching subscription exists for the franchise.', {
        franchise_id: context.franchise_id,
        subscription_plan_id: context.subscription_plan_id,
      });
}

async function verifyFranchiseCapability(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');
  if (!task.feature_code) return result(task, 'warning', 'No feature code is attached to this capability verification.', {});

  const rows = await sql`
    select
      f.code,
      f.label,
      coalesce(ffo.is_enabled, bool_or(coalesce(pf.is_enabled, false)), false) as is_enabled
    from public.features f
    left join public.franchise_feature_overrides ffo
      on ffo.feature_id = f.id
      and ffo.franchise_id = ${context.franchise_id}
    left join public.franchise_subscriptions fs
      on fs.franchise_id = ${context.franchise_id}
      and fs.is_active = true
      and (fs.end_date is null or fs.end_date >= current_date)
    left join public.plan_features pf
      on pf.plan_id = fs.plan_id
      and pf.feature_id = f.id
    where f.code = ${task.feature_code}
      and f.is_active = true
    group by f.code, f.label, ffo.is_enabled
    limit 1
  `;
  const feature = rows[0] as any;

  if (!feature) return result(task, 'failed', `Feature ${task.feature_code} does not exist or is inactive.`, {});
  return feature.is_enabled
    ? result(task, 'passed', `${feature.label} is enabled at franchise level.`, feature)
    : result(task, 'failed', `${feature.label} is not enabled at franchise level.`, feature);
}

async function verifyBranchCapability(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');
  if (!context.branch_id) return missingTarget(task, 'branch');
  if (!task.feature_code) return result(task, 'warning', 'No feature code is attached to this branch capability verification.', {});

  const rows = await sql`
    select
      f.code,
      f.label,
      coalesce(bfm.is_enabled, ffo.is_enabled, bool_or(coalesce(pf.is_enabled, false)), false) as is_enabled
    from public.features f
    left join public.branch_feature_mappings bfm
      on bfm.feature_id = f.id
      and bfm.branch_id = ${context.branch_id}
      and bfm.franchise_id = ${context.franchise_id}
    left join public.franchise_feature_overrides ffo
      on ffo.feature_id = f.id
      and ffo.franchise_id = ${context.franchise_id}
    left join public.franchise_subscriptions fs
      on fs.franchise_id = ${context.franchise_id}
      and fs.is_active = true
      and (fs.end_date is null or fs.end_date >= current_date)
    left join public.plan_features pf
      on pf.plan_id = fs.plan_id
      and pf.feature_id = f.id
    where f.code = ${task.feature_code}
      and f.is_active = true
    group by f.code, f.label, bfm.is_enabled, ffo.is_enabled
    limit 1
  `;
  const feature = rows[0] as any;

  if (!feature) return result(task, 'failed', `Feature ${task.feature_code} does not exist or is inactive.`, {});
  return feature.is_enabled
    ? result(task, 'passed', `${feature.label} is enabled for the branch.`, feature)
    : result(task, 'failed', `${feature.label} is not enabled for the branch.`, feature);
}

async function verifyMenuCatalog(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');
  if (!context.branch_id) return missingTarget(task, 'branch');

  const rows = await sql`
    select count(*)::int as active_items
    from public.menu m
    join public.menu_branch_mapping mbm on mbm.menu_item_id = m.id
    where m.franchise_id = ${context.franchise_id}
      and mbm.branch_id = ${context.branch_id}
      and coalesce(m.is_active, true) = true
      and coalesce(m.is_deleted, false) = false
      and mbm.is_active = true
      and mbm.in_stock = true
      and mbm.is_listed = true
  `;
  const count = Number((rows[0] as any)?.active_items || 0);

  return count > 0
    ? result(task, 'passed', `${count} active menu item(s) are mapped to the branch.`, { active_items: count })
    : result(task, 'failed', 'No active listed menu items are mapped to the branch.', { active_items: count });
}

async function verifyQrProfileResolves(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');
  if (!context.branch_id) return missingTarget(task, 'branch');

  const rows = await sql`
    select source, profile_id, profile_name
    from (
      select 'branch_schedule' as source, p.id as profile_id, p.name as profile_name, 1 as priority
      from public.qr_menu_schedules s
      join public.qr_menu_profiles p on p.id = s.profile_id
      where s.franchise_id = ${context.franchise_id}
        and s.branch_id = ${context.branch_id}
        and s.is_active = true
        and p.status::text in ('published', 'active')
      union all
      select 'branch_default' as source, p.id as profile_id, p.name as profile_name, 2 as priority
      from public.qr_menu_branch_default_overrides o
      join public.qr_menu_profiles p on p.id = o.profile_id
      where o.franchise_id = ${context.franchise_id}
        and o.branch_id = ${context.branch_id}
        and p.status::text in ('published', 'active')
      union all
      select 'franchise_schedule' as source, p.id as profile_id, p.name as profile_name, 3 as priority
      from public.qr_menu_schedules s
      join public.qr_menu_profiles p on p.id = s.profile_id
      where s.franchise_id = ${context.franchise_id}
        and s.branch_id is null
        and s.is_active = true
        and p.status::text in ('published', 'active')
      union all
      select 'franchise_default' as source, p.id as profile_id, p.name as profile_name, 4 as priority
      from public.qr_menu_franchise_defaults d
      join public.qr_menu_profiles p on p.id = d.profile_id
      where d.franchise_id = ${context.franchise_id}
        and p.status::text in ('published', 'active')
    ) candidates
    order by priority asc
    limit 1
  `;
  const profile = rows[0] as any;

  return profile
    ? result(task, 'passed', `QR profile resolves through ${profile.source}.`, profile)
    : result(task, 'failed', 'No active published QR profile resolves for the branch.', {
        franchise_id: context.franchise_id,
        branch_id: context.branch_id,
      });
}

async function verifyPosTables(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.branch_id) return missingTarget(task, 'branch');

  const rows = await sql`
    select count(*)::int as table_count
    from public.restaurant_tables
    where branch_id = ${context.branch_id}
      and upper(status) not in ('DELETED', 'INACTIVE')
  `;
  const count = Number((rows[0] as any)?.table_count || 0);

  return count > 0
    ? result(task, 'passed', `${count} restaurant table(s) are configured.`, { table_count: count })
    : result(task, 'failed', 'No active restaurant tables are configured for the branch.', { table_count: count });
}

async function verifyPosRegisters(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');

  const rows = await sql`
    select count(*)::int as counter_count
    from public.kot_counters
    where franchise_id = ${context.franchise_id}
      and is_active = true
  `;
  const count = Number((rows[0] as any)?.counter_count || 0);

  return count > 0
    ? result(task, 'passed', `${count} active POS/KOT counter(s) are configured.`, { counter_count: count })
    : result(task, 'failed', 'No active POS/KOT counters are configured for the franchise.', { counter_count: count });
}

async function verifyPaymentMethods(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');

  const rows = await sql`
    select
      (select count(*)::int from public.payment_methods pm
       where pm.franchise_id = ${context.franchise_id}
         and coalesce(pm.is_active, true) = true
         and pm.is_deleted = false) as method_count,
      (select count(*)::int from public.branch_online_payment_configs bopc
       where (${context.branch_id}::uuid is not null and bopc.branch_id = ${context.branch_id}::uuid)
         and bopc.status = 'active') as online_config_count
  `;
  const counts = rows[0] as any;
  const methodCount = Number(counts?.method_count || 0);
  const onlineConfigCount = Number(counts?.online_config_count || 0);

  return methodCount > 0 || onlineConfigCount > 0
    ? result(task, 'passed', 'Payment configuration exists.', { method_count: methodCount, online_config_count: onlineConfigCount })
    : result(task, 'failed', 'No active payment methods or online payment configs exist.', {
        method_count: methodCount,
        online_config_count: onlineConfigCount,
      });
}

async function verifyInventoryFoundation(context: ChecklistContext, task: SetupTaskRow, sql: SqlExecutor) {
  if (!context.franchise_id) return missingTarget(task, 'franchise');

  const rows = await sql`
    select
      exists(select 1 from public.inventory_settings where franchise_id = ${context.franchise_id}) as has_settings,
      (select count(*)::int from public.warehouses where franchise_id = ${context.franchise_id} and upper(status) not in ('DELETED', 'INACTIVE')) as warehouse_count
  `;
  const state = rows[0] as any;
  const hasSettings = Boolean(state?.has_settings);
  const warehouseCount = Number(state?.warehouse_count || 0);

  if (!hasSettings) return result(task, 'failed', 'Inventory settings are missing.', { has_settings: false, warehouse_count: warehouseCount });
  if (warehouseCount === 0) return result(task, 'failed', 'No active warehouse exists for inventory operations.', { has_settings: true, warehouse_count: 0 });

  return result(task, 'passed', 'Inventory settings and active warehouse exist.', { has_settings: true, warehouse_count: warehouseCount });
}

export async function verifySetupTask(
  context: ChecklistContext,
  task: SetupTaskRow,
  sql: SqlExecutor = getDatabase()
): Promise<SetupVerificationResult> {
  switch (task.verification_rule_code) {
    case 'franchise.exists':
      return verifyFranchiseExists(context, task, sql);
    case 'branch.exists':
      return verifyBranchExists(context, task, sql);
    case 'owner_staff_auth.exists':
      return verifyOwnerStaffAuth(context, task, sql);
    case 'subscription.active':
      return verifySubscriptionActive(context, task, sql);
    case 'capability.franchise.enabled':
      return verifyFranchiseCapability(context, task, sql);
    case 'capability.branch.enabled':
      return verifyBranchCapability(context, task, sql);
    case 'menu.catalog.ready':
      return verifyMenuCatalog(context, task, sql);
    case 'qr.profile.resolves':
      return verifyQrProfileResolves(context, task, sql);
    case 'pos.tables.ready':
      return verifyPosTables(context, task, sql);
    case 'pos.registers.ready':
      return verifyPosRegisters(context, task, sql);
    case 'payments.methods.ready':
      return verifyPaymentMethods(context, task, sql);
    case 'inventory.foundation.ready':
      return verifyInventoryFoundation(context, task, sql);
    default:
      return result(task, 'warning', 'No platform verification rule is attached to this task.', {});
  }
}

export async function verifySetupChecklist(checklistId: string, sql: SqlExecutor = getDatabase()) {
  const context = await loadChecklistContext(checklistId, sql);
  const tasks = await sql`
    select id, task_key, verification_rule_code, feature_code, is_blocking
    from public.partner_setup_tasks
    where checklist_id = ${checklistId}
    order by sort_order asc, created_at asc
  `;

  const results: SetupVerificationResult[] = [];
  for (const task of tasks as unknown as SetupTaskRow[]) {
    const verified = await verifySetupTask(context, task, sql);
    results.push(verified);
    await sql`
      update public.partner_setup_tasks
      set
        verification_status = ${verified.status},
        verification_checked_at = now(),
        verification_summary = ${verified.summary},
        verification_evidence = ${sql.json(toJsonValue(verified.evidence))},
        status = case
          when ${verified.status} = 'passed' then 'completed'
          when ${verified.status} in ('failed', 'blocked') then 'blocked'
          else status
        end,
        completed_at = case when ${verified.status} = 'passed' then coalesce(completed_at, now()) else completed_at end,
        updated_at = now()
      where id = ${verified.taskId}
    `;
  }

  const blockingFailures = results.filter((item) => item.isBlocking && item.status !== 'passed');
  await sql`
    update public.partner_setup_checklists
    set
      franchise_id = ${context.franchise_id},
      branch_id = ${context.branch_id},
      verification_summary = ${sql.json(toJsonValue({
        checked_at: new Date().toISOString(),
        passed: results.filter((item) => item.status === 'passed').length,
        total: results.length,
        blocking_failures: blockingFailures.length,
      }))},
      last_verified_at = now(),
      status = case
        when ${blockingFailures.length} = 0 and status in ('assigned', 'in_progress', 'corrections_requested', 'failed')
          then 'submitted_for_review'::public.partner_setup_status
        when ${blockingFailures.length} > 0 and status in ('assigned', 'in_progress', 'submitted_for_review')
          then 'corrections_requested'::public.partner_setup_status
        else status
      end,
      updated_at = now()
    where id = ${checklistId}
  `;

  return {
    checklistId,
    results,
    passed: blockingFailures.length === 0,
    blockingFailures,
  };
}
