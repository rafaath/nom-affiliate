import postgres from 'postgres';
import { SupabaseConfigError } from '@/lib/supabase/env';

let database: postgres.Sql | undefined;
let partnerSchemaReady = false;
let partnerPlatformSchemaReady = false;

const partnerMigrationMessage =
  'Partner database migrations are not fully applied. Apply the base partner migration, supabase/migrations/20260721100000_add_partner_program_terms_acceptance.sql, and supabase/migrations/20260721110000_add_partner_application_profile_links.sql before using partner signup, portal, or admin pages.';
const partnerPlatformMigrationMessage =
  'Partner platform integration migrations are not applied. Apply supabase/migrations/20260524090000_partner_platform_integration.sql and supabase/migrations/20260524100000_affiliate_requested_package_flow.sql after the base partner migration before using platform-native lead review, setup verification, onboarding requests, commission approval, or affiliate package selection.';

function readDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new SupabaseConfigError('Missing DATABASE_URL. Set DATABASE_URL in .env.local for server-side database access.');
  }

  return databaseUrl;
}

export function getDatabase() {
  if (!database) {
    const databaseUrl = readDatabaseUrl();
    const ssl = process.env.DATABASE_SSL === 'disable' || databaseUrl.includes('sslmode=disable') ? false : 'require';

    database = postgres(databaseUrl, {
      connect_timeout: 10,
      idle_timeout: 20,
      max: Number(process.env.DATABASE_POOL_MAX || 1),
      prepare: false,
      ssl,
    });
  }

  return database;
}

export function toJsonValue(value: unknown): postgres.JSONValue {
  return value as postgres.JSONValue;
}

export async function assertPartnerSchemaReady() {
  if (partnerSchemaReady) return;

  const sql = getDatabase();
  const rows = await sql`
    select
      to_regclass('public.partner_admins') as partner_admins,
      to_regclass('public.partner_profiles') as partner_profiles,
      to_regclass('public.partner_applications') as partner_applications,
      to_regclass('public.partner_pending_applications') as partner_pending_applications,
      to_regclass('public.partner_leads') as partner_leads,
      to_regclass('public.partner_deals') as partner_deals,
      to_regclass('public.partner_commissions') as partner_commissions,
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'partner_applications'
          and column_name in ('program_terms_version', 'program_terms_accepted_at', 'program_contact_consent_at')
        group by table_schema, table_name
        having count(*) = 3
      ) as partner_application_terms_columns,
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'partner_pending_applications'
          and column_name in ('program_terms_version', 'program_terms_accepted_at', 'program_contact_consent_at')
        group by table_schema, table_name
        having count(*) = 3
      ) as partner_pending_application_terms_columns,
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'partner_applications'
          and column_name in ('linkedin_profile_url', 'resume_drive_url')
        group by table_schema, table_name
        having count(*) = 2
      ) as partner_application_profile_link_columns,
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'partner_pending_applications'
          and column_name in ('linkedin_profile_url', 'resume_drive_url')
        group by table_schema, table_name
        having count(*) = 2
      ) as partner_pending_application_profile_link_columns
  `;
  const row = rows[0] as
    | {
        partner_admins: string | null;
        partner_profiles: string | null;
        partner_applications: string | null;
        partner_pending_applications: string | null;
        partner_leads: string | null;
        partner_deals: string | null;
        partner_commissions: string | null;
        partner_application_terms_columns: boolean;
        partner_pending_application_terms_columns: boolean;
        partner_application_profile_link_columns: boolean;
        partner_pending_application_profile_link_columns: boolean;
      }
    | undefined;

  const missingTables = Object.entries(row ?? {})
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (!row || missingTables.length > 0) {
    throw new SupabaseConfigError(`${partnerMigrationMessage} Missing tables: ${missingTables.join(', ') || 'unknown'}.`);
  }

  partnerSchemaReady = true;
}

export async function assertPartnerPlatformSchemaReady() {
  if (partnerPlatformSchemaReady) return;

  await assertPartnerSchemaReady();

  const sql = getDatabase();
  const rows = await sql`
    select
      to_regclass('public.partner_platform_onboarding_requests') as partner_platform_onboarding_requests,
      to_regclass('public.partner_deal_feature_selections') as partner_deal_feature_selections,
      to_regclass('public.partner_platform_attributions') as partner_platform_attributions,
      to_regclass('public.partner_setup_verification_rules') as partner_setup_verification_rules,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partner_leads' and column_name = 'platform_match_kind'
      ) as lead_platform_columns,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partner_deals' and column_name = 'platform_link_kind'
      ) as deal_platform_columns,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partner_setup_tasks' and column_name = 'verification_status'
      ) as setup_verification_columns,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partner_commissions' and column_name = 'platform_eligibility_status'
      ) as commission_eligibility_columns,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partner_leads' and column_name = 'requested_plan_id'
      ) as lead_requested_package_columns,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partner_deals' and column_name = 'affiliate_package_snapshot'
      ) as deal_requested_package_columns,
      exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partner_platform_onboarding_requests' and column_name = 'affiliate_package_snapshot'
      ) as onboarding_requested_package_columns
  `;
  const row = rows[0] as
    | {
        partner_platform_onboarding_requests: string | null;
        partner_deal_feature_selections: string | null;
        partner_platform_attributions: string | null;
        partner_setup_verification_rules: string | null;
        lead_platform_columns: boolean;
        deal_platform_columns: boolean;
        setup_verification_columns: boolean;
        commission_eligibility_columns: boolean;
        lead_requested_package_columns: boolean;
        deal_requested_package_columns: boolean;
        onboarding_requested_package_columns: boolean;
      }
    | undefined;

  const missing = Object.entries(row ?? {})
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (!row || missing.length > 0) {
    throw new SupabaseConfigError(`${partnerPlatformMigrationMessage} Missing objects: ${missing.join(', ') || 'unknown'}.`);
  }

  partnerPlatformSchemaReady = true;
}

export function toPartnerDatabaseError(error: unknown) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : null;

  if (code === '42P01' || code === '42704') {
    return new SupabaseConfigError(`${partnerMigrationMessage} ${partnerPlatformMigrationMessage}`);
  }

  if (code === '42703') {
    return new SupabaseConfigError(partnerPlatformMigrationMessage);
  }

  return error;
}

export type SqlExecutor = postgres.Sql | postgres.TransactionSql;
