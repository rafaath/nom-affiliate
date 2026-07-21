begin;

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
  public.partner_setup_verification_rules
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
  public.partner_setup_verification_rules
to authenticated;

-- Replace every broad mutation policy with a read-only equivalent where one is needed.
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

-- Table ownership and server/operations access remain intact.
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
  public.partner_setup_verification_rules
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
      public.partner_setup_verification_rules to readonly_user';
  end if;
end
$preserve_readonly$;

revoke all privileges on sequence public.partner_audit_events_id_seq from public, anon, authenticated;
grant all privileges on sequence public.partner_audit_events_id_seq to postgres, service_role;

revoke execute on function public.partner_set_updated_at() from public, anon, authenticated;
revoke execute on function public.partner_current_partner_id() from public, anon, authenticated;
revoke execute on function public.partner_is_admin() from public, anon, authenticated;
grant execute on function public.partner_current_partner_id() to authenticated;
grant execute on function public.partner_is_admin() to authenticated;
grant execute on function public.partner_set_updated_at() to postgres, service_role;
grant execute on function public.partner_current_partner_id() to postgres, service_role;
grant execute on function public.partner_is_admin() to postgres, service_role;

alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public revoke all privileges on sequences from public, anon, authenticated;

-- The marketing site's former waitlist table is external to this repository. If it
-- shares this database, keep it server-only without making this migration depend on it.
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

commit;
