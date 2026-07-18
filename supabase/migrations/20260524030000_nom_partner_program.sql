begin;

create extension if not exists pgcrypto;

do $$
begin
  create type public.partner_type as enum (
    'affiliate',
    'sales_partner',
    'implementation_partner',
    'full_service_partner',
    'agency_reseller',
    'unsure'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_tier as enum (
    'affiliate',
    'verified_sales_partner',
    'certified_setup_partner',
    'full_service_partner',
    'agency_locality_partner'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_application_status as enum (
    'draft',
    'submitted',
    'under_review',
    'approved_affiliate',
    'approved_sales_partner',
    'approved_setup_pending_training',
    'approved_full_service',
    'rejected',
    'needs_more_information',
    'interview_requested'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_lead_status as enum (
    'submitted',
    'under_review',
    'accepted',
    'rejected',
    'duplicate',
    'already_in_pipeline',
    'needs_more_information'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_deal_stage as enum (
    'lead_submitted',
    'lead_accepted',
    'intro_sent',
    'contacted',
    'interested',
    'demo_scheduled',
    'demo_completed',
    'pricing_shared',
    'follow_up_needed',
    'won',
    'lost',
    'dormant',
    'setup_pending',
    'setup_in_progress',
    'live'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_setup_status as enum (
    'not_started',
    'assigned',
    'in_progress',
    'submitted_for_review',
    'corrections_requested',
    'approved',
    'failed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_commission_type as enum (
    'referral',
    'sales',
    'setup',
    'recurring',
    'addon',
    'bonus'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_commission_status as enum (
    'estimated',
    'pending',
    'under_review',
    'approved',
    'scheduled_for_payout',
    'paid',
    'held',
    'rejected',
    'reversed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_payout_status as enum (
    'details_missing',
    'pending_approval',
    'approved',
    'scheduled',
    'processing',
    'paid',
    'failed',
    'held'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.partner_dispute_status as enum (
    'open',
    'under_review',
    'needs_partner_response',
    'resolved_partner_favored',
    'resolved_nom_favored',
    'closed'
  );
exception when duplicate_object then null;
end $$;

create or replace function public.partner_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.partner_admins (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'program_manager', 'finance', 'ops')),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text not null,
  city text,
  locality_areas text[] not null default '{}',
  partner_type public.partner_type not null default 'affiliate',
  tier public.partner_tier not null default 'affiliate',
  application_status public.partner_application_status not null default 'submitted',
  certification_status text not null default 'not_started'
    check (certification_status in ('not_started', 'in_progress', 'submitted_for_review', 'certified', 'failed', 'revoked')),
  quality_score numeric(5,2) not null default 0 check (quality_score >= 0 and quality_score <= 100),
  referral_code text not null unique,
  is_suspended boolean not null default false,
  suspended_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_profiles_email_not_blank check (length(btrim(email)) > 0),
  constraint partner_profiles_referral_code_format check (referral_code ~ '^[A-Z0-9]{4,24}$')
);

create unique index partner_profiles_email_lower_idx on public.partner_profiles (lower(email));
create index partner_profiles_status_idx on public.partner_profiles (application_status, tier);
create index partner_profiles_city_idx on public.partner_profiles (city);

create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null unique references public.partner_profiles(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  city text not null,
  locality_areas text[] not null default '{}',
  requested_partner_type public.partner_type not null,
  restaurant_experience text not null,
  restaurant_network_size integer not null default 0 check (restaurant_network_size >= 0),
  can_visit_restaurants boolean not null default false,
  can_help_setup boolean not null default false,
  applicant_kind text not null check (applicant_kind in ('individual', 'company')),
  business_name text,
  background text not null,
  preferred_language text not null,
  heard_from text not null,
  status public.partner_application_status not null default 'submitted',
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_applications_status_idx on public.partner_applications (status, submitted_at desc);

create table public.partner_pending_applications (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  auth_user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  phone text not null,
  city text not null,
  locality_areas text[] not null default '{}',
  requested_partner_type public.partner_type not null,
  restaurant_experience text not null,
  restaurant_network_size integer not null default 0 check (restaurant_network_size >= 0),
  can_visit_restaurants boolean not null default false,
  can_help_setup boolean not null default false,
  applicant_kind text not null check (applicant_kind in ('individual', 'company')),
  business_name text,
  background text not null,
  preferred_language text not null,
  heard_from text not null,
  status text not null default 'awaiting_email_confirmation'
    check (status in ('awaiting_email_confirmation', 'claimed', 'expired')),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_pending_applications_email_not_blank check (length(btrim(email)) > 0)
);

create index partner_pending_applications_status_idx on public.partner_pending_applications (status, updated_at desc);

create table public.partner_referral_codes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  code text not null unique,
  status text not null default 'active' check (status in ('active', 'disabled')),
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_referral_codes_format check (code ~ '^[A-Z0-9]{4,24}$')
);

create table public.partner_training_progress (
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  module_key text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'failed')),
  score numeric(5,2) check (score is null or (score >= 0 and score <= 100)),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (partner_id, module_key)
);

create table public.partner_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  category text not null,
  description text,
  content text not null,
  url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  restaurant_name text not null,
  normalized_restaurant_name text generated always as (
    lower(regexp_replace(btrim(restaurant_name), '[^a-zA-Z0-9]+', ' ', 'g'))
  ) stored,
  owner_name text not null,
  phone text not null,
  normalized_phone text generated always as (
    right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)
  ) stored,
  email text,
  normalized_email text generated always as (lower(coalesce(email, ''))) stored,
  city text not null,
  locality text not null,
  restaurant_type text not null,
  outlet_count integer not null default 1 check (outlet_count > 0),
  current_system text,
  products_interested text[] not null default '{}',
  pain_points text[] not null default '{}',
  relationship_context text not null,
  consent_to_contact boolean not null default false,
  preferred_contact_time text,
  notes text,
  status public.partner_lead_status not null default 'submitted',
  rejection_reason text,
  duplicate_of_lead_id uuid references public.partner_leads(id) on delete set null,
  existing_franchise_id uuid references public.franchises(id) on delete set null,
  existing_branch_id uuid references public.branches(id) on delete set null,
  ownership_expires_at timestamptz,
  accepted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_leads_contact_permission check (consent_to_contact = true)
);

create index partner_leads_partner_status_idx on public.partner_leads (partner_id, status, created_at desc);
create index partner_leads_admin_queue_idx on public.partner_leads (status, created_at desc);
create index partner_leads_duplicate_phone_idx on public.partner_leads (normalized_phone) where normalized_phone <> '';
create index partner_leads_duplicate_email_idx on public.partner_leads (normalized_email) where normalized_email <> '';
create index partner_leads_duplicate_name_location_idx on public.partner_leads (normalized_restaurant_name, lower(city), lower(locality));

create table public.partner_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.partner_leads(id) on delete cascade,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_partner_id uuid references public.partner_profiles(id) on delete set null,
  event_type text not null,
  from_status public.partner_lead_status,
  to_status public.partner_lead_status,
  note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index partner_lead_events_lead_idx on public.partner_lead_events (lead_id, created_at desc);

create table public.partner_deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.partner_leads(id) on delete cascade,
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  assigned_admin_auth_user_id uuid references auth.users(id) on delete set null,
  franchise_id uuid references public.franchises(id) on delete set null,
  branch_id uuid references public.branches(id) on delete set null,
  subscription_plan_id uuid references public.subscription_plans(id) on delete set null,
  stage public.partner_deal_stage not null default 'lead_submitted',
  sales_mode text not null default 'simple_referral'
    check (sales_mode in ('simple_referral', 'warm_introduction', 'partner_led_pitch', 'full_partner_sale')),
  package_summary text,
  products_sold text[] not null default '{}',
  expected_commission_cents integer not null default 0 check (expected_commission_cents >= 0),
  currency_code char(3) not null default 'INR',
  payment_validation_ends_at timestamptz,
  won_at timestamptz,
  lost_at timestamptz,
  live_at timestamptz,
  lost_reason text,
  next_action text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_deals_partner_stage_idx on public.partner_deals (partner_id, stage, updated_at desc);
create index partner_deals_admin_stage_idx on public.partner_deals (stage, updated_at desc);
create index partner_deals_franchise_idx on public.partner_deals (franchise_id) where franchise_id is not null;

create table public.partner_deal_events (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.partner_deals(id) on delete cascade,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_stage public.partner_deal_stage,
  to_stage public.partner_deal_stage,
  note text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index partner_deal_events_deal_idx on public.partner_deal_events (deal_id, created_at desc);

create table public.partner_setup_checklists (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique references public.partner_deals(id) on delete cascade,
  lead_id uuid not null references public.partner_leads(id) on delete cascade,
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  assigned_partner_id uuid references public.partner_profiles(id) on delete set null,
  status public.partner_setup_status not null default 'not_started',
  restaurant_confirmed boolean not null default false,
  restaurant_feedback text,
  admin_review_note text,
  admin_approved_by uuid references auth.users(id) on delete set null,
  admin_approved_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_setup_partner_status_idx on public.partner_setup_checklists (partner_id, status, updated_at desc);
create index partner_setup_admin_status_idx on public.partner_setup_checklists (status, updated_at desc);

create table public.partner_setup_tasks (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.partner_setup_checklists(id) on delete cascade,
  task_key text not null,
  label text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'blocked', 'failed')),
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (checklist_id, task_key)
);

create table public.partner_commission_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  partner_type public.partner_type,
  commission_type public.partner_commission_type not null,
  currency_code char(3) not null default 'INR',
  fixed_amount_cents integer check (fixed_amount_cents is null or fixed_amount_cents >= 0),
  percent_bps integer check (percent_bps is null or (percent_bps >= 0 and percent_bps <= 10000)),
  validation_days integer not null default 30 check (validation_days >= 0 and validation_days <= 365),
  conditions jsonb not null default '{}',
  is_active boolean not null default true,
  active_from timestamptz not null default now(),
  active_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_commission_rule_value check (fixed_amount_cents is not null or percent_bps is not null)
);

create index partner_commission_rules_active_idx on public.partner_commission_rules (is_active, partner_type, commission_type);

create table public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  lead_id uuid references public.partner_leads(id) on delete set null,
  deal_id uuid references public.partner_deals(id) on delete set null,
  setup_checklist_id uuid references public.partner_setup_checklists(id) on delete set null,
  rule_id uuid references public.partner_commission_rules(id) on delete set null,
  commission_type public.partner_commission_type not null,
  status public.partner_commission_status not null default 'estimated',
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency_code char(3) not null default 'INR',
  condition_summary text not null,
  eligible_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_note text,
  rejection_reason text,
  held_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_commissions_partner_status_idx on public.partner_commissions (partner_id, status, created_at desc);
create index partner_commissions_admin_status_idx on public.partner_commissions (status, eligible_at nulls first, created_at desc);

create table public.partner_payout_methods (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  payout_type text not null check (payout_type in ('upi', 'bank_reference')),
  status public.partner_payout_status not null default 'pending_approval',
  payout_name text not null,
  upi_id text,
  bank_name text,
  bank_account_last4 text check (bank_account_last4 is null or bank_account_last4 ~ '^\d{4}$'),
  bank_account_reference text,
  tax_id text,
  gst_number text,
  verification_notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_payout_method_details check (
    (payout_type = 'upi' and upi_id is not null)
    or (payout_type = 'bank_reference' and bank_account_reference is not null)
  )
);

create index partner_payout_methods_partner_idx on public.partner_payout_methods (partner_id, status);

create table public.partner_payout_batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  status public.partner_payout_status not null default 'pending_approval',
  currency_code char(3) not null default 'INR',
  total_amount_cents integer not null default 0 check (total_amount_cents >= 0),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.partner_payout_items (
  id uuid primary key default gen_random_uuid(),
  payout_batch_id uuid not null references public.partner_payout_batches(id) on delete cascade,
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  commission_id uuid not null unique references public.partner_commissions(id) on delete cascade,
  payout_method_id uuid references public.partner_payout_methods(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  currency_code char(3) not null default 'INR',
  status public.partner_payout_status not null default 'scheduled',
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_payout_items_partner_status_idx on public.partner_payout_items (partner_id, status, created_at desc);

create table public.partner_disputes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  lead_id uuid references public.partner_leads(id) on delete set null,
  deal_id uuid references public.partner_deals(id) on delete set null,
  commission_id uuid references public.partner_commissions(id) on delete set null,
  dispute_type text not null check (dispute_type in ('duplicate_lead', 'missing_commission', 'rejected_lead_appeal', 'setup_disagreement', 'payout_delay', 'other')),
  status public.partner_dispute_status not null default 'open',
  partner_explanation text not null,
  supporting_notes text,
  admin_decision text,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_disputes_admin_status_idx on public.partner_disputes (status, created_at desc);
create index partner_disputes_partner_idx on public.partner_disputes (partner_id, status, created_at desc);

create table public.partner_notifications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partner_profiles(id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app', 'email', 'whatsapp')),
  audience text not null default 'partner' check (audience in ('partner', 'admin', 'restaurant')),
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index partner_notifications_partner_idx on public.partner_notifications (partner_id, read_at, created_at desc);

create table public.partner_audit_events (
  id bigserial primary key,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  actor_partner_id uuid references public.partner_profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index partner_audit_events_entity_idx on public.partner_audit_events (entity_type, entity_id, created_at desc);

create or replace function public.partner_current_partner_id()
returns uuid
language sql
stable
security definer
set search_path to ''
as $$
  select pp.id
  from public.partner_profiles pp
  where pp.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.partner_is_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1
    from public.partner_admins pa
    where pa.auth_user_id = auth.uid()
      and pa.is_active = true
  );
$$;

alter table public.partner_admins enable row level security;
alter table public.partner_profiles enable row level security;
alter table public.partner_applications enable row level security;
alter table public.partner_referral_codes enable row level security;
alter table public.partner_training_progress enable row level security;
alter table public.partner_resources enable row level security;
alter table public.partner_leads enable row level security;
alter table public.partner_lead_events enable row level security;
alter table public.partner_deals enable row level security;
alter table public.partner_deal_events enable row level security;
alter table public.partner_setup_checklists enable row level security;
alter table public.partner_setup_tasks enable row level security;
alter table public.partner_commission_rules enable row level security;
alter table public.partner_commissions enable row level security;
alter table public.partner_payout_methods enable row level security;
alter table public.partner_payout_batches enable row level security;
alter table public.partner_payout_items enable row level security;
alter table public.partner_disputes enable row level security;
alter table public.partner_notifications enable row level security;
alter table public.partner_audit_events enable row level security;

create policy partner_admins_self_or_admin_select
  on public.partner_admins for select to authenticated
  using (auth_user_id = auth.uid() or public.partner_is_admin());

create policy partner_admins_admin_all
  on public.partner_admins for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create policy partner_profiles_self_or_admin_select
  on public.partner_profiles for select to authenticated
  using (auth_user_id = auth.uid() or public.partner_is_admin());

create policy partner_profiles_self_insert
  on public.partner_profiles for insert to authenticated
  with check (auth_user_id = auth.uid() or public.partner_is_admin());

create policy partner_profiles_self_or_admin_update
  on public.partner_profiles for update to authenticated
  using (auth_user_id = auth.uid() or public.partner_is_admin())
  with check (auth_user_id = auth.uid() or public.partner_is_admin());

create policy partner_owned_applications_select
  on public.partner_applications for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_owned_applications_insert
  on public.partner_applications for insert to authenticated
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_owned_applications_update
  on public.partner_applications for update to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_resources_read_active
  on public.partner_resources for select to authenticated
  using (is_active = true or public.partner_is_admin());

create policy partner_resources_admin_all
  on public.partner_resources for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create policy partner_commission_rules_read_active
  on public.partner_commission_rules for select to authenticated
  using (is_active = true or public.partner_is_admin());

create policy partner_commission_rules_admin_all
  on public.partner_commission_rules for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create policy partner_referral_codes_owned
  on public.partner_referral_codes for all to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_training_progress_owned
  on public.partner_training_progress for all to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_leads_owned
  on public.partner_leads for all to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_lead_events_owned
  on public.partner_lead_events for select to authenticated
  using (
    public.partner_is_admin()
    or actor_partner_id = public.partner_current_partner_id()
    or exists (
      select 1 from public.partner_leads pl
      where pl.id = lead_id
        and pl.partner_id = public.partner_current_partner_id()
    )
  );

create policy partner_lead_events_insert_owned
  on public.partner_lead_events for insert to authenticated
  with check (
    public.partner_is_admin()
    or actor_partner_id = public.partner_current_partner_id()
  );

create policy partner_deals_owned
  on public.partner_deals for all to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_deal_events_owned
  on public.partner_deal_events for select to authenticated
  using (
    public.partner_is_admin()
    or exists (
      select 1 from public.partner_deals pd
      where pd.id = deal_id
        and pd.partner_id = public.partner_current_partner_id()
    )
  );

create policy partner_deal_events_admin_insert
  on public.partner_deal_events for insert to authenticated
  with check (public.partner_is_admin());

create policy partner_setup_checklists_owned
  on public.partner_setup_checklists for all to authenticated
  using (partner_id = public.partner_current_partner_id() or assigned_partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or assigned_partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_setup_tasks_owned
  on public.partner_setup_tasks for all to authenticated
  using (
    public.partner_is_admin()
    or exists (
      select 1 from public.partner_setup_checklists pc
      where pc.id = checklist_id
        and (pc.partner_id = public.partner_current_partner_id() or pc.assigned_partner_id = public.partner_current_partner_id())
    )
  )
  with check (
    public.partner_is_admin()
    or exists (
      select 1 from public.partner_setup_checklists pc
      where pc.id = checklist_id
        and (pc.partner_id = public.partner_current_partner_id() or pc.assigned_partner_id = public.partner_current_partner_id())
    )
  );

create policy partner_commissions_owned
  on public.partner_commissions for all to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_payout_methods_owned
  on public.partner_payout_methods for all to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_payout_batches_admin_all
  on public.partner_payout_batches for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create policy partner_payout_items_owned
  on public.partner_payout_items for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_payout_items_admin_all
  on public.partner_payout_items for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

create policy partner_disputes_owned
  on public.partner_disputes for all to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_notifications_owned
  on public.partner_notifications for all to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin())
  with check (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

create policy partner_audit_events_admin_select
  on public.partner_audit_events for select to authenticated
  using (public.partner_is_admin());

create policy partner_audit_events_insert_self_or_admin
  on public.partner_audit_events for insert to authenticated
  with check (actor_auth_user_id = auth.uid() or public.partner_is_admin());

create trigger partner_admins_updated_at before update on public.partner_admins
  for each row execute function public.partner_set_updated_at();
create trigger partner_profiles_updated_at before update on public.partner_profiles
  for each row execute function public.partner_set_updated_at();
create trigger partner_applications_updated_at before update on public.partner_applications
  for each row execute function public.partner_set_updated_at();
create trigger partner_referral_codes_updated_at before update on public.partner_referral_codes
  for each row execute function public.partner_set_updated_at();
create trigger partner_training_progress_updated_at before update on public.partner_training_progress
  for each row execute function public.partner_set_updated_at();
create trigger partner_resources_updated_at before update on public.partner_resources
  for each row execute function public.partner_set_updated_at();
create trigger partner_leads_updated_at before update on public.partner_leads
  for each row execute function public.partner_set_updated_at();
create trigger partner_deals_updated_at before update on public.partner_deals
  for each row execute function public.partner_set_updated_at();
create trigger partner_setup_checklists_updated_at before update on public.partner_setup_checklists
  for each row execute function public.partner_set_updated_at();
create trigger partner_setup_tasks_updated_at before update on public.partner_setup_tasks
  for each row execute function public.partner_set_updated_at();
create trigger partner_commission_rules_updated_at before update on public.partner_commission_rules
  for each row execute function public.partner_set_updated_at();
create trigger partner_commissions_updated_at before update on public.partner_commissions
  for each row execute function public.partner_set_updated_at();
create trigger partner_payout_methods_updated_at before update on public.partner_payout_methods
  for each row execute function public.partner_set_updated_at();
create trigger partner_payout_batches_updated_at before update on public.partner_payout_batches
  for each row execute function public.partner_set_updated_at();
create trigger partner_payout_items_updated_at before update on public.partner_payout_items
  for each row execute function public.partner_set_updated_at();
create trigger partner_disputes_updated_at before update on public.partner_disputes
  for each row execute function public.partner_set_updated_at();

grant usage on schema public to authenticated;
grant select, insert, update on public.partner_profiles to authenticated;
grant select, insert, update on public.partner_applications to authenticated;
grant select, insert, update on public.partner_referral_codes to authenticated;
grant select, insert, update on public.partner_training_progress to authenticated;
grant select on public.partner_resources to authenticated;
grant select, insert, update on public.partner_leads to authenticated;
grant select, insert on public.partner_lead_events to authenticated;
grant select, insert, update on public.partner_deals to authenticated;
grant select, insert on public.partner_deal_events to authenticated;
grant select, insert, update on public.partner_setup_checklists to authenticated;
grant select, insert, update on public.partner_setup_tasks to authenticated;
grant select on public.partner_commission_rules to authenticated;
grant select, insert, update on public.partner_commissions to authenticated;
grant select, insert, update on public.partner_payout_methods to authenticated;
grant select on public.partner_payout_batches to authenticated;
grant select on public.partner_payout_items to authenticated;
grant select, insert, update on public.partner_disputes to authenticated;
grant select, insert, update on public.partner_notifications to authenticated;
grant select, insert on public.partner_audit_events to authenticated;
grant execute on function public.partner_current_partner_id() to authenticated;
grant execute on function public.partner_is_admin() to authenticated;

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

commit;
