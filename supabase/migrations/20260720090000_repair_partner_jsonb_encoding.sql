begin;

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

commit;
