begin;

alter table public.partner_pending_applications
  add column if not exists program_terms_version text,
  add column if not exists program_terms_accepted_at timestamptz,
  add column if not exists program_contact_consent_at timestamptz;

alter table public.partner_applications
  add column if not exists program_terms_version text,
  add column if not exists program_terms_accepted_at timestamptz,
  add column if not exists program_contact_consent_at timestamptz;

alter table public.partner_pending_applications
  drop constraint if exists partner_pending_applications_terms_audit_all_or_none,
  add constraint partner_pending_applications_terms_audit_all_or_none check (
    (program_terms_version is null and program_terms_accepted_at is null and program_contact_consent_at is null)
    or
    (program_terms_version is not null and program_terms_accepted_at is not null and program_contact_consent_at is not null)
  );

alter table public.partner_applications
  drop constraint if exists partner_applications_terms_audit_all_or_none,
  add constraint partner_applications_terms_audit_all_or_none check (
    (program_terms_version is null and program_terms_accepted_at is null and program_contact_consent_at is null)
    or
    (program_terms_version is not null and program_terms_accepted_at is not null and program_contact_consent_at is not null)
  );

comment on column public.partner_pending_applications.program_terms_version is
  'Exact partner program terms version accepted during pre-confirmation application recovery; null denotes a legacy submission.';
comment on column public.partner_applications.program_terms_version is
  'Exact partner program terms version accepted during application; null denotes a legacy submission.';

commit;
