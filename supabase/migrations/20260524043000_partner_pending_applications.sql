begin;

create table if not exists public.partner_pending_applications (
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

create index if not exists partner_pending_applications_status_idx
  on public.partner_pending_applications (status, updated_at desc);

commit;
