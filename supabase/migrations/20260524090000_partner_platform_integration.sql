begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.partner_platform_link_kind as enum (
    'new_restaurant',
    'existing_franchise',
    'existing_branch',
    'existing_customer_addon'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_platform_onboarding_request_status as enum (
    'draft',
    'submitted',
    'approved',
    'provisioning',
    'provisioned',
    'rejected',
    'cancelled',
    'failed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_platform_attribution_kind as enum (
    'referred',
    'sold',
    'setup',
    'account_expansion'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_setup_verification_rule_scope as enum (
    'franchise',
    'branch'
  );
exception when duplicate_object then null;
end $$;

alter table public.partner_leads
  add column if not exists platform_match_kind public.partner_platform_link_kind,
  add column if not exists platform_match_confidence integer check (platform_match_confidence is null or (platform_match_confidence >= 0 and platform_match_confidence <= 100)),
  add column if not exists platform_match_evidence jsonb not null default '[]',
  add column if not exists platform_review_decision text check (
    platform_review_decision is null
    or platform_review_decision in ('new_restaurant', 'link_existing', 'duplicate', 'already_in_pipeline', 'needs_more_information', 'rejected')
  ),
  add column if not exists platform_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists platform_reviewed_at timestamptz;

alter table public.partner_deals
  add column if not exists platform_link_kind public.partner_platform_link_kind not null default 'new_restaurant',
  add column if not exists platform_metadata jsonb not null default '{}',
  add column if not exists onboarding_request_id uuid;

create index if not exists partner_leads_platform_match_idx
  on public.partner_leads (platform_match_kind, platform_match_confidence desc, created_at desc);

create index if not exists partner_deals_platform_link_idx
  on public.partner_deals (platform_link_kind, franchise_id, branch_id, updated_at desc);

create table public.partner_platform_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique references public.partner_deals(id) on delete cascade,
  lead_id uuid not null references public.partner_leads(id) on delete cascade,
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  status public.partner_platform_onboarding_request_status not null default 'submitted',
  requested_plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  requested_feature_codes text[] not null default '{}',
  requested_branch_count integer not null default 1 check (requested_branch_count > 0),
  restaurant_name text not null,
  owner_first_name text not null,
  owner_last_name text not null,
  owner_email text not null,
  owner_phone text,
  city text not null,
  locality text,
  state text,
  country text not null default 'India',
  postal_code text,
  timezone text not null default 'Asia/Kolkata',
  currency_code char(3) not null default 'INR',
  currency_symbol text not null default '₹',
  restaurant_type text,
  gst_registration_type text,
  planned_franchises jsonb not null default '[]',
  request_payload jsonb not null default '{}',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  execution_payload jsonb not null default '{}',
  execution_result jsonb not null default '{}',
  execution_error text,
  executed_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz,
  created_franchise_id uuid references public.franchises(id) on delete set null,
  created_branch_id uuid references public.branches(id) on delete set null,
  created_staff_id uuid references public.staff(id) on delete set null,
  created_auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_platform_onboarding_owner_names_not_blank check (
    length(btrim(owner_first_name)) > 0 and length(btrim(owner_last_name)) > 0
  ),
  constraint partner_platform_onboarding_owner_email_not_blank check (length(btrim(owner_email)) > 0)
);

create index partner_platform_onboarding_status_idx
  on public.partner_platform_onboarding_requests (status, created_at desc);

create index partner_platform_onboarding_partner_idx
  on public.partner_platform_onboarding_requests (partner_id, status, created_at desc);

create index partner_platform_onboarding_created_franchise_idx
  on public.partner_platform_onboarding_requests (created_franchise_id)
  where created_franchise_id is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_deals_onboarding_request_id_fkey'
      and conrelid = 'public.partner_deals'::regclass
  ) then
    alter table public.partner_deals
      add constraint partner_deals_onboarding_request_id_fkey
      foreign key (onboarding_request_id)
      references public.partner_platform_onboarding_requests(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_deals_platform_link_targets'
      and conrelid = 'public.partner_deals'::regclass
  ) then
    alter table public.partner_deals
      add constraint partner_deals_platform_link_targets check (
        (platform_link_kind = 'new_restaurant')
        or (platform_link_kind = 'existing_franchise' and franchise_id is not null)
        or (platform_link_kind in ('existing_branch', 'existing_customer_addon') and franchise_id is not null and branch_id is not null)
      );
  end if;
end $$;

create table public.partner_deal_feature_selections (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.partner_deals(id) on delete cascade,
  feature_id uuid not null references public.features(id) on delete restrict,
  feature_code text not null,
  scope_kind public.partner_setup_verification_rule_scope not null,
  franchise_id uuid references public.franchises(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  source text not null default 'plan' check (source in ('plan', 'addon', 'override', 'partner_requested')),
  is_required boolean not null default true,
  verification_rule_code text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint partner_deal_feature_scope_target check (
    (scope_kind = 'franchise' and franchise_id is not null and branch_id is null)
    or (scope_kind = 'branch' and franchise_id is not null and branch_id is not null)
  )
);

create unique index partner_deal_feature_selections_franchise_unique_idx
  on public.partner_deal_feature_selections (deal_id, feature_id, scope_kind)
  where scope_kind = 'franchise' and branch_id is null;

create unique index partner_deal_feature_selections_branch_unique_idx
  on public.partner_deal_feature_selections (deal_id, feature_id, scope_kind, branch_id)
  where scope_kind = 'branch' and branch_id is not null;

create index partner_deal_feature_selections_deal_idx
  on public.partner_deal_feature_selections (deal_id, source, created_at desc);

create index partner_deal_feature_selections_feature_code_idx
  on public.partner_deal_feature_selections (feature_code);

create table public.partner_platform_attributions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  lead_id uuid references public.partner_leads(id) on delete set null,
  deal_id uuid references public.partner_deals(id) on delete set null,
  source_request_id uuid references public.partner_platform_onboarding_requests(id) on delete set null,
  franchise_id uuid not null references public.franchises(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  attribution_kind public.partner_platform_attribution_kind not null default 'referred',
  ownership_started_at timestamptz not null default now(),
  ownership_ends_at timestamptz,
  is_active boolean not null default true,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index partner_platform_attributions_deal_kind_unique_idx
  on public.partner_platform_attributions (deal_id, attribution_kind)
  where deal_id is not null;

create index partner_platform_attributions_partner_idx
  on public.partner_platform_attributions (partner_id, is_active, created_at desc);

create index partner_platform_attributions_franchise_idx
  on public.partner_platform_attributions (franchise_id, branch_id, is_active);

create table public.partner_setup_verification_rules (
  code text primary key,
  label text not null,
  description text not null,
  scope_kind public.partner_setup_verification_rule_scope not null,
  platform_area text not null,
  feature_code text,
  verification_strategy text not null,
  is_required boolean not null default true,
  is_blocking boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_setup_checklists
  add column if not exists franchise_id uuid references public.franchises(id) on delete set null,
  add column if not exists branch_id uuid references public.branches(id) on delete set null,
  add column if not exists verification_summary jsonb not null default '{}',
  add column if not exists last_verified_at timestamptz;

alter table public.partner_setup_tasks
  add column if not exists verification_rule_code text references public.partner_setup_verification_rules(code) on delete set null,
  add column if not exists platform_area text,
  add column if not exists feature_code text,
  add column if not exists is_blocking boolean not null default true,
  add column if not exists verification_status text not null default 'not_checked' check (
    verification_status in ('not_checked', 'passed', 'failed', 'blocked', 'warning')
  ),
  add column if not exists verification_checked_at timestamptz,
  add column if not exists verification_summary text,
  add column if not exists verification_evidence jsonb not null default '{}';

alter table public.partner_commissions
  add column if not exists platform_eligibility_status text not null default 'not_checked' check (
    platform_eligibility_status in ('not_checked', 'eligible', 'ineligible', 'blocked', 'warning')
  ),
  add column if not exists platform_eligibility_checked_at timestamptz,
  add column if not exists platform_eligibility_evidence jsonb not null default '{}',
  add column if not exists platform_eligibility_blockers text[] not null default '{}';

create index if not exists partner_setup_checklists_platform_idx
  on public.partner_setup_checklists (franchise_id, branch_id, status, updated_at desc);

create index if not exists partner_setup_tasks_verification_idx
  on public.partner_setup_tasks (verification_status, verification_rule_code, updated_at desc);

create index if not exists partner_commissions_platform_eligibility_idx
  on public.partner_commissions (platform_eligibility_status, eligible_at nulls first, created_at desc);

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

alter table public.partner_platform_onboarding_requests enable row level security;
alter table public.partner_deal_feature_selections enable row level security;
alter table public.partner_platform_attributions enable row level security;
alter table public.partner_setup_verification_rules enable row level security;

create policy partner_platform_onboarding_requests_owned_select
  on public.partner_platform_onboarding_requests for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_platform_onboarding_requests_admin_all
  on public.partner_platform_onboarding_requests for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create policy partner_deal_feature_selections_owned_select
  on public.partner_deal_feature_selections for select to authenticated
  using (
    public.partner_is_admin()
    or exists (
      select 1
      from public.partner_deals pd
      where pd.id = deal_id
        and pd.partner_id = public.partner_current_partner_id()
    )
  );

create policy partner_deal_feature_selections_admin_all
  on public.partner_deal_feature_selections for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create policy partner_platform_attributions_owned_select
  on public.partner_platform_attributions for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_platform_attributions_admin_all
  on public.partner_platform_attributions for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create policy partner_setup_verification_rules_read_active
  on public.partner_setup_verification_rules for select to authenticated
  using (is_active = true or public.partner_is_admin());

create policy partner_setup_verification_rules_admin_all
  on public.partner_setup_verification_rules for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create trigger partner_platform_onboarding_requests_updated_at before update on public.partner_platform_onboarding_requests
  for each row execute function public.partner_set_updated_at();

create trigger partner_platform_attributions_updated_at before update on public.partner_platform_attributions
  for each row execute function public.partner_set_updated_at();

create trigger partner_setup_verification_rules_updated_at before update on public.partner_setup_verification_rules
  for each row execute function public.partner_set_updated_at();

grant select, insert, update on public.partner_platform_onboarding_requests to authenticated;
grant select, insert, update on public.partner_deal_feature_selections to authenticated;
grant select, insert, update on public.partner_platform_attributions to authenticated;
grant select on public.partner_setup_verification_rules to authenticated;

commit;
