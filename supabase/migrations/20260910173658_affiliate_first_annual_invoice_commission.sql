begin;

-- Preserve the historical fixed commission rule for auditability, but stop using it.
update public.partner_commission_rules
set
  is_active = false,
  active_until = coalesce(active_until, now()),
  updated_at = now()
where partner_type = 'affiliate'
  and commission_type = 'referral'
  and is_active = true
  and code <> 'affiliate_first_paid_annual_invoice_25_percent';

-- Affiliates earn one commission per converted branch: 25% of that branch's
-- first paid annual subscription invoice. The existing 30-day validation window
-- remains in place before the commission becomes eligible for approval.
insert into public.partner_commission_rules (
  code,
  partner_type,
  commission_type,
  currency_code,
  fixed_amount_cents,
  percent_bps,
  validation_days,
  conditions,
  is_active,
  active_from,
  active_until
)
values (
  'affiliate_first_paid_annual_invoice_25_percent',
  'affiliate',
  'referral',
  'INR',
  null,
  2500,
  30,
  '{
    "commission_basis": "first_paid_annual_subscription_invoice",
    "commission_frequency": "one_time",
    "commission_scope": "per_converted_branch",
    "requires_accepted_lead": true,
    "requires_converted_branch": true,
    "requires_successful_payment": true,
    "requires_annual_subscription": true
  }'::jsonb,
  true,
  now(),
  null
)
on conflict (code) do update set
  partner_type = excluded.partner_type,
  commission_type = excluded.commission_type,
  currency_code = excluded.currency_code,
  fixed_amount_cents = excluded.fixed_amount_cents,
  percent_bps = excluded.percent_bps,
  validation_days = excluded.validation_days,
  conditions = excluded.conditions,
  is_active = true,
  active_from = now(),
  active_until = null,
  updated_at = now();

-- Enforce the one-time rule even if commission creation is retried concurrently.
create unique index if not exists partner_commissions_one_type_per_deal_idx
  on public.partner_commissions (deal_id, commission_type)
  where deal_id is not null;

commit;
