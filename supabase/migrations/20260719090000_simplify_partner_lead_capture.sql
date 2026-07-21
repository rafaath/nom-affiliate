begin;

alter table public.partner_leads
  alter column restaurant_type drop not null;

commit;
