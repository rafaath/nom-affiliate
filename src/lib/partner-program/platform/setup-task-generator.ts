import { getDatabase, type SqlExecutor } from '@/lib/db/client';
import type { SetupTaskTemplate } from './types';

const BASE_TASKS: SetupTaskTemplate[] = [
  {
    key: 'business_profile',
    label: 'Franchise profile exists',
    sortOrder: 10,
    verificationRuleCode: 'franchise.exists',
    platformArea: 'rms_core',
    featureCode: null,
    isBlocking: true,
  },
  {
    key: 'branch_profile',
    label: 'Branch profile exists',
    sortOrder: 20,
    verificationRuleCode: 'branch.exists',
    platformArea: 'rms_core',
    featureCode: null,
    isBlocking: true,
  },
  {
    key: 'owner_access',
    label: 'Owner auth, staff, role, and branch access exist',
    sortOrder: 30,
    verificationRuleCode: 'owner_staff_auth.exists',
    platformArea: 'identity',
    featureCode: null,
    isBlocking: true,
  },
  {
    key: 'subscription_active',
    label: 'Subscription plan is active',
    sortOrder: 40,
    verificationRuleCode: 'subscription.active',
    platformArea: 'billing',
    featureCode: null,
    isBlocking: true,
  },
];

const FEATURE_TASKS: SetupTaskTemplate[] = [
  {
    key: 'menu_catalog',
    label: 'Menu catalog and branch prices are ready',
    sortOrder: 50,
    verificationRuleCode: 'menu.catalog.ready',
    platformArea: 'menu',
    featureCode: 'menu',
    isBlocking: true,
  },
  {
    key: 'qr_runtime',
    label: 'QR menu resolves for the branch',
    sortOrder: 60,
    verificationRuleCode: 'qr.profile.resolves',
    platformArea: 'qr_menu',
    featureCode: 'qr',
    isBlocking: true,
  },
  {
    key: 'pos_tables',
    label: 'POS tables are configured',
    sortOrder: 70,
    verificationRuleCode: 'pos.tables.ready',
    platformArea: 'pos',
    featureCode: 'tables',
    isBlocking: true,
  },
  {
    key: 'pos_registers',
    label: 'POS counters are configured',
    sortOrder: 80,
    verificationRuleCode: 'pos.registers.ready',
    platformArea: 'pos',
    featureCode: 'registers',
    isBlocking: true,
  },
  {
    key: 'payments_ready',
    label: 'Payment methods are configured',
    sortOrder: 90,
    verificationRuleCode: 'payments.methods.ready',
    platformArea: 'payments',
    featureCode: 'payments',
    isBlocking: true,
  },
  {
    key: 'inventory_foundation',
    label: 'Inventory foundation is configured',
    sortOrder: 100,
    verificationRuleCode: 'inventory.foundation.ready',
    platformArea: 'inventory',
    featureCode: 'inventory',
    isBlocking: true,
  },
];

const FINAL_TASKS: SetupTaskTemplate[] = [
  {
    key: 'go_live_validation',
    label: 'Go-live validation is complete',
    sortOrder: 900,
    verificationRuleCode: 'subscription.active',
    platformArea: 'billing',
    featureCode: null,
    isBlocking: true,
  },
];

const FEATURE_DEPENDENCIES: Record<string, string[]> = {
  qr: ['menu', 'qr'],
  tableOrders: ['tables', 'registers', 'payments'],
  activeOrders: ['tables', 'registers'],
  liveOrders: ['registers'],
  orders: ['payments'],
};

function expandFeatureCodes(featureCodes: readonly string[]) {
  const expanded = new Set(featureCodes);
  for (const code of featureCodes) {
    for (const dependency of FEATURE_DEPENDENCIES[code] ?? []) {
      expanded.add(dependency);
    }
  }
  return [...expanded];
}

export function buildSetupTaskTemplates(featureCodes: readonly string[]) {
  const expandedCodes = expandFeatureCodes(featureCodes);
  const selectedFeatureTasks = FEATURE_TASKS.filter((task) => {
    if (!task.featureCode) return true;
    if (expandedCodes.length === 0) return true;
    return expandedCodes.includes(task.featureCode);
  });

  return [...BASE_TASKS, ...selectedFeatureTasks, ...FINAL_TASKS].sort((left, right) => left.sortOrder - right.sortOrder);
}

async function getDealSetupContext(dealId: string, sql: SqlExecutor) {
  const rows = await sql`
    select
      d.id,
      d.partner_id,
      d.lead_id,
      d.franchise_id,
      d.branch_id,
      d.products_sold,
      coalesce(array_agg(distinct dfs.feature_code) filter (where dfs.feature_code is not null), '{}') as selected_feature_codes
    from public.partner_deals d
    left join public.partner_deal_feature_selections dfs on dfs.deal_id = d.id
    where d.id = ${dealId}
    group by d.id
    limit 1
  `;

  const deal = rows[0] as any;
  if (!deal) throw new Error('Deal not found.');

  return {
    id: deal.id,
    partnerId: deal.partner_id as string,
    leadId: deal.lead_id as string,
    franchiseId: (deal.franchise_id as string | null) ?? null,
    branchId: (deal.branch_id as string | null) ?? null,
    featureCodes: [
      ...new Set([
        ...((deal.selected_feature_codes ?? []) as string[]),
        ...((deal.products_sold ?? []) as string[]),
      ]),
    ],
  };
}

export async function upsertSetupChecklistForDeal(dealId: string, sql: SqlExecutor = getDatabase()) {
  const deal = await getDealSetupContext(dealId, sql);
  const templates = buildSetupTaskTemplates(deal.featureCodes);
  const checklistRows = await sql`
    insert into public.partner_setup_checklists (
      partner_id,
      lead_id,
      deal_id,
      franchise_id,
      branch_id,
      status,
      updated_at
    )
    values (
      ${deal.partnerId},
      ${deal.leadId},
      ${deal.id},
      ${deal.franchiseId},
      ${deal.branchId},
      'assigned',
      now()
    )
    on conflict (deal_id)
    do update set
      partner_id = excluded.partner_id,
      lead_id = excluded.lead_id,
      franchise_id = excluded.franchise_id,
      branch_id = excluded.branch_id,
      status = case
        when public.partner_setup_checklists.status = 'not_started' then 'assigned'::public.partner_setup_status
        else public.partner_setup_checklists.status
      end,
      updated_at = now()
    returning id
  `;
  const checklist = checklistRows[0] as { id: string } | undefined;
  if (!checklist) throw new Error('Failed to create setup checklist.');

  for (const task of templates) {
    await sql`
      insert into public.partner_setup_tasks (
        checklist_id,
        task_key,
        label,
        status,
        sort_order,
        verification_rule_code,
        platform_area,
        feature_code,
        is_blocking,
        updated_at
      )
      values (
        ${checklist.id},
        ${task.key},
        ${task.label},
        'not_started',
        ${task.sortOrder},
        ${task.verificationRuleCode},
        ${task.platformArea},
        ${task.featureCode},
        ${task.isBlocking},
        now()
      )
      on conflict (checklist_id, task_key)
      do update set
        label = excluded.label,
        sort_order = excluded.sort_order,
        verification_rule_code = excluded.verification_rule_code,
        platform_area = excluded.platform_area,
        feature_code = excluded.feature_code,
        is_blocking = excluded.is_blocking,
        updated_at = now()
    `;
  }

  return checklist.id;
}
