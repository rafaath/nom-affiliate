begin;

alter table public.partner_pending_applications
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_notice_acknowledged_at timestamptz;

alter table public.partner_applications
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_notice_acknowledged_at timestamptz;

alter table public.partner_pending_applications
  drop constraint if exists partner_pending_applications_privacy_audit_all_or_none,
  add constraint partner_pending_applications_privacy_audit_all_or_none check (
    (privacy_notice_version is null and privacy_notice_acknowledged_at is null)
    or
    (privacy_notice_version is not null and privacy_notice_acknowledged_at is not null)
  );

alter table public.partner_applications
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
comment on column public.partner_pending_applications.privacy_notice_version is
  'Partner Program Privacy Notice version acknowledged before email confirmation; null denotes a legacy submission.';
comment on column public.partner_applications.privacy_notice_version is
  'Partner Program Privacy Notice version acknowledged during application; null denotes a legacy submission.';

create table public.partner_agreement_acceptances (
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

create index partner_agreement_acceptances_partner_idx
  on public.partner_agreement_acceptances (partner_id, accepted_at desc);

alter table public.partner_agreement_acceptances enable row level security;

revoke all privileges on table public.partner_agreement_acceptances
  from public, anon, authenticated;
grant select on table public.partner_agreement_acceptances to authenticated;
grant all privileges on table public.partner_agreement_acceptances to postgres, service_role;

create policy partner_agreement_acceptances_owned_select
  on public.partner_agreement_acceptances for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

do $preserve_readonly$
begin
  if exists (select 1 from pg_roles where rolname = 'readonly_user') then
    execute 'grant select on table public.partner_agreement_acceptances to readonly_user';
  end if;
end
$preserve_readonly$;

create or replace function public.partner_reject_agreement_acceptance_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Partner agreement acceptance records are append-only';
end;
$$;

revoke execute on function public.partner_reject_agreement_acceptance_mutation()
  from public, anon, authenticated;
grant execute on function public.partner_reject_agreement_acceptance_mutation()
  to postgres, service_role;

create trigger partner_agreement_acceptances_append_only
before update or delete on public.partner_agreement_acceptances
for each row execute function public.partner_reject_agreement_acceptance_mutation();

commit;
