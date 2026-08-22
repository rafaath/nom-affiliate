begin;

-- Production already contains the original partner-program and platform-integration
-- tables, but those changes were applied outside its recorded migration history.
-- Replaying the original CREATE TABLE migrations would fail. This forward-only
-- reconciliation validates that baseline, adds the missing later changes, restores
-- required seed data, and converges the Data API boundary without deleting records.

do $partner_production_preflight$
declare
  relation_name text;
  missing_relations text[] := '{}';
begin
  foreach relation_name in array array[
    'auth.users',
    'public.auth_staff_mapping',
    'public.branch_feature_mappings',
    'public.branch_online_payment_configs',
    'public.branches',
    'public.features',
    'public.franchise_feature_overrides',
    'public.franchise_subscriptions',
    'public.franchises',
    'public.inventory_settings',
    'public.kot_counters',
    'public.menu',
    'public.menu_branch_mapping',
    'public.payment_methods',
    'public.plan_features',
    'public.qr_menu_branch_default_overrides',
    'public.qr_menu_franchise_defaults',
    'public.qr_menu_profiles',
    'public.qr_menu_schedules',
    'public.restaurant_tables',
    'public.staff',
    'public.staff_branch_assignments',
    'public.staff_franchise_roles',
    'public.subscription_plans',
    'public.warehouses',
    'public.partner_admins',
    'public.partner_profiles',
    'public.partner_applications',
    'public.partner_pending_applications',
    'public.partner_referral_codes',
    'public.partner_training_progress',
    'public.partner_resources',
    'public.partner_leads',
    'public.partner_lead_events',
    'public.partner_deals',
    'public.partner_deal_events',
    'public.partner_setup_checklists',
    'public.partner_setup_tasks',
    'public.partner_commission_rules',
    'public.partner_commissions',
    'public.partner_payout_methods',
    'public.partner_payout_batches',
    'public.partner_payout_items',
    'public.partner_disputes',
    'public.partner_notifications',
    'public.partner_audit_events',
    'public.partner_platform_onboarding_requests',
    'public.partner_deal_feature_selections',
    'public.partner_platform_attributions',
    'public.partner_setup_verification_rules'
  ]
  loop
    if to_regclass(relation_name) is null then
      missing_relations := array_append(missing_relations, relation_name);
    end if;
  end loop;

  if cardinality(missing_relations) > 0 then
    raise exception 'Partner production reconciliation requires the existing RMS and early partner baseline. Missing relations: %',
      array_to_string(missing_relations, ', ');
  end if;

  if to_regtype('public.partner_type') is null
     or to_regtype('public.partner_commission_type') is null
     or to_regtype('public.partner_setup_verification_rule_scope') is null then
    raise exception 'Partner production reconciliation requires the existing partner enum types.';
  end if;

  if to_regprocedure('public.partner_set_updated_at()') is null
     or to_regprocedure('public.partner_current_partner_id()') is null
     or to_regprocedure('public.partner_is_admin()') is null then
    raise exception 'Partner production reconciliation requires the existing partner helper functions.';
  end if;

  if to_regclass('public.partner_audit_events_id_seq') is null then
    raise exception 'Partner production reconciliation requires public.partner_audit_events_id_seq.';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'onboard_franchise_owner'
  ) then
    raise exception 'Partner production reconciliation requires public.onboard_franchise_owner.';
  end if;

  if not exists (select 1 from public.subscription_plans where is_active = true) then
    raise exception 'Partner production reconciliation requires at least one active subscription plan.';
  end if;

  if not exists (select 1 from public.features where is_active = true) then
    raise exception 'Partner production reconciliation requires an active feature catalog.';
  end if;
end
$partner_production_preflight$;

-- Allow restaurant type to be collected after the initial lead submission.
alter table public.partner_leads
  alter column restaurant_type drop not null;

-- Preserve application consent and profile-link audit data used by the current app.
alter table public.partner_pending_applications
  add column if not exists program_terms_version text,
  add column if not exists program_terms_accepted_at timestamptz,
  add column if not exists program_contact_consent_at timestamptz,
  add column if not exists linkedin_profile_url text,
  add column if not exists resume_drive_url text,
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_notice_acknowledged_at timestamptz;

alter table public.partner_applications
  add column if not exists program_terms_version text,
  add column if not exists program_terms_accepted_at timestamptz,
  add column if not exists program_contact_consent_at timestamptz,
  add column if not exists linkedin_profile_url text,
  add column if not exists resume_drive_url text,
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_notice_acknowledged_at timestamptz;

alter table public.partner_pending_applications
  drop constraint if exists partner_pending_applications_terms_audit_all_or_none,
  add constraint partner_pending_applications_terms_audit_all_or_none check (
    (program_terms_version is null and program_terms_accepted_at is null and program_contact_consent_at is null)
    or
    (program_terms_version is not null and program_terms_accepted_at is not null and program_contact_consent_at is not null)
  ),
  drop constraint if exists partner_pending_applications_linkedin_profile_url_valid,
  add constraint partner_pending_applications_linkedin_profile_url_valid check (
    linkedin_profile_url is null
    or (
      length(linkedin_profile_url) <= 2048
      and linkedin_profile_url ~* '^https://([a-z0-9-]+\.)*linkedin\.com/'
    )
  ),
  drop constraint if exists partner_pending_applications_resume_drive_url_valid,
  add constraint partner_pending_applications_resume_drive_url_valid check (
    resume_drive_url is null
    or (
      length(resume_drive_url) <= 2048
      and resume_drive_url ~* '^https://(drive|docs)\.google\.com/'
    )
  ),
  drop constraint if exists partner_pending_applications_privacy_audit_all_or_none,
  add constraint partner_pending_applications_privacy_audit_all_or_none check (
    (privacy_notice_version is null and privacy_notice_acknowledged_at is null)
    or
    (privacy_notice_version is not null and privacy_notice_acknowledged_at is not null)
  );

alter table public.partner_applications
  drop constraint if exists partner_applications_terms_audit_all_or_none,
  add constraint partner_applications_terms_audit_all_or_none check (
    (program_terms_version is null and program_terms_accepted_at is null and program_contact_consent_at is null)
    or
    (program_terms_version is not null and program_terms_accepted_at is not null and program_contact_consent_at is not null)
  ),
  drop constraint if exists partner_applications_linkedin_profile_url_valid,
  add constraint partner_applications_linkedin_profile_url_valid check (
    linkedin_profile_url is null
    or (
      length(linkedin_profile_url) <= 2048
      and linkedin_profile_url ~* '^https://([a-z0-9-]+\.)*linkedin\.com/'
    )
  ),
  drop constraint if exists partner_applications_resume_drive_url_valid,
  add constraint partner_applications_resume_drive_url_valid check (
    resume_drive_url is null
    or (
      length(resume_drive_url) <= 2048
      and resume_drive_url ~* '^https://(drive|docs)\.google\.com/'
    )
  ),
  drop constraint if exists partner_applications_privacy_audit_all_or_none,
  add constraint partner_applications_privacy_audit_all_or_none check (
    (privacy_notice_version is null and privacy_notice_acknowledged_at is null)
    or
    (privacy_notice_version is not null and privacy_notice_acknowledged_at is not null)
  );

comment on column public.partner_pending_applications.program_terms_version is
  'Exact legal terms version accepted during application recovery. Version 2026-07-21-v1 was the former program terms; later versions are application-only terms.';
comment on column public.partner_applications.program_terms_version is
  'Exact legal terms version accepted during application. Version 2026-07-21-v1 was the former program terms; later versions are application-only terms.';
comment on column public.partner_pending_applications.linkedin_profile_url is
  'Optional LinkedIn profile supplied during partner application before email confirmation.';
comment on column public.partner_pending_applications.resume_drive_url is
  'Optional Google Drive or Google Docs resume link supplied before email confirmation.';
comment on column public.partner_applications.linkedin_profile_url is
  'Optional LinkedIn profile supplied with the reviewed partner application.';
comment on column public.partner_applications.resume_drive_url is
  'Optional Google Drive or Google Docs resume link supplied with the reviewed partner application.';
comment on column public.partner_pending_applications.privacy_notice_version is
  'Partner Program Privacy Notice version acknowledged before email confirmation; null denotes a legacy submission.';
comment on column public.partner_applications.privacy_notice_version is
  'Partner Program Privacy Notice version acknowledged during application; null denotes a legacy submission.';

-- Store an immutable snapshot of every accepted Referral Partner Agreement.
create table if not exists public.partner_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  accepted_email text not null,
  agreement_title text not null,
  agreement_version text not null,
  agreement_sha256 text not null,
  agreement_text text not null,
  source_path text not null default '/partner/agreement',
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint partner_agreement_acceptances_email_not_blank check (length(btrim(accepted_email)) > 0),
  constraint partner_agreement_acceptances_version_not_blank check (length(btrim(agreement_version)) > 0),
  constraint partner_agreement_acceptances_sha256_format check (agreement_sha256 ~ '^[0-9a-f]{64}$'),
  constraint partner_agreement_acceptances_snapshot_not_blank check (length(btrim(agreement_text)) > 0),
  constraint partner_agreement_acceptances_partner_version_unique unique (partner_id, agreement_version)
);

create index if not exists partner_agreement_acceptances_partner_idx
  on public.partner_agreement_acceptances (partner_id, accepted_at desc);

alter table public.partner_agreement_acceptances enable row level security;

create or replace function public.partner_reject_agreement_acceptance_mutation()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  raise exception 'Partner agreement acceptance records are append-only';
end;
$$;

drop trigger if exists partner_agreement_acceptances_append_only
  on public.partner_agreement_acceptances;
create trigger partner_agreement_acceptances_append_only
before update or delete on public.partner_agreement_acceptances
for each row execute function public.partner_reject_agreement_acceptance_mutation();

-- Repair legacy JSONB values that were accidentally stored as encoded strings.
create or replace function pg_temp.decode_partner_jsonb_string(value jsonb)
returns jsonb
language plpgsql
immutable
strict
as $$
declare
  decoded jsonb;
begin
  if jsonb_typeof(value) <> 'string' then
    return value;
  end if;

  begin
    decoded := (value #>> '{}')::jsonb;
  exception when others then
    return value;
  end;

  return decoded;
end;
$$;

update public.partner_leads
set
  requested_commission_preview = pg_temp.decode_partner_jsonb_string(requested_commission_preview),
  onboarding_intent = pg_temp.decode_partner_jsonb_string(onboarding_intent),
  platform_match_evidence = pg_temp.decode_partner_jsonb_string(platform_match_evidence)
where jsonb_typeof(requested_commission_preview) = 'string'
   or jsonb_typeof(onboarding_intent) = 'string'
   or jsonb_typeof(platform_match_evidence) = 'string';

update public.partner_lead_events
set metadata = pg_temp.decode_partner_jsonb_string(metadata)
where jsonb_typeof(metadata) = 'string';

update public.partner_deals
set
  affiliate_package_snapshot = pg_temp.decode_partner_jsonb_string(affiliate_package_snapshot),
  approval_package_snapshot = pg_temp.decode_partner_jsonb_string(approval_package_snapshot),
  platform_metadata = pg_temp.decode_partner_jsonb_string(platform_metadata)
where jsonb_typeof(affiliate_package_snapshot) = 'string'
   or jsonb_typeof(approval_package_snapshot) = 'string'
   or jsonb_typeof(platform_metadata) = 'string';

update public.partner_deal_feature_selections
set metadata = pg_temp.decode_partner_jsonb_string(metadata)
where jsonb_typeof(metadata) = 'string';

update public.partner_platform_onboarding_requests
set
  affiliate_package_snapshot = pg_temp.decode_partner_jsonb_string(affiliate_package_snapshot),
  affiliate_sales_context = pg_temp.decode_partner_jsonb_string(affiliate_sales_context),
  planned_franchises = pg_temp.decode_partner_jsonb_string(planned_franchises),
  request_payload = pg_temp.decode_partner_jsonb_string(request_payload)
where jsonb_typeof(affiliate_package_snapshot) = 'string'
   or jsonb_typeof(affiliate_sales_context) = 'string'
   or jsonb_typeof(planned_franchises) = 'string'
   or jsonb_typeof(request_payload) = 'string';

update public.partner_platform_attributions
set metadata = pg_temp.decode_partner_jsonb_string(metadata)
where jsonb_typeof(metadata) = 'string';

update public.partner_setup_tasks
set verification_evidence = pg_temp.decode_partner_jsonb_string(verification_evidence)
where jsonb_typeof(verification_evidence) = 'string';

update public.partner_setup_checklists
set verification_summary = pg_temp.decode_partner_jsonb_string(verification_summary)
where jsonb_typeof(verification_summary) = 'string';

update public.partner_commissions
set platform_eligibility_evidence = pg_temp.decode_partner_jsonb_string(platform_eligibility_evidence)
where jsonb_typeof(platform_eligibility_evidence) = 'string';

-- Restore the partner-owned seed data omitted from the untracked Production baseline.
insert into public.partner_commission_rules (
  code,
  partner_type,
  commission_type,
  currency_code,
  fixed_amount_cents,
  percent_bps,
  validation_days,
  conditions,
  is_active
)
values
  ('basic_affiliate_first_paid_month', 'affiliate', 'referral', 'INR', 200000, null, 30, '{"requires_accepted_lead": true, "requires_successful_payment": true}', true),
  ('sales_partner_closed_customer', 'sales_partner', 'sales', 'INR', 350000, null, 30, '{"requires_documented_involvement": true, "requires_successful_payment": true}', true),
  ('setup_partner_approved_onboarding', 'implementation_partner', 'setup', 'INR', 500000, null, 0, '{"requires_setup_checklist": true, "requires_restaurant_confirmation": true, "requires_admin_approval": true}', true),
  ('full_service_partner_sale_and_setup', 'full_service_partner', 'sales', 'INR', 700000, null, 30, '{"requires_sale": true, "requires_setup": true, "requires_successful_payment": true}', true),
  ('agency_reseller_custom_placeholder', 'agency_reseller', 'referral', 'INR', null, 1000, 30, '{"custom_terms_required": true}', true)
on conflict (code) do update set
  partner_type = excluded.partner_type,
  commission_type = excluded.commission_type,
  currency_code = excluded.currency_code,
  fixed_amount_cents = excluded.fixed_amount_cents,
  percent_bps = excluded.percent_bps,
  validation_days = excluded.validation_days,
  conditions = excluded.conditions,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.partner_resources (
  title,
  category,
  description,
  content,
  is_active,
  sort_order
)
values
  ('What Nom Does', 'Product', 'Simple explanation partners can use with owners.', 'Nom helps restaurants manage POS, inventory, QR menus, ordering, staff workflows, customer data, online ordering, loyalty, and campaigns from one operating system.', true, 10),
  ('WhatsApp Pitch', 'Sales Script', 'Warm introduction message for restaurant owners.', 'Hi, I’m working with Nom, a restaurant management system for POS, inventory, QR menu, and ordering. I thought it could help your restaurant simplify operations and manage things better. Would you be open to a quick demo?', true, 20),
  ('Restaurant Visit Opening', 'Sales Script', 'In-person opener for local visits.', 'Hi, I work with Nom. We help restaurants manage billing, inventory, QR menus, and ordering from one system. I wanted to understand how you currently manage these and see if Nom can help.', true, 30),
  ('Objection: We already have a POS', 'Objection Handling', 'Use when the restaurant has an existing system.', 'That’s good. Many restaurants already have a POS. Nom may still help if you want better inventory, QR menu, ordering, customer data, or a more connected system.', true, 40),
  ('Setup Checklist', 'Implementation', 'What must be complete before go-live.', 'Confirm business profile, menu, pricing, taxes, POS, QR menu, QR ordering, inventory basics, staff access, owner training, cashier/waiter training, test order, test bill, and final go-live confirmation.', true, 50),
  ('Partner Rules', 'Trust', 'Non-negotiable behavior rules.', 'Do not lie about pricing, promise unavailable features, claim to be a Nom employee unless approved, collect money personally without authorization, spam restaurants, submit fake leads, or misuse Nom branding.', true, 60)
on conflict (title) do update set
  category = excluded.category,
  description = excluded.description,
  content = excluded.content,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.partner_setup_verification_rules (
  code,
  label,
  description,
  scope_kind,
  platform_area,
  feature_code,
  verification_strategy,
  sort_order,
  metadata
)
values
  (
    'franchise.exists',
    'Franchise exists',
    'The partner-attributed deal resolves to a real RMS franchise record.',
    'franchise',
    'rms_core',
    null,
    'select_franchise',
    10,
    '{"tables": ["franchises"]}'::jsonb
  ),
  (
    'branch.exists',
    'Branch exists',
    'The partner-attributed deal resolves to at least one real branch for the franchise.',
    'branch',
    'rms_core',
    null,
    'select_branch',
    20,
    '{"tables": ["branches"]}'::jsonb
  ),
  (
    'owner_staff_auth.exists',
    'Owner auth and staff are linked',
    'The restaurant owner has a Supabase Auth user, staff row, franchise role, and branch assignment.',
    'franchise',
    'identity',
    null,
    'select_owner_staff_auth_mapping',
    30,
    '{"tables": ["auth.users", "staff", "auth_staff_mapping", "staff_franchise_roles", "staff_branch_assignments"]}'::jsonb
  ),
  (
    'subscription.active',
    'Subscription is active',
    'The franchise has an active subscription matching the partner deal plan.',
    'franchise',
    'billing',
    null,
    'select_franchise_subscription',
    40,
    '{"tables": ["franchise_subscriptions", "subscription_plans"]}'::jsonb
  ),
  (
    'capability.franchise.enabled',
    'Franchise capability is enabled',
    'A selected platform feature is enabled by the active plan or franchise override.',
    'franchise',
    'authz',
    null,
    'select_effective_franchise_capability',
    50,
    '{"tables": ["features", "plan_features", "franchise_feature_overrides"]}'::jsonb
  ),
  (
    'capability.branch.enabled',
    'Branch capability is enabled',
    'A selected platform feature is enabled for the branch after plan and branch override resolution.',
    'branch',
    'authz',
    null,
    'select_effective_branch_capability',
    60,
    '{"tables": ["features", "plan_features", "branch_feature_mappings"]}'::jsonb
  ),
  (
    'menu.catalog.ready',
    'Menu catalog is ready',
    'The franchise has active menu items mapped to the target branch.',
    'branch',
    'menu',
    null,
    'select_active_menu_branch_mapping',
    70,
    '{"tables": ["menu", "menu_branch_mapping"]}'::jsonb
  ),
  (
    'qr.profile.resolves',
    'QR profile resolves',
    'QR runtime can resolve a published active profile via branch schedule, branch override, franchise schedule, or franchise default.',
    'branch',
    'qr',
    'qr_menu',
    'select_qr_runtime_profile_resolution',
    80,
    '{"tables": ["qr_menu_profiles", "qr_menu_schedules", "qr_menu_franchise_defaults", "qr_menu_branch_default_overrides"]}'::jsonb
  ),
  (
    'pos.tables.ready',
    'Tables are ready',
    'The branch has active restaurant tables configured for dine-in or QR/table workflows.',
    'branch',
    'tables',
    'registers',
    'select_restaurant_tables',
    90,
    '{"tables": ["restaurant_tables"]}'::jsonb
  ),
  (
    'pos.registers.ready',
    'POS counters are ready',
    'The branch has active KOT/POS counters needed for service execution.',
    'branch',
    'pos',
    'pos',
    'select_kot_counters',
    100,
    '{"tables": ["kot_counters"]}'::jsonb
  ),
  (
    'payments.methods.ready',
    'Payment methods are ready',
    'The franchise or branch has active non-deleted payment methods configured.',
    'branch',
    'payments',
    'payments',
    'select_payment_methods',
    110,
    '{"tables": ["payment_methods", "branch_online_payment_configs"]}'::jsonb
  ),
  (
    'inventory.foundation.ready',
    'Inventory foundation is ready',
    'Inventory settings and at least one active warehouse exist for the franchise.',
    'franchise',
    'inventory',
    'inventory',
    'select_inventory_foundation',
    120,
    '{"tables": ["inventory_settings", "warehouses"]}'::jsonb
  )
on conflict (code)
do update set
  label = excluded.label,
  description = excluded.description,
  scope_kind = excluded.scope_kind,
  platform_area = excluded.platform_area,
  feature_code = excluded.feature_code,
  verification_strategy = excluded.verification_strategy,
  sort_order = excluded.sort_order,
  metadata = excluded.metadata,
  is_active = true,
  updated_at = now();

update public.partner_setup_tasks
set
  verification_rule_code = case task_key
    when 'business_profile' then 'franchise.exists'
    when 'menu_setup' then 'menu.catalog.ready'
    when 'pos_setup' then 'pos.tables.ready'
    when 'qr_menu_setup' then 'qr.profile.resolves'
    when 'qr_ordering_setup' then 'capability.branch.enabled'
    when 'inventory_setup' then 'inventory.foundation.ready'
    when 'staff_setup' then 'owner_staff_auth.exists'
    when 'training' then 'owner_staff_auth.exists'
    when 'go_live_testing' then 'subscription.active'
    when 'final_go_live' then 'subscription.active'
    else verification_rule_code
  end,
  platform_area = case task_key
    when 'business_profile' then 'rms_core'
    when 'menu_setup' then 'menu'
    when 'pos_setup' then 'pos'
    when 'qr_menu_setup' then 'qr_menu'
    when 'qr_ordering_setup' then 'authz'
    when 'inventory_setup' then 'inventory'
    when 'staff_setup' then 'identity'
    when 'training' then 'identity'
    when 'go_live_testing' then 'billing'
    when 'final_go_live' then 'billing'
    else platform_area
  end,
  feature_code = case task_key
    when 'pos_setup' then 'tables'
    when 'qr_menu_setup' then 'qr'
    when 'qr_ordering_setup' then 'tableOrders'
    when 'inventory_setup' then 'inventory'
    else feature_code
  end
where verification_rule_code is null;

-- Partner mutations are performed only through the trusted server connection.
-- Data API roles retain read access where the existing RLS ownership/admin rules allow it.
revoke all privileges on table
  public.partner_admins,
  public.partner_profiles,
  public.partner_applications,
  public.partner_pending_applications,
  public.partner_referral_codes,
  public.partner_training_progress,
  public.partner_resources,
  public.partner_leads,
  public.partner_lead_events,
  public.partner_deals,
  public.partner_deal_events,
  public.partner_setup_checklists,
  public.partner_setup_tasks,
  public.partner_commission_rules,
  public.partner_commissions,
  public.partner_payout_methods,
  public.partner_payout_batches,
  public.partner_payout_items,
  public.partner_disputes,
  public.partner_notifications,
  public.partner_audit_events,
  public.partner_platform_onboarding_requests,
  public.partner_deal_feature_selections,
  public.partner_platform_attributions,
  public.partner_setup_verification_rules,
  public.partner_agreement_acceptances
from public, anon, authenticated;

grant select on table
  public.partner_admins,
  public.partner_profiles,
  public.partner_applications,
  public.partner_referral_codes,
  public.partner_training_progress,
  public.partner_resources,
  public.partner_leads,
  public.partner_lead_events,
  public.partner_deals,
  public.partner_deal_events,
  public.partner_setup_checklists,
  public.partner_setup_tasks,
  public.partner_commission_rules,
  public.partner_commissions,
  public.partner_payout_methods,
  public.partner_payout_batches,
  public.partner_payout_items,
  public.partner_disputes,
  public.partner_notifications,
  public.partner_audit_events,
  public.partner_platform_onboarding_requests,
  public.partner_deal_feature_selections,
  public.partner_platform_attributions,
  public.partner_setup_verification_rules,
  public.partner_agreement_acceptances
to authenticated;

-- Remove legacy mutation policies and make the desired read policies re-runnable.
drop policy if exists partner_admins_admin_all on public.partner_admins;
drop policy if exists partner_profiles_self_insert on public.partner_profiles;
drop policy if exists partner_profiles_self_or_admin_update on public.partner_profiles;
drop policy if exists partner_owned_applications_insert on public.partner_applications;
drop policy if exists partner_owned_applications_update on public.partner_applications;
drop policy if exists partner_resources_admin_all on public.partner_resources;
drop policy if exists partner_commission_rules_admin_all on public.partner_commission_rules;
drop policy if exists partner_referral_codes_owned on public.partner_referral_codes;
drop policy if exists partner_training_progress_owned on public.partner_training_progress;
drop policy if exists partner_leads_owned on public.partner_leads;
drop policy if exists partner_lead_events_insert_owned on public.partner_lead_events;
drop policy if exists partner_deals_owned on public.partner_deals;
drop policy if exists partner_deal_events_admin_insert on public.partner_deal_events;
drop policy if exists partner_setup_checklists_owned on public.partner_setup_checklists;
drop policy if exists partner_setup_tasks_owned on public.partner_setup_tasks;
drop policy if exists partner_commissions_owned on public.partner_commissions;
drop policy if exists partner_payout_methods_owned on public.partner_payout_methods;
drop policy if exists partner_payout_batches_admin_all on public.partner_payout_batches;
drop policy if exists partner_payout_items_admin_all on public.partner_payout_items;
drop policy if exists partner_disputes_owned on public.partner_disputes;
drop policy if exists partner_notifications_owned on public.partner_notifications;
drop policy if exists partner_audit_events_insert_self_or_admin on public.partner_audit_events;
drop policy if exists partner_platform_onboarding_requests_admin_all on public.partner_platform_onboarding_requests;
drop policy if exists partner_deal_feature_selections_admin_all on public.partner_deal_feature_selections;
drop policy if exists partner_platform_attributions_admin_all on public.partner_platform_attributions;
drop policy if exists partner_setup_verification_rules_admin_all on public.partner_setup_verification_rules;

drop policy if exists partner_referral_codes_owned_select on public.partner_referral_codes;
drop policy if exists partner_training_progress_owned_select on public.partner_training_progress;
drop policy if exists partner_leads_owned_select on public.partner_leads;
drop policy if exists partner_deals_owned_select on public.partner_deals;
drop policy if exists partner_setup_checklists_owned_select on public.partner_setup_checklists;
drop policy if exists partner_setup_tasks_owned_select on public.partner_setup_tasks;
drop policy if exists partner_commissions_owned_select on public.partner_commissions;
drop policy if exists partner_payout_methods_owned_select on public.partner_payout_methods;
drop policy if exists partner_payout_batches_admin_select on public.partner_payout_batches;
drop policy if exists partner_disputes_owned_select on public.partner_disputes;
drop policy if exists partner_notifications_owned_select on public.partner_notifications;
drop policy if exists partner_agreement_acceptances_owned_select on public.partner_agreement_acceptances;

create policy partner_referral_codes_owned_select
  on public.partner_referral_codes for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_training_progress_owned_select
  on public.partner_training_progress for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_leads_owned_select
  on public.partner_leads for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_deals_owned_select
  on public.partner_deals for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_setup_checklists_owned_select
  on public.partner_setup_checklists for select to authenticated
  using (
    partner_id = public.partner_current_partner_id()
    or assigned_partner_id = public.partner_current_partner_id()
    or public.partner_is_admin()
  );

create policy partner_setup_tasks_owned_select
  on public.partner_setup_tasks for select to authenticated
  using (
    public.partner_is_admin()
    or exists (
      select 1
      from public.partner_setup_checklists pc
      where pc.id = checklist_id
        and (
          pc.partner_id = public.partner_current_partner_id()
          or pc.assigned_partner_id = public.partner_current_partner_id()
        )
    )
  );

create policy partner_commissions_owned_select
  on public.partner_commissions for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_payout_methods_owned_select
  on public.partner_payout_methods for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_payout_batches_admin_select
  on public.partner_payout_batches for select to authenticated
  using (public.partner_is_admin());

create policy partner_disputes_owned_select
  on public.partner_disputes for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_notifications_owned_select
  on public.partner_notifications for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_agreement_acceptances_owned_select
  on public.partner_agreement_acceptances for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

grant all privileges on table
  public.partner_admins,
  public.partner_profiles,
  public.partner_applications,
  public.partner_pending_applications,
  public.partner_referral_codes,
  public.partner_training_progress,
  public.partner_resources,
  public.partner_leads,
  public.partner_lead_events,
  public.partner_deals,
  public.partner_deal_events,
  public.partner_setup_checklists,
  public.partner_setup_tasks,
  public.partner_commission_rules,
  public.partner_commissions,
  public.partner_payout_methods,
  public.partner_payout_batches,
  public.partner_payout_items,
  public.partner_disputes,
  public.partner_notifications,
  public.partner_audit_events,
  public.partner_platform_onboarding_requests,
  public.partner_deal_feature_selections,
  public.partner_platform_attributions,
  public.partner_setup_verification_rules,
  public.partner_agreement_acceptances
to postgres, service_role;

do $preserve_readonly$
begin
  if exists (select 1 from pg_roles where rolname = 'readonly_user') then
    execute 'grant select on table
      public.partner_admins, public.partner_profiles, public.partner_applications,
      public.partner_pending_applications, public.partner_referral_codes,
      public.partner_training_progress, public.partner_resources, public.partner_leads,
      public.partner_lead_events, public.partner_deals, public.partner_deal_events,
      public.partner_setup_checklists, public.partner_setup_tasks,
      public.partner_commission_rules, public.partner_commissions,
      public.partner_payout_methods, public.partner_payout_batches,
      public.partner_payout_items, public.partner_disputes,
      public.partner_notifications, public.partner_audit_events,
      public.partner_platform_onboarding_requests,
      public.partner_deal_feature_selections, public.partner_platform_attributions,
      public.partner_setup_verification_rules,
      public.partner_agreement_acceptances to readonly_user';
  end if;
end
$preserve_readonly$;

revoke all privileges on sequence public.partner_audit_events_id_seq from public, anon, authenticated;
grant all privileges on sequence public.partner_audit_events_id_seq to postgres, service_role;

revoke execute on function public.partner_set_updated_at() from public, anon, authenticated;
revoke execute on function public.partner_current_partner_id() from public, anon, authenticated;
revoke execute on function public.partner_is_admin() from public, anon, authenticated;
revoke execute on function public.partner_reject_agreement_acceptance_mutation() from public, anon, authenticated;
grant execute on function public.partner_current_partner_id() to authenticated;
grant execute on function public.partner_is_admin() to authenticated;
grant execute on function public.partner_set_updated_at() to postgres, service_role;
grant execute on function public.partner_current_partner_id() to postgres, service_role;
grant execute on function public.partner_is_admin() to postgres, service_role;
grant execute on function public.partner_reject_agreement_acceptance_mutation() to postgres, service_role;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all privileges on sequences from public, anon, authenticated;

-- The marketing waitlist is external to this app but shares the database.
do $waitlist_boundary$
begin
  if to_regclass('public.partner_waitlist_entries') is not null then
    execute 'revoke all privileges on table public.partner_waitlist_entries from public, anon, authenticated';
    execute 'grant all privileges on table public.partner_waitlist_entries to postgres, service_role';
    if exists (select 1 from pg_roles where rolname = 'readonly_user') then
      execute 'grant select on table public.partner_waitlist_entries to readonly_user';
    end if;
  end if;
end
$waitlist_boundary$;

do $partner_production_postflight$
declare
  missing_seed_count integer;
begin
  if (
    select is_nullable <> 'YES'
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partner_leads'
      and column_name = 'restaurant_type'
  ) then
    raise exception 'Partner reconciliation did not make partner_leads.restaurant_type nullable.';
  end if;

  if to_regclass('public.partner_agreement_acceptances') is null then
    raise exception 'Partner reconciliation did not create public.partner_agreement_acceptances.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partner_applications'
      and column_name in (
        'program_terms_version',
        'program_terms_accepted_at',
        'program_contact_consent_at',
        'linkedin_profile_url',
        'resume_drive_url',
        'privacy_notice_version',
        'privacy_notice_acknowledged_at'
      )
    group by table_schema, table_name
    having count(*) = 7
  ) then
    raise exception 'Partner reconciliation did not add every partner_applications audit column.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'partner_pending_applications'
      and column_name in (
        'program_terms_version',
        'program_terms_accepted_at',
        'program_contact_consent_at',
        'linkedin_profile_url',
        'resume_drive_url',
        'privacy_notice_version',
        'privacy_notice_acknowledged_at'
      )
    group by table_schema, table_name
    having count(*) = 7
  ) then
    raise exception 'Partner reconciliation did not add every partner_pending_applications audit column.';
  end if;

  with expected(code) as (
    values
      ('basic_affiliate_first_paid_month'),
      ('sales_partner_closed_customer'),
      ('setup_partner_approved_onboarding'),
      ('full_service_partner_sale_and_setup'),
      ('agency_reseller_custom_placeholder')
  )
  select count(*) into missing_seed_count
  from expected e
  left join public.partner_commission_rules r using (code)
  where r.code is null;

  if missing_seed_count <> 0 then
    raise exception 'Partner reconciliation is missing % commission-rule seed(s).', missing_seed_count;
  end if;

  with expected(code) as (
    values
      ('franchise.exists'),
      ('branch.exists'),
      ('owner_staff_auth.exists'),
      ('subscription.active'),
      ('capability.franchise.enabled'),
      ('capability.branch.enabled'),
      ('menu.catalog.ready'),
      ('qr.profile.resolves'),
      ('pos.tables.ready'),
      ('pos.registers.ready'),
      ('payments.methods.ready'),
      ('inventory.foundation.ready')
  )
  select count(*) into missing_seed_count
  from expected e
  left join public.partner_setup_verification_rules r using (code)
  where r.code is null;

  if missing_seed_count <> 0 then
    raise exception 'Partner reconciliation is missing % setup-verification seed(s).', missing_seed_count;
  end if;

  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname like 'partner_%'
      and (
        has_table_privilege('authenticated', c.oid, 'INSERT')
        or has_table_privilege('authenticated', c.oid, 'UPDATE')
        or has_table_privilege('authenticated', c.oid, 'DELETE')
      )
  ) then
    raise exception 'Partner reconciliation left Data API mutation privileges on a partner table.';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.partner_agreement_acceptances'::regclass
      and tgname = 'partner_agreement_acceptances_append_only'
      and not tgisinternal
  ) then
    raise exception 'Partner reconciliation did not install the append-only agreement trigger.';
  end if;
end
$partner_production_postflight$;

commit;
