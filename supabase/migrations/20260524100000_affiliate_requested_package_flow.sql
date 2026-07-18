begin;

alter table public.partner_leads
  add column if not exists legal_business_name text,
  add column if not exists branch_address text,
  add column if not exists state text,
  add column if not exists country text not null default 'India',
  add column if not exists postal_code text,
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists gst_registration_type text,
  add column if not exists requested_plan_id uuid references public.subscription_plans(id) on delete set null,
  add column if not exists requested_feature_codes text[] not null default '{}',
  add column if not exists requested_branch_count integer not null default 1 check (requested_branch_count > 0),
  add column if not exists requested_package_summary text,
  add column if not exists requested_monthly_revenue_cents integer not null default 0 check (requested_monthly_revenue_cents >= 0),
  add column if not exists requested_commission_preview_cents integer not null default 0 check (requested_commission_preview_cents >= 0),
  add column if not exists requested_commission_preview jsonb not null default '{}',
  add column if not exists affiliate_reported_platform_link_kind public.partner_platform_link_kind,
  add column if not exists affiliate_reported_existing_customer_notes text,
  add column if not exists onboarding_intent jsonb not null default '{}';

alter table public.partner_deals
  add column if not exists requested_plan_id uuid references public.subscription_plans(id) on delete set null,
  add column if not exists requested_feature_codes text[] not null default '{}',
  add column if not exists requested_branch_count integer not null default 1 check (requested_branch_count > 0),
  add column if not exists requested_package_summary text,
  add column if not exists requested_monthly_revenue_cents integer not null default 0 check (requested_monthly_revenue_cents >= 0),
  add column if not exists requested_commission_preview_cents integer not null default 0 check (requested_commission_preview_cents >= 0),
  add column if not exists affiliate_package_snapshot jsonb not null default '{}',
  add column if not exists approval_package_snapshot jsonb not null default '{}';

alter table public.partner_platform_onboarding_requests
  add column if not exists affiliate_requested_plan_id uuid references public.subscription_plans(id) on delete set null,
  add column if not exists affiliate_requested_feature_codes text[] not null default '{}',
  add column if not exists affiliate_requested_branch_count integer not null default 1 check (affiliate_requested_branch_count > 0),
  add column if not exists affiliate_package_snapshot jsonb not null default '{}',
  add column if not exists legal_business_name text,
  add column if not exists branch_address text,
  add column if not exists affiliate_sales_context jsonb not null default '{}';

create index if not exists partner_leads_requested_plan_idx
  on public.partner_leads (requested_plan_id, status, created_at desc)
  where requested_plan_id is not null;

create index if not exists partner_leads_requested_feature_codes_idx
  on public.partner_leads using gin (requested_feature_codes);

create index if not exists partner_deals_requested_plan_idx
  on public.partner_deals (requested_plan_id, subscription_plan_id, stage, updated_at desc);

create index if not exists partner_onboarding_affiliate_requested_plan_idx
  on public.partner_platform_onboarding_requests (affiliate_requested_plan_id, requested_plan_id, status, updated_at desc);

commit;
