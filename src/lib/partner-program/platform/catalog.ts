import { assertPartnerSchemaReady, getDatabase, type SqlExecutor } from '@/lib/db/client';
import type { ProductInterest } from '@/lib/partner-program/types';
import type { PlatformCatalog, PlatformFeature, PlatformPlan } from './types';

export const PRODUCT_INTEREST_FEATURE_CODES: Record<ProductInterest, string[]> = {
  pos: ['activeOrders', 'liveOrders', 'tableOrders', 'tables', 'registers', 'payments', 'billHistory', 'orderHistory'],
  inventory: ['inventory', 'recipes', 'costs'],
  qr_menu: ['qr', 'menu'],
  qr_ordering: ['qr', 'tableOrders', 'activeOrders'],
  online_ordering: ['orders', 'liveOrders', 'activeOrders'],
  website: ['menu', 'qr'],
  loyalty: ['customers', 'points'],
  staff_order_management: ['staff', 'roles', 'tasks', 'activeOrders'],
  full_restaurant_setup: [
    'franchise',
    'branch',
    'menu',
    'tables',
    'registers',
    'payments',
    'staff',
    'roles',
    'inventory',
    'qr',
    'activeOrders',
    'tableOrders',
    'analytics',
  ],
  not_sure: [],
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizePlan(row: any): PlatformPlan {
  const features = (Array.isArray(row.features) ? row.features : []) as PlatformFeature[];

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    price_cents: Number(row.price_cents || 0),
    currency_code: row.currency_code,
    billing_period: row.billing_period,
    is_active: Boolean(row.is_active),
    features,
    feature_codes: unique(features.map((feature) => feature.code)),
  };
}

async function getPlanRows(sql: SqlExecutor, whereClause: 'all' | 'active' = 'active') {
  const activeOnly = whereClause === 'active';

  return sql`
    select
      p.*,
      coalesce(
        (
          select json_agg(
            json_build_object(
              'id', f.id,
              'code', f.code,
              'label', f.label,
              'description', f.description,
              'is_core', f.is_core,
              'is_active', f.is_active
            )
            order by f.label asc
          )
          from public.plan_features pf
          join public.features f on f.id = pf.feature_id
          where pf.plan_id = p.id
            and pf.is_enabled = true
            and f.is_active = true
        ),
        '[]'::json
      ) as features
    from public.subscription_plans p
    where (${activeOnly} = false or p.is_active = true)
    order by p.price_cents asc, p.name asc
  `;
}

export async function getPlatformCatalog(sql: SqlExecutor = getDatabase()): Promise<PlatformCatalog> {
  await assertPartnerSchemaReady();

  const [planRows, featureRows] = await Promise.all([
    getPlanRows(sql),
    sql`
      select id, code, label, description, is_core, is_active
      from public.features
      where is_active = true
      order by label asc
    `,
  ]);

  return {
    plans: [...planRows].map(normalizePlan),
    features: [...featureRows] as PlatformFeature[],
    productInterestFeatureCodes: PRODUCT_INTEREST_FEATURE_CODES,
  };
}

export async function getActivePlatformPlan(planId: string, sql: SqlExecutor = getDatabase()) {
  await assertPartnerSchemaReady();
  const rows = await sql`
    select
      p.*,
      coalesce(
        (
          select json_agg(
            json_build_object(
              'id', f.id,
              'code', f.code,
              'label', f.label,
              'description', f.description,
              'is_core', f.is_core,
              'is_active', f.is_active
            )
            order by f.label asc
          )
          from public.plan_features pf
          join public.features f on f.id = pf.feature_id
          where pf.plan_id = p.id
            and pf.is_enabled = true
            and f.is_active = true
        ),
        '[]'::json
      ) as features
    from public.subscription_plans p
    where p.id = ${planId}
      and p.is_active = true
    limit 1
  `;

  const plan = rows[0];
  if (!plan) throw new Error('Selected subscription plan is not active or does not exist.');
  return normalizePlan(plan);
}

export async function getDefaultPlatformPlan(sql: SqlExecutor = getDatabase()) {
  await assertPartnerSchemaReady();
  const configured = process.env.PARTNER_DEFAULT_SUBSCRIPTION_PLAN_ID || process.env.PARTNER_DEFAULT_SUBSCRIPTION_PLAN_CODE;

  if (configured) {
    const rows = await sql`
      select
        p.*,
        coalesce(
          (
            select json_agg(
              json_build_object(
                'id', f.id,
                'code', f.code,
                'label', f.label,
                'description', f.description,
                'is_core', f.is_core,
                'is_active', f.is_active
              )
              order by f.label asc
            )
            from public.plan_features pf
            join public.features f on f.id = pf.feature_id
            where pf.plan_id = p.id
              and pf.is_enabled = true
              and f.is_active = true
          ),
          '[]'::json
        ) as features
      from public.subscription_plans p
      where p.is_active = true
        and (p.id::text = ${configured} or lower(p.code) = lower(${configured}))
      limit 1
    `;
    const plan = rows[0];
    if (!plan) throw new Error('PARTNER_DEFAULT_SUBSCRIPTION_PLAN_ID/CODE does not match an active platform plan.');
    return normalizePlan(plan);
  }

  const rows = await sql`
    select ranked.*
    from (
      select
        p.*,
        count(f.id) as enabled_feature_count,
        coalesce(
          json_agg(
            json_build_object(
              'id', f.id,
              'code', f.code,
              'label', f.label,
              'description', f.description,
              'is_core', f.is_core,
              'is_active', f.is_active
            )
            order by f.label asc
          ) filter (where f.id is not null),
          '[]'::json
        ) as features
      from public.subscription_plans p
      left join public.plan_features pf on pf.plan_id = p.id and pf.is_enabled = true
      left join public.features f on f.id = pf.feature_id and f.is_active = true
      where p.is_active = true
      group by p.id
    ) ranked
    order by ranked.enabled_feature_count desc, ranked.price_cents desc, ranked.name asc
    limit 1
  `;

  const plan = rows[0];
  if (!plan) throw new Error('No active platform subscription plan exists.');
  return normalizePlan(plan);
}

export function featureCodesForProductInterests(interests: readonly ProductInterest[]) {
  return unique(interests.flatMap((interest) => PRODUCT_INTEREST_FEATURE_CODES[interest] ?? []));
}

export async function existingFeatureCodes(codes: readonly string[], sql: SqlExecutor = getDatabase()) {
  if (codes.length === 0) return [];
  const rows = await sql`
    select code
    from public.features
    where is_active = true
      and code = any(${codes}::text[])
    order by code asc
  `;

  return rows.map((row: any) => String(row.code));
}

export async function assertFeatureCodesExist(codes: readonly string[], sql: SqlExecutor = getDatabase()) {
  const uniqueCodes = unique([...codes]);
  const existing = await existingFeatureCodes(uniqueCodes, sql);
  const missing = uniqueCodes.filter((code) => !existing.includes(code));

  if (missing.length > 0) {
    throw new Error(`Unknown or inactive platform feature code(s): ${missing.join(', ')}`);
  }

  return existing;
}
