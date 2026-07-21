begin;

alter table public.partner_pending_applications
  add column if not exists linkedin_profile_url text,
  add column if not exists resume_drive_url text;

alter table public.partner_applications
  add column if not exists linkedin_profile_url text,
  add column if not exists resume_drive_url text;

alter table public.partner_pending_applications
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
  );

alter table public.partner_applications
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
  );

comment on column public.partner_pending_applications.linkedin_profile_url is
  'Optional LinkedIn profile supplied during partner application before email confirmation.';
comment on column public.partner_pending_applications.resume_drive_url is
  'Optional Google Drive or Google Docs resume link supplied before email confirmation.';
comment on column public.partner_applications.linkedin_profile_url is
  'Optional LinkedIn profile supplied with the reviewed partner application.';
comment on column public.partner_applications.resume_drive_url is
  'Optional Google Drive or Google Docs resume link supplied with the reviewed partner application.';

commit;
