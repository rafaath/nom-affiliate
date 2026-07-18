# Nom Partner Program Platform Integration Implementation Blueprint

Last updated: 2026-05-24

This is a documentation-only implementation blueprint. Do not run migrations from the affiliate app. Backend schema work must be added as `.sql` migration files only and applied through the Supabase source-of-truth process when explicitly requested.

## Purpose

The partner program must become a platform-native partner operations layer, not a separate CRM that happens to mention restaurants. A partner lead, partner deal, setup checklist, and commission must resolve to the same facts that RMS, QR, internal dashboard, Supabase Auth, subscriptions, features, roles, and authorization already use.

The target is:

- Partner app owns partner lifecycle: applications, leads, attribution, commissions, payouts, disputes.
- Internal dashboard owns platform control plane: plans, features, onboarding execution, franchise/branch/admin operations.
- RMS owns restaurant operations: staff auth, role/capability enforcement, branch/menu/POS/inventory operations.
- QR app owns QR menu/portal/runtime configuration.
- Supabase dev database `wuryzsyfytlbrysfnwtj` remains source of truth.

## Non-Negotiable Invariants

1. Do not create a second source of truth for plans, features, branches, roles, QR setup, or subscriptions.
2. Do not mark partner commission eligible only because a deal moved to `won`.
3. Do not create platform records from partner-submitted free text without admin review and deterministic validation.
4. Do not expose `DATABASE_URL` or service-role keys to browser code.
5. Do not bypass the RMS authorization model when writing platform operational tables.
6. Do not run Playwright tests for this work.
7. Do not run migrations from this app unless the user explicitly asks for MCP execution.
8. Fail loudly when a required platform fact is missing.

## Exact Source Of Truth Map

| Domain | Source of truth | Code source | Must be used for |
| --- | --- | --- | --- |
| Partner identity | `partner_profiles`, `partner_applications` | `affiliate/src/lib/partner-program/data.ts` | Application review, referral code, partner tier |
| Partner lead | `partner_leads`, `partner_lead_events` | `affiliate/src/lib/partner-program/data.ts` and `admin-data.ts` | Restaurant referral intake and ownership |
| Partner deal | `partner_deals`, `partner_deal_events` | `affiliate/src/lib/partner-program/admin-data.ts` | Sales attribution, plan/product scope, commercial stage |
| Platform restaurant | `franchises`, `branches` | Internal dashboard and RMS | Actual restaurant/customer account |
| Owner/staff auth | `auth.users`, `staff`, `auth_staff_mapping`, `staff_franchise_roles`, `staff_branch_assignments` | Internal dashboard onboarding RPC and RMS tRPC context | Restaurant owner login and RMS/portal access |
| Plans | `subscription_plans` | Internal dashboard `usePlans` | What customer bought |
| Plan features | `features`, `plan_features`, `plan_resource_limits` | Internal dashboard plan matrix | What customer is entitled to |
| Runtime capabilities | `authz_effective_franchise_capabilities`, `authz_effective_branch_capabilities` | RMS `src/server/authz/service.ts` | What RMS/QR should allow at runtime |
| Roles/actions | `roles`, `franchise_role_mappings`, `authz.role_action_grants` | RMS roles routers | Staff authorization |
| QR setup | `qr_menu_profiles`, `qr_menu_schedules`, `qr_menu_franchise_defaults`, `qr_menu_branch_default_overrides` | QR `src/lib/qr-menu/server/admin.ts` and `fetchBranchProfile.ts` | Actual QR menu runtime |
| Menu setup | `categories`, `menu`, `menu_branch_mapping`, modifier/tax/charge tables | RMS + QR portal menu modules | Menu that customers and staff can use |
| POS setup | `restaurant_tables`, `sections`, `registers`, `payment_methods` | RMS + QR | Operational POS readiness |
| Inventory setup | `warehouses`, `raw_materials`, `suppliers`, inventory child tables | RMS inventory routers | Inventory readiness |
| Internal control plane | Internal dashboard pages/hooks | `Internaldashboard/internaldashboardrms/src` | Platform admin operations and visibility |

## Current State Summary

### Already Good

- Affiliate app has partner application, login, lead, deal, setup, commission, payout, dispute, admin pages.
- Partner DB already has FK hooks:
  - `partner_leads.existing_franchise_id -> franchises.id`
  - `partner_leads.existing_branch_id -> branches.id`
  - `partner_deals.franchise_id -> franchises.id`
  - `partner_deals.branch_id -> branches.id`
  - `partner_deals.subscription_plan_id -> subscription_plans.id`
- Internal dashboard already has platform onboarding route and RPC.
- RMS already has staff-role-capability enforcement.
- QR already has profile/default/schedule runtime resolution.

### Not Yet Platform-Native

- Lead review does not reconcile against `franchises` and `branches`.
- Deal update does not require plan/feature/platform link.
- `won` currently creates commission/checklist too early.
- Setup tasks are generic labels, not verified platform facts.
- Commission review can approve without platform validation facts.
- Internal dashboard cannot see partner-attributed onboarding requests.

## Live Dev Database Facts

Observed from Supabase dev project `wuryzsyfytlbrysfnwtj`:

- `subscription_plans`: 2 rows.
- `features`: 30 rows.
- `authz.capabilities`: 77 rows.
- `franchises`: 8 rows.
- `branches`: 16 rows.
- `staff`: 34 rows.
- `partner_profiles`: 1 row.
- `partner_leads`: 0 rows.
- `partner_deals`: 0 rows.
- `qr_menu_profiles`: 5 rows.
- `qr_menu_franchise_defaults`: 1 row.
- `qr_menu_branch_default_overrides`: 2 rows.
- `menu`: 201 rows.
- `menu_branch_mapping`: 173 rows.

Active plans:

| Plan code | Name | Price | Currency | Active feature codes | Limits |
| --- | --- | --- | --- | --- | --- |
| `ALL_FEATURES` | All Features | `0` | USD | `activeOrders`, `AI`, `analytics`, `billHistory`, `branch`, `costs`, `customers`, `franchise`, `franchiseCosts`, `inventory`, `liveOrders`, `menu`, `orderHistory`, `orders`, `payments`, `points`, `qr`, `qrWaitlist`, `recipes`, `registers`, `RegisterSessionHistory`, `reservations`, `roles`, `staff`, `storereports`, `tableOrders`, `tables`, `tasks`, `timingGroups` | `BRANCHES = 4` |
| `Inv` | Inventory Plan | `50000` | INR | `activeOrders`, `AI`, `storereports` | `BRANCHES = 2` |

Implementation must load this live catalog instead of using hard-coded partner product strings as the final deal scope.

## Authorization And Roles Deep Map

### RMS Session Context

RMS builds staff context in `rms_all/dev/src/server/trpc/trpc.ts`:

1. Validates Supabase Auth session or bearer token.
2. Reads selected franchise from `x-franchise-id` or `selectedFranchise`.
3. Reads selected branch from `x-branch-id` or `selectedBranch`.
4. Loads `auth_staff_mapping` by `auth_user_id`.
5. Loads `staff` with:
   - `staff_branch_assignments`
   - `branches`
   - `staff_franchise_roles`
   - `roles`
6. Resolves role for selected franchise.
7. Clears forged branch selection for non-owner staff.
8. Loads:
   - `getRolePermissionGrants(role.id)`
   - `getEnabledCapabilities(franchiseId)`
   - `getBranchCapabilityStates(branchId)`

### RMS Capability Enforcement

RMS authorization in `rms_all/dev/src/server/authz/authorizer.ts`:

- Owner role bypasses capability/action checks.
- Non-owner must pass:
  - franchise capability availability,
  - branch capability availability when supported,
  - role action grant requirements,
  - inventory sub-path grants for inventory routes.

RMS procedures use `requireCapability({ capability, action })`.

Examples:

- Branch create: `capability = branch`, `action = create`.
- Branch edit: `capability = branch`, `action = edit`.
- Roles list/create/update/delete: `capability = roles`, actions `view/create/edit/delete`.
- Menu items: `menu.items` and child action grants.
- Tables: `tables`, `tables.qr`, `tables.sections`, etc.

### Platform Authz Tables

Important tables:

- `authz.capabilities`
- `authz.capability_actions`
- `authz.role_action_grants`
- `authz_effective_franchise_capabilities`
- `authz_effective_branch_capabilities`
- `authz_rls_registry`

Important functions:

- `public.authz_get_role_action_grants(p_role_id)`
- `public.authz_sync_role_action_grants(p_role_id, p_grants)`
- `authz.rebuild_effective_capabilities()`
- `authz.refresh_effective_capabilities_for_*`
- `authz.has_capability(p_capability_code, p_branch_id)`

### Critical Authorization Implication

Affiliate must not become a backdoor platform admin.

Partner admin can decide partner attribution and request platform setup. Actual platform records must be:

- linked if already present, or
- created through reviewed onboarding execution that mirrors internal dashboard onboarding, or
- edited through existing internal dashboard/RMS/QR server-side controls.

## Target Workflow End-To-End

### Flow A: New Restaurant Referred By Partner

1. Partner submits lead.
2. Affiliate stores lead as `submitted`.
3. Affiliate reconciliation searches:
   - prior partner leads,
   - existing platform `franchises`,
   - existing platform `branches`.
4. Admin sees match evidence.
5. Admin accepts as `new_platform_customer`.
6. Deal is created with `stage = lead_accepted`.
7. Admin selects:
   - target `subscription_plan_id`,
   - selected capability/feature scope,
   - expected branch rollout,
   - sales mode,
   - setup responsibility.
8. Admin creates `partner_platform_onboarding_requests` row.
9. Internal admin reviews/executes the request.
10. Internal execution creates Supabase Auth user and calls `public.onboard_franchise_owner`.
11. Execution updates:
    - onboarding request result IDs,
    - `partner_deals.franchise_id`,
    - primary `partner_deals.branch_id`,
    - partner attribution rows.
12. Setup checklist is generated from real platform scope.
13. Auto verification checks platform facts.
14. Setup is submitted, restaurant confirms, Nom admin approves.
15. Commission engine evaluates platform facts.
16. Commission is eligible only after validation window and no blockers.

### Flow B: Existing Platform Customer Referred For Add-On

1. Partner submits lead.
2. Reconciliation finds existing `franchise_id` or `branch_id`.
3. Admin reviews whether partner materially influenced sale.
4. Deal links to existing franchise/branch.
5. Admin selects add-on/capability/plan change scope.
6. Internal dashboard performs plan/feature change if needed.
7. Setup checklist verifies add-on state.
8. Commission eligibility checks add-on active in effective capability views.

### Flow C: Duplicate Or Already In Pipeline

1. Partner submits lead.
2. Reconciliation finds strong duplicate partner lead or active deal.
3. Admin marks:
   - `duplicate`, or
   - `already_in_pipeline`.
4. Store `duplicate_of_lead_id` and match evidence.
5. No deal is created.
6. Partner sees transparent status and reason.

## Product Interest To Capability Mapping

Partner lead intake can keep product-interest language for UX, but admin deal scope must resolve to plans/capabilities.

Use this mapping as the first translation layer:

| Partner interest | Candidate capabilities | Platform facts to verify |
| --- | --- | --- |
| `pos` | `table_orders`, `active_orders`, `orders`, `payments`, `registers`, `tables`, `menu` | Registers, tables/sections, payment methods, menu branch mappings |
| `inventory` | `inventory`, `inventory.materials`, `inventory.suppliers`, `inventory.units`, `inventory.recipes`, `inventory.stock`, `branch.warehouses` | Warehouses, suppliers, raw materials, units, recipes if in scope |
| `qr_menu` | `qr`, `menu`, `menu.items`, `menu.categories` | Active QR profile/default, active menu items/categories mapped to branch |
| `qr_ordering` | `qr`, `qr_waitlist`, `table_orders`, `payments`, `tables` | QR capability, table QR/PINs, payments, active ordering surfaces |
| `online_ordering` | `live_orders`, `orders`, `menu` | Online order channels/store status where configured |
| `website` | `qr`, `menu`, public page/site modules if enabled | Public menu/site runtime resolves profile/menu |
| `loyalty` | `points`, `customers` | Loyalty settings/memberships/points feature enabled |
| `staff_order_management` | `staff`, `roles`, `active_orders`, `live_orders` | Staff roles, branch assignments, order capabilities |
| `full_restaurant_setup` | selected plan feature set | All required setup rules generated from selected plan and features |
| `not_sure` | no final capability until admin chooses plan/features | Admin must choose explicit scope before deal can be won |

## SQL Migration Blueprint

Create a new file, for example:

`supabase/migrations/20260524090000_partner_platform_integration.sql`

Do not apply it from the affiliate app. The migration is written as idempotently as practical, but production application should still happen once through the database source-of-truth process.

```sql
-- Partner/platform integration bridge.
-- Do not run from the affiliate app. Apply only through the Supabase source-of-truth process.

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'partner_platform_onboarding_status') then
    create type public.partner_platform_onboarding_status as enum (
      'draft',
      'ready_for_internal_review',
      'approved_for_creation',
      'creation_in_progress',
      'created',
      'failed',
      'cancelled',
      'linked_existing'
    );
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'partner_platform_link_kind') then
    create type public.partner_platform_link_kind as enum (
      'new_platform_customer',
      'existing_franchise',
      'existing_branch',
      'existing_customer_addon',
      'duplicate',
      'already_in_pipeline',
      'unresolved'
    );
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'partner_setup_verification_status') then
    create type public.partner_setup_verification_status as enum (
      'not_checked',
      'passed',
      'failed',
      'manual_required',
      'manually_passed',
      'manually_failed',
      'blocked'
    );
  end if;
end $$;

alter table public.partner_leads
  add column if not exists platform_match_kind public.partner_platform_link_kind not null default 'unresolved',
  add column if not exists platform_match_confidence integer not null default 0 check (platform_match_confidence >= 0 and platform_match_confidence <= 100),
  add column if not exists platform_match_evidence jsonb not null default '{}'::jsonb,
  add column if not exists platform_match_checked_at timestamptz,
  add column if not exists platform_match_checked_by uuid references auth.users(id) on delete set null;

create index if not exists partner_leads_platform_match_idx
  on public.partner_leads (platform_match_kind, platform_match_confidence desc, platform_match_checked_at desc);

create table if not exists public.partner_platform_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  lead_id uuid not null references public.partner_leads(id) on delete cascade,
  deal_id uuid references public.partner_deals(id) on delete cascade,
  link_kind public.partner_platform_link_kind not null default 'new_platform_customer',
  status public.partner_platform_onboarding_status not null default 'draft',
  requested_plan_id uuid references public.subscription_plans(id) on delete restrict,
  owner_email text not null,
  owner_first_name text not null,
  owner_last_name text not null,
  owner_phone text,
  owner_password_delivery_mode text not null default 'internal_generated'
    check (owner_password_delivery_mode in ('internal_generated', 'provided_by_admin')),
  franchise_payload jsonb not null default '{}'::jsonb,
  branches_payload jsonb not null default '[]'::jsonb,
  requested_capability_codes text[] not null default '{}',
  requested_feature_codes text[] not null default '{}',
  requested_resource_limits jsonb not null default '{}'::jsonb,
  existing_franchise_id uuid references public.franchises(id) on delete set null,
  existing_branch_id uuid references public.branches(id) on delete set null,
  created_auth_user_id uuid references auth.users(id) on delete set null,
  created_staff_id uuid references public.staff(id) on delete set null,
  created_franchise_id uuid references public.franchises(id) on delete set null,
  created_branch_ids uuid[] not null default '{}',
  execution_error text,
  execution_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  executed_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_platform_onboarding_payload_branches_array
    check (jsonb_typeof(branches_payload) = 'array'),
  constraint partner_platform_onboarding_existing_link_consistency
    check (
      link_kind not in ('existing_franchise', 'existing_customer_addon')
      or existing_franchise_id is not null
    ),
  constraint partner_platform_onboarding_existing_branch_consistency
    check (
      link_kind <> 'existing_branch'
      or existing_branch_id is not null
    )
);

create unique index if not exists partner_platform_onboarding_one_open_per_deal_idx
  on public.partner_platform_onboarding_requests (deal_id)
  where deal_id is not null
    and status in ('draft', 'ready_for_internal_review', 'approved_for_creation', 'creation_in_progress');

create index if not exists partner_platform_onboarding_admin_queue_idx
  on public.partner_platform_onboarding_requests (status, created_at desc);

create index if not exists partner_platform_onboarding_partner_idx
  on public.partner_platform_onboarding_requests (partner_id, created_at desc);

alter table public.partner_deals
  add column if not exists onboarding_request_id uuid references public.partner_platform_onboarding_requests(id) on delete set null,
  add column if not exists platform_link_kind public.partner_platform_link_kind not null default 'unresolved',
  add column if not exists platform_validation_status public.partner_setup_verification_status not null default 'not_checked',
  add column if not exists platform_validation_checked_at timestamptz,
  add column if not exists platform_validation_evidence jsonb not null default '{}'::jsonb;

create table if not exists public.partner_platform_attributions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_profiles(id) on delete cascade,
  lead_id uuid references public.partner_leads(id) on delete set null,
  deal_id uuid references public.partner_deals(id) on delete set null,
  onboarding_request_id uuid references public.partner_platform_onboarding_requests(id) on delete set null,
  franchise_id uuid references public.franchises(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  subscription_plan_id uuid references public.subscription_plans(id) on delete set null,
  attribution_type text not null check (attribution_type in ('referral', 'sales', 'setup', 'addon', 'renewal', 'supporting')),
  attribution_status text not null default 'active' check (attribution_status in ('active', 'superseded', 'disputed', 'reversed')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_platform_attribution_scope_present
    check (franchise_id is not null or branch_id is not null)
);

create index if not exists partner_platform_attributions_partner_idx
  on public.partner_platform_attributions (partner_id, attribution_status, created_at desc);

create index if not exists partner_platform_attributions_franchise_idx
  on public.partner_platform_attributions (franchise_id, attribution_status, created_at desc)
  where franchise_id is not null;

create index if not exists partner_platform_attributions_branch_idx
  on public.partner_platform_attributions (branch_id, attribution_status, created_at desc)
  where branch_id is not null;

create table if not exists public.partner_deal_feature_selections (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.partner_deals(id) on delete cascade,
  capability_code text not null,
  feature_code text,
  scope_kind text not null default 'franchise' check (scope_kind in ('franchise', 'branch')),
  branch_id uuid references public.branches(id) on delete cascade,
  is_required_for_setup boolean not null default true,
  selected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists partner_deal_feature_selections_deal_idx
  on public.partner_deal_feature_selections (deal_id, capability_code);

create unique index if not exists partner_deal_feature_selections_franchise_scope_key
  on public.partner_deal_feature_selections (deal_id, capability_code)
  where branch_id is null;

create unique index if not exists partner_deal_feature_selections_branch_scope_key
  on public.partner_deal_feature_selections (deal_id, capability_code, branch_id)
  where branch_id is not null;

alter table public.partner_setup_tasks
  add column if not exists platform_area text,
  add column if not exists required_capability_code text,
  add column if not exists required_feature_code text,
  add column if not exists required_franchise_id uuid references public.franchises(id) on delete set null,
  add column if not exists required_branch_id uuid references public.branches(id) on delete set null,
  add column if not exists verification_query_key text,
  add column if not exists verification_status public.partner_setup_verification_status not null default 'not_checked',
  add column if not exists verification_checked_at timestamptz,
  add column if not exists verification_evidence jsonb not null default '{}'::jsonb,
  add column if not exists manually_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists manually_verified_at timestamptz;

create index if not exists partner_setup_tasks_verification_idx
  on public.partner_setup_tasks (verification_status, verification_query_key, verification_checked_at desc);

create table if not exists public.partner_setup_task_evidence (
  id uuid primary key default gen_random_uuid(),
  setup_task_id uuid not null references public.partner_setup_tasks(id) on delete cascade,
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  evidence_type text not null check (evidence_type in ('auto_check', 'manual_note', 'restaurant_confirmation', 'admin_override')),
  status public.partner_setup_verification_status not null,
  evidence jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists partner_setup_task_evidence_task_idx
  on public.partner_setup_task_evidence (setup_task_id, created_at desc);

create table if not exists public.partner_setup_verification_rules (
  key text primary key,
  label text not null,
  platform_area text not null,
  required_capability_code text,
  required_feature_code text,
  scope_kind text not null check (scope_kind in ('franchise', 'branch', 'deal')),
  is_automatic boolean not null default true,
  is_required boolean not null default true,
  sort_order integer not null default 0,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.partner_setup_verification_rules (
  key,
  label,
  platform_area,
  required_capability_code,
  required_feature_code,
  scope_kind,
  is_automatic,
  is_required,
  sort_order,
  description
) values
  ('franchise.exists', 'Franchise exists and is active', 'business_profile', 'franchise', 'franchise', 'franchise', true, true, 10, 'Checks public.franchises.'),
  ('branch.exists', 'Branch exists and is active', 'business_profile', 'branch', 'branch', 'branch', true, true, 20, 'Checks public.branches.'),
  ('owner_staff_auth.exists', 'Owner staff login exists', 'staff', 'staff', 'staff', 'franchise', true, true, 30, 'Checks staff, auth_staff_mapping, staff_franchise_roles, and branch assignments.'),
  ('subscription.active', 'Subscription is active', 'subscription', 'franchise', 'franchise', 'franchise', true, true, 40, 'Checks active franchise_subscriptions.'),
  ('capability.franchise.enabled', 'Franchise capability is enabled', 'entitlements', null, null, 'franchise', true, true, 50, 'Checks authz_effective_franchise_capabilities.'),
  ('capability.branch.enabled', 'Branch capability is enabled', 'entitlements', null, null, 'branch', true, false, 60, 'Checks authz_effective_branch_capabilities when branch scope applies.'),
  ('menu.catalog.ready', 'Menu catalog is ready', 'menu', 'menu', 'menu', 'branch', true, false, 70, 'Checks categories, menu, menu_branch_mapping.'),
  ('qr.profile.resolves', 'QR menu resolves active profile', 'qr', 'qr', 'qr', 'branch', true, false, 80, 'Checks active QR profile/default/schedule state.'),
  ('pos.tables.ready', 'Tables and sections are ready', 'pos', 'tables', 'tables', 'branch', true, false, 90, 'Checks restaurant_tables and sections.'),
  ('pos.registers.ready', 'Register is ready', 'pos', 'registers', 'registers', 'branch', true, false, 100, 'Checks registers.'),
  ('payments.methods.ready', 'Payment methods are ready', 'payments', 'payments', 'payments', 'franchise', true, false, 110, 'Checks payment_methods.'),
  ('inventory.foundation.ready', 'Inventory foundation is ready', 'inventory', 'inventory', 'inventory', 'franchise', true, false, 120, 'Checks warehouses, suppliers, raw_materials.'),
  ('restaurant.confirmed', 'Restaurant confirmed setup', 'restaurant_confirmation', null, null, 'deal', false, true, 900, 'Manual restaurant confirmation.'),
  ('nom.admin.approved', 'Nom admin approved setup', 'admin_approval', null, null, 'deal', false, true, 910, 'Manual Nom admin approval.')
on conflict (key) do update set
  label = excluded.label,
  platform_area = excluded.platform_area,
  required_capability_code = excluded.required_capability_code,
  required_feature_code = excluded.required_feature_code,
  scope_kind = excluded.scope_kind,
  is_automatic = excluded.is_automatic,
  is_required = excluded.is_required,
  sort_order = excluded.sort_order,
  description = excluded.description,
  updated_at = now();

alter table public.partner_platform_onboarding_requests enable row level security;
alter table public.partner_platform_attributions enable row level security;
alter table public.partner_deal_feature_selections enable row level security;
alter table public.partner_setup_task_evidence enable row level security;
alter table public.partner_setup_verification_rules enable row level security;

drop policy if exists partner_platform_onboarding_partner_select on public.partner_platform_onboarding_requests;
create policy partner_platform_onboarding_partner_select
  on public.partner_platform_onboarding_requests
  for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

drop policy if exists partner_platform_onboarding_admin_all on public.partner_platform_onboarding_requests;
create policy partner_platform_onboarding_admin_all
  on public.partner_platform_onboarding_requests
  for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

drop policy if exists partner_platform_attributions_partner_select on public.partner_platform_attributions;
create policy partner_platform_attributions_partner_select
  on public.partner_platform_attributions
  for select to authenticated
  using (partner_id = public.partner_current_partner_id() or public.partner_is_admin());

drop policy if exists partner_platform_attributions_admin_all on public.partner_platform_attributions;
create policy partner_platform_attributions_admin_all
  on public.partner_platform_attributions
  for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

drop policy if exists partner_deal_feature_selections_partner_select on public.partner_deal_feature_selections;
create policy partner_deal_feature_selections_partner_select
  on public.partner_deal_feature_selections
  for select to authenticated
  using (
    exists (
      select 1
      from public.partner_deals d
      where d.id = deal_id
        and (d.partner_id = public.partner_current_partner_id() or public.partner_is_admin())
    )
  );

drop policy if exists partner_deal_feature_selections_admin_all on public.partner_deal_feature_selections;
create policy partner_deal_feature_selections_admin_all
  on public.partner_deal_feature_selections
  for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

drop policy if exists partner_setup_task_evidence_partner_select on public.partner_setup_task_evidence;
create policy partner_setup_task_evidence_partner_select
  on public.partner_setup_task_evidence
  for select to authenticated
  using (
    exists (
      select 1
      from public.partner_setup_tasks task
      join public.partner_setup_checklists checklist on checklist.id = task.checklist_id
      where task.id = setup_task_id
        and (checklist.partner_id = public.partner_current_partner_id() or public.partner_is_admin())
    )
  );

drop policy if exists partner_setup_task_evidence_admin_all on public.partner_setup_task_evidence;
create policy partner_setup_task_evidence_admin_all
  on public.partner_setup_task_evidence
  for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());

drop policy if exists partner_setup_verification_rules_read on public.partner_setup_verification_rules;
create policy partner_setup_verification_rules_read
  on public.partner_setup_verification_rules
  for select to authenticated
  using (true);

drop policy if exists partner_setup_verification_rules_admin_all on public.partner_setup_verification_rules;
create policy partner_setup_verification_rules_admin_all
  on public.partner_setup_verification_rules
  for all to authenticated
  using (public.partner_is_admin())
  with check (public.partner_is_admin());
```

## Migration Contract Checklist

Before applying the SQL migration in any database, verify:

- `partner_profiles`, `partner_leads`, `partner_deals`, `partner_setup_checklists`, `partner_setup_tasks`, `partner_commissions` exist.
- `public.partner_current_partner_id()` exists.
- `public.partner_is_admin()` exists.
- `franchises`, `branches`, `staff`, `subscription_plans`, `features` exist.
- `authz_effective_franchise_capabilities` and `authz_effective_branch_capabilities` exist.
- RLS policies do not expose onboarding payloads to unrelated partners.
- The migration does not create or update real business data except verification rule seed rows.

## Affiliate App File-By-File Blueprint

### New Directory

Create:

`src/lib/partner-program/platform/`

Files:

- `types.ts`
- `catalog.ts`
- `reconciliation.ts`
- `onboarding-requests.ts`
- `setup-verification.ts`
- `setup-task-generator.ts`
- `commission-eligibility.ts`
- `admin-dashboard.ts`

### `src/lib/partner-program/platform/types.ts`

Purpose: centralize platform bridge types.

```ts
export type PlatformLinkKind =
  | 'new_platform_customer'
  | 'existing_franchise'
  | 'existing_branch'
  | 'existing_customer_addon'
  | 'duplicate'
  | 'already_in_pipeline'
  | 'unresolved';

export type PlatformOnboardingStatus =
  | 'draft'
  | 'ready_for_internal_review'
  | 'approved_for_creation'
  | 'creation_in_progress'
  | 'created'
  | 'failed'
  | 'cancelled'
  | 'linked_existing';

export type SetupVerificationStatus =
  | 'not_checked'
  | 'passed'
  | 'failed'
  | 'manual_required'
  | 'manually_passed'
  | 'manually_failed'
  | 'blocked';

export type PlatformPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency_code: string;
  billing_period: string;
  is_active: boolean;
};

export type PlatformFeature = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  is_active: boolean;
};

export type PlatformCapability = {
  code: string;
  label: string;
  scope_kind: 'franchise' | 'branch';
  supports_branch_override: boolean;
  legacy_feature_code: string | null;
  actions: string[];
};

export type PlatformReconciliationMatch = {
  kind: PlatformLinkKind;
  confidence: number;
  franchiseId: string | null;
  branchId: string | null;
  duplicateLeadId: string | null;
  evidence: Record<string, unknown>;
};
```

### `src/lib/partner-program/platform/catalog.ts`

Purpose: load active plans, features, authz capabilities, and plan matrix from database.

Required functions:

```ts
import { getDatabase, type SqlExecutor } from '@/lib/db/client';
import type { PlatformCapability, PlatformFeature, PlatformPlan } from './types';

export async function listActivePlatformPlans(sql: SqlExecutor = getDatabase()): Promise<PlatformPlan[]> {
  const rows = await sql`
    select id, code, name, description, price_cents, currency_code, billing_period::text, is_active
    from public.subscription_plans
    where is_active = true
    order by price_cents asc, name asc
  `;

  return rows as unknown as PlatformPlan[];
}

export async function listActivePlatformFeatures(sql: SqlExecutor = getDatabase()): Promise<PlatformFeature[]> {
  const rows = await sql`
    select id, code, label, description, is_active
    from public.features
    where is_active = true
    order by label asc
  `;

  return rows as unknown as PlatformFeature[];
}

export async function listPlatformCapabilities(sql: SqlExecutor = getDatabase()): Promise<PlatformCapability[]> {
  const rows = await sql`
    select
      c.code,
      c.label,
      c.scope_kind::text,
      c.supports_branch_override,
      c.legacy_feature_code,
      coalesce(jsonb_agg(distinct ca.action_code order by ca.action_code) filter (where ca.action_code is not null), '[]'::jsonb) as actions
    from authz.capabilities c
    left join authz.capability_actions ca on ca.capability_id = c.id
    where c.is_active = true
    group by c.id, c.code, c.label, c.scope_kind, c.supports_branch_override, c.legacy_feature_code
    order by c.code
  `;

  return rows as unknown as PlatformCapability[];
}

export async function getPlanFeatureMatrix(sql: SqlExecutor = getDatabase()) {
  const rows = await sql`
    select
      sp.id as plan_id,
      sp.code as plan_code,
      sp.name as plan_name,
      f.id as feature_id,
      f.code as feature_code,
      f.label as feature_label,
      pf.is_enabled
    from public.subscription_plans sp
    join public.plan_features pf on pf.plan_id = sp.id
    join public.features f on f.id = pf.feature_id
    where sp.is_active = true
      and f.is_active = true
    order by sp.name, f.label
  `;

  return rows;
}
```

### `src/lib/partner-program/platform/reconciliation.ts`

Purpose: score submitted leads against partner pipeline and platform entities.

Scoring:

- `+45` exact normalized phone match.
- `+35` exact normalized email match.
- `+25` normalized restaurant name match in same city.
- `+15` locality match.
- `+10` owner/contact name similarity.
- `+10` active branch/franchise status.

Decision:

- `>= 80` existing/duplicate high confidence.
- `60..79` needs admin review with strong warning.
- `< 60` new prospect.

Required function:

```ts
import { getDatabase, type SqlExecutor } from '@/lib/db/client';
import type { PlatformReconciliationMatch } from './types';

type LeadIdentity = {
  leadId?: string;
  restaurantName: string;
  phone: string;
  email?: string | null;
  city: string;
  locality: string;
  ownerName?: string | null;
};

function normalizePhone(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '').slice(-10);
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function scoreStrings(next: string, existing: string) {
  if (!next || !existing) return 0;
  if (next === existing) return 1;
  if (next.includes(existing) || existing.includes(next)) return 0.75;
  return 0;
}

export async function reconcileLeadAgainstPlatform(
  lead: LeadIdentity,
  sql: SqlExecutor = getDatabase()
): Promise<PlatformReconciliationMatch> {
  const normalizedPhone = normalizePhone(lead.phone);
  const normalizedEmail = normalizeText(lead.email);
  const normalizedName = normalizeText(lead.restaurantName);
  const normalizedCity = normalizeText(lead.city);
  const normalizedLocality = normalizeText(lead.locality);

  const duplicateLeadRows = await sql`
    select id, restaurant_name, phone, email, city, locality, status, partner_id
    from public.partner_leads
    where (${normalizedPhone} <> '' and normalized_phone = ${normalizedPhone})
       or (${normalizedEmail} <> '' and normalized_email = ${normalizedEmail})
       or (normalized_restaurant_name = ${normalizedName} and lower(city) = ${normalizedCity})
    order by created_at desc
    limit 10
  `;

  const platformRows = await sql`
    select
      f.id as franchise_id,
      f.name as franchise_name,
      f.contact_email,
      f.contact_phone,
      f.status as franchise_status,
      b.id as branch_id,
      b.name as branch_name,
      b.city,
      b.address,
      b.status as branch_status
    from public.franchises f
    left join public.branches b on b.franchise_id = f.id
    where (${normalizedPhone} <> '' and right(regexp_replace(coalesce(f.contact_phone, ''), '\\D', '', 'g'), 10) = ${normalizedPhone})
       or (${normalizedEmail} <> '' and lower(coalesce(f.contact_email, '')) = ${normalizedEmail})
       or (lower(regexp_replace(btrim(f.name), '[^a-zA-Z0-9]+', ' ', 'g')) = ${normalizedName})
       or (lower(regexp_replace(btrim(coalesce(b.name, '')), '[^a-zA-Z0-9]+', ' ', 'g')) = ${normalizedName} and lower(coalesce(b.city, '')) = ${normalizedCity})
    limit 10
  `;

  const duplicateCandidate = duplicateLeadRows[0] as any | undefined;
  if (duplicateCandidate) {
    const score =
      (duplicateCandidate.phone && normalizePhone(duplicateCandidate.phone) === normalizedPhone ? 45 : 0) +
      (duplicateCandidate.email && normalizeText(duplicateCandidate.email) === normalizedEmail ? 35 : 0) +
      Math.round(scoreStrings(normalizeText(duplicateCandidate.restaurant_name), normalizedName) * 25) +
      Math.round(scoreStrings(normalizeText(duplicateCandidate.locality), normalizedLocality) * 15);

    if (score >= 80) {
      return {
        kind: 'duplicate',
        confidence: Math.min(score, 100),
        franchiseId: null,
        branchId: null,
        duplicateLeadId: duplicateCandidate.id,
        evidence: { duplicateLead: duplicateCandidate, score },
      };
    }
  }

  const platformCandidate = platformRows[0] as any | undefined;
  if (platformCandidate) {
    const score =
      (platformCandidate.contact_phone && normalizePhone(platformCandidate.contact_phone) === normalizedPhone ? 45 : 0) +
      (platformCandidate.contact_email && normalizeText(platformCandidate.contact_email) === normalizedEmail ? 35 : 0) +
      Math.round(Math.max(
        scoreStrings(normalizeText(platformCandidate.franchise_name), normalizedName),
        scoreStrings(normalizeText(platformCandidate.branch_name), normalizedName)
      ) * 25) +
      (normalizeText(platformCandidate.city) === normalizedCity ? 10 : 0) +
      (platformCandidate.franchise_status === 'ACTIVE' ? 5 : 0);

    return {
      kind: platformCandidate.branch_id ? 'existing_branch' : 'existing_franchise',
      confidence: Math.min(score, 100),
      franchiseId: platformCandidate.franchise_id,
      branchId: platformCandidate.branch_id,
      duplicateLeadId: null,
      evidence: { platformMatch: platformCandidate, score },
    };
  }

  return {
    kind: 'new_platform_customer',
    confidence: 0,
    franchiseId: null,
    branchId: null,
    duplicateLeadId: null,
    evidence: { searched: true },
  };
}
```

### Modify `src/lib/partner-program/data.ts`

In `createPartnerLead(...)`:

1. After inserting lead, call `reconcileLeadAgainstPlatform(...)` inside the same transaction.
2. Update `partner_leads` with:
   - `platform_match_kind`
   - `platform_match_confidence`
   - `platform_match_evidence`
   - `existing_franchise_id`
   - `existing_branch_id`
   - `duplicate_of_lead_id`
   - `platform_match_checked_at`
3. Keep lead status `submitted`. Do not auto-reject; admin decides.

Implementation pattern:

```ts
const match = await reconcileLeadAgainstPlatform(
  {
    leadId: lead.id,
    restaurantName: lead.restaurant_name,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    locality: lead.locality,
    ownerName: lead.owner_name,
  },
  tx
);

await tx`
  update public.partner_leads
  set
    platform_match_kind = ${match.kind},
    platform_match_confidence = ${match.confidence},
    platform_match_evidence = ${tx.json(match.evidence)},
    existing_franchise_id = ${match.franchiseId},
    existing_branch_id = ${match.branchId},
    duplicate_of_lead_id = ${match.duplicateLeadId},
    platform_match_checked_at = now(),
    updated_at = now()
  where id = ${lead.id}
`;
```

Also update `getAdminDashboard()` to join:

- `partner_deals.franchise_id -> franchises`
- `partner_deals.branch_id -> branches`
- `partner_deals.subscription_plan_id -> subscription_plans`
- `partner_deals.onboarding_request_id -> partner_platform_onboarding_requests`
- feature selections lateral aggregate.

### Modify `src/lib/partner-program/admin-data.ts`

#### `reviewLead(...)`

Current behavior:

- Accepting a lead creates a deal immediately with no platform decision.

Target behavior:

- Accepting a lead requires platform link decision.
- `duplicate` requires `duplicate_of_lead_id` or match evidence.
- `already_in_pipeline` requires note or evidence.
- Accepted deal must inherit platform link fields from lead.

New input:

```ts
export async function reviewLead(input: {
  actorAuthUserId: string;
  leadId: string;
  partnerId: string;
  status: string;
  note: string;
  platformLinkKind?: PlatformLinkKind;
  existingFranchiseId?: string | null;
  existingBranchId?: string | null;
  duplicateOfLeadId?: string | null;
}) {}
```

Rules:

- If `status === 'accepted'`, `platformLinkKind` must be one of:
  - `new_platform_customer`
  - `existing_franchise`
  - `existing_branch`
  - `existing_customer_addon`
- If `platformLinkKind === existing_franchise`, `existingFranchiseId` is required.
- If `platformLinkKind === existing_branch`, `existingBranchId` is required.
- If `status === duplicate`, `duplicateOfLeadId` is required unless `partner_leads.duplicate_of_lead_id` is already set.

When inserting deal:

```sql
insert into public.partner_deals (
  lead_id,
  partner_id,
  stage,
  sales_mode,
  platform_link_kind,
  franchise_id,
  branch_id,
  next_action,
  updated_at
)
values (...)
```

#### `updateDealStage(...)`

Current behavior:

- `stage = won` inserts pending commission and generic setup checklist.

Target behavior:

- `won` is commercial intent only.
- It must not create eligible commission blindly.
- It must create or require platform onboarding/linkage.
- Commission status should remain `estimated` or `pending_platform_validation` equivalent. Existing enum lacks that value, so use `estimated` until a status migration is approved or add a new enum in a later migration.

New input:

```ts
export async function updateDealStage(input: {
  actorAuthUserId: string;
  dealId: string;
  stage: string;
  note: string;
  expectedCommissionCents: number;
  subscriptionPlanId?: string | null;
  productsSold?: string[];
  selectedCapabilityCodes?: string[];
  targetBranchIds?: string[];
}) {}
```

Rules:

- Moving to `won` requires `subscriptionPlanId`.
- Moving to `won` requires `platform_link_kind !== unresolved`.
- If `platform_link_kind = new_platform_customer`, deal must have an onboarding request in `ready_for_internal_review` or later.
- If existing customer/add-on, deal must have `franchise_id`.
- Generate setup checklist from selected capabilities.
- Do not mark `live_at` until platform verification passes.

### `src/lib/partner-program/platform/onboarding-requests.ts`

Purpose: create/update/approve/link requests.

Required functions:

```ts
export async function createOnboardingRequestForDeal(input: {
  actorAuthUserId: string;
  dealId: string;
  requestedPlanId: string;
  owner: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  };
  franchise: {
    name: string;
    code: string;
    ownerName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
  };
  branches: Array<{
    name: string;
    code: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string | null;
    numberOfTables: number;
    timezone: string;
    currencyCode: string;
    currencySymbol: string;
    openingTime?: string | null;
    closingTime?: string | null;
    isPrimary?: boolean;
  }>;
  requestedCapabilityCodes: string[];
}) {}

export async function linkDealToExistingPlatformRecords(input: {
  actorAuthUserId: string;
  dealId: string;
  franchiseId: string;
  branchId?: string | null;
  subscriptionPlanId?: string | null;
  attributionType: 'referral' | 'sales' | 'setup' | 'addon';
}) {}
```

Validation:

- Plan exists and active.
- Branch payload count does not exceed `plan_resource_limits` `BRANCHES` unless internal admin adds override.
- Franchise code is unique.
- Branch codes are unique per franchise.
- Existing `franchise_id`/`branch_id` must exist and be active.

### `src/lib/partner-program/platform/setup-task-generator.ts`

Purpose: generate setup tasks from selected features/capabilities.

Base tasks always generated:

- `franchise.exists`
- `branch.exists`
- `owner_staff_auth.exists`
- `subscription.active`
- `restaurant.confirmed`
- `nom.admin.approved`

Feature tasks:

- If `menu` or any `menu.*`: add `menu.catalog.ready`.
- If `qr`: add `qr.profile.resolves`.
- If `tables`: add `pos.tables.ready`.
- If `registers` or `table_orders`: add `pos.registers.ready`.
- If `payments`: add `payments.methods.ready`.
- If `inventory` or any `inventory.*`: add `inventory.foundation.ready`.
- For every selected required capability: add `capability.franchise.enabled`.
- For every selected branch-scoped capability: add `capability.branch.enabled` per branch.

Implementation signature:

```ts
export function buildSetupTasksForDeal(input: {
  dealId: string;
  franchiseId: string | null;
  branchIds: string[];
  selectedCapabilityCodes: string[];
}) {
  return [
    {
      taskKey: 'franchise.exists',
      label: 'Franchise exists and is active',
      platformArea: 'business_profile',
      requiredCapabilityCode: 'franchise',
      requiredFranchiseId: input.franchiseId,
      verificationQueryKey: 'franchise.exists',
      sortOrder: 10,
    },
  ];
}
```

### `src/lib/partner-program/platform/setup-verification.ts`

Purpose: run deterministic checks.

Each check returns:

```ts
export type VerificationResult = {
  status: SetupVerificationStatus;
  evidence: Record<string, unknown>;
  blockers: string[];
};
```

Required SQL checks:

#### `franchise.exists`

```sql
select id, name, code, status, primary_user_id
from public.franchises
where id = ${franchiseId}
  and status = 'ACTIVE'
limit 1
```

Pass when one row exists.

#### `branch.exists`

```sql
select id, name, code, franchise_id, status, timezone, currency_code, currency_symbol
from public.branches
where id = ${branchId}
  and franchise_id = ${franchiseId}
  and status = 'ACTIVE'
limit 1
```

Pass when one row exists.

#### `owner_staff_auth.exists`

```sql
select
  s.id as staff_id,
  s.status,
  asm.auth_user_id,
  sfr.role_id,
  r.is_owner,
  count(sba.id) filter (where sba.status = 'ACTIVE') as active_branch_assignments
from public.staff s
join public.auth_staff_mapping asm on asm.staff_id = s.id
join public.staff_franchise_roles sfr on sfr.staff_id = s.id and sfr.franchise_id = ${franchiseId}
join public.roles r on r.id = sfr.role_id
left join public.staff_branch_assignments sba on sba.staff_id = s.id
where s.id = (
  select primary_user_id from public.franchises where id = ${franchiseId}
)
group by s.id, s.status, asm.auth_user_id, sfr.role_id, r.is_owner
```

Pass when:

- `status = ACTIVE`
- `auth_user_id` exists
- `is_owner = true`
- branch assignment count is at least expected branch count.

#### `subscription.active`

```sql
select fs.id, fs.plan_id, sp.code, sp.name, fs.start_date, fs.end_date, fs.is_active
from public.franchise_subscriptions fs
join public.subscription_plans sp on sp.id = fs.plan_id
where fs.franchise_id = ${franchiseId}
  and fs.is_active = true
  and sp.is_active = true
  and (${requestedPlanId}::uuid is null or fs.plan_id = ${requestedPlanId})
limit 1
```

Pass when active row exists.

#### `capability.franchise.enabled`

```sql
select capability_code, source, updated_at
from public.authz_effective_franchise_capabilities
where franchise_id = ${franchiseId}
  and capability_code = ${capabilityCode}
  and is_enabled = true
limit 1
```

Pass when one row exists.

#### `capability.branch.enabled`

```sql
select capability_code, source, updated_at
from public.authz_effective_branch_capabilities
where branch_id = ${branchId}
  and franchise_id = ${franchiseId}
  and capability_code = ${capabilityCode}
  and is_enabled = true
limit 1
```

Pass when one row exists.

#### `menu.catalog.ready`

```sql
select
  (select count(*) from public.categories c where c.franchise_id = ${franchiseId} and c.is_active = true) as category_count,
  (select count(*)
   from public.menu m
   join public.menu_branch_mapping mbm on mbm.menu_item_id = m.id
   where m.franchise_id = ${franchiseId}
     and mbm.branch_id = ${branchId}
     and m.is_active = true
     and coalesce(m.is_deleted, false) = false
     and mbm.is_active = true
  ) as active_branch_item_count
```

Pass when:

- `category_count >= 1`
- `active_branch_item_count >= 1`

#### `qr.profile.resolves`

```sql
with branch_default as (
  select qbo.profile_id
  from public.qr_menu_branch_default_overrides qbo
  join public.qr_menu_profiles p on p.id = qbo.profile_id
  where qbo.branch_id = ${branchId}
    and qbo.franchise_id = ${franchiseId}
    and p.status = 'active'
  limit 1
),
franchise_default as (
  select qfd.profile_id
  from public.qr_menu_franchise_defaults qfd
  join public.qr_menu_profiles p on p.id = qfd.profile_id
  where qfd.franchise_id = ${franchiseId}
    and p.status = 'active'
  limit 1
),
active_schedule as (
  select s.profile_id
  from public.qr_menu_schedules s
  join public.qr_menu_profiles p on p.id = s.profile_id
  where s.franchise_id = ${franchiseId}
    and (s.branch_id = ${branchId} or s.branch_id is null)
    and s.is_active = true
    and p.status = 'active'
  limit 1
)
select
  (select profile_id from branch_default) as branch_default_profile_id,
  (select profile_id from franchise_default) as franchise_default_profile_id,
  (select profile_id from active_schedule) as active_schedule_profile_id
```

Pass when any profile id is present. This mirrors QR runtime priority:

1. branch schedule,
2. branch default override,
3. franchise schedule,
4. franchise default.

#### `pos.tables.ready`

```sql
select count(*) as table_count
from public.restaurant_tables
where branch_id = ${branchId}
```

Pass when `table_count >= expectedTableCount` or at least `1` when expected count is unknown.

#### `pos.registers.ready`

```sql
select count(*) as active_register_count
from public.registers
where branch_id = ${branchId}
  and status = 'ACTIVE'
```

Pass when count >= 1.

#### `payments.methods.ready`

```sql
select count(*) as active_payment_method_count
from public.payment_methods
where franchise_id = ${franchiseId}
  and is_active = true
  and is_deleted = false
```

Pass when count >= 1.

#### `inventory.foundation.ready`

```sql
select
  (select count(*) from public.warehouses where franchise_id = ${franchiseId} and status = 'ACTIVE') as warehouse_count,
  (select count(*) from public.suppliers where franchise_id = ${franchiseId} and is_active = true) as supplier_count,
  (select count(*) from public.raw_materials where franchise_id = ${franchiseId} and is_active = true) as raw_material_count
```

Pass when:

- `warehouse_count >= 1`
- `supplier_count >= 1`
- `raw_material_count >= 1`

If the deal selected inventory but the customer only bought a starter package where raw materials are not part of setup, make this manual-required by marking task `is_required_for_setup = false`.

### `src/lib/partner-program/platform/commission-eligibility.ts`

Purpose: approve commissions from platform facts.

Function:

```ts
export type CommissionEligibilityFacts = {
  leadAccepted: boolean;
  dealWonOrLive: boolean;
  hasLinkedFranchise: boolean;
  hasActiveSubscription: boolean;
  subscriptionMatchesDealPlan: boolean;
  platformValidationPassed: boolean;
  validationWindowPassed: boolean;
  setupApprovedWhenRequired: boolean;
  restaurantConfirmedWhenRequired: boolean;
  hasActiveDispute: boolean;
};

export function evaluatePlatformCommissionEligibility(facts: CommissionEligibilityFacts) {
  const blockers: string[] = [];
  if (!facts.leadAccepted) blockers.push('Lead is not accepted.');
  if (!facts.dealWonOrLive) blockers.push('Deal is not won/live.');
  if (!facts.hasLinkedFranchise) blockers.push('Deal is not linked to a platform franchise.');
  if (!facts.hasActiveSubscription) blockers.push('Franchise does not have an active subscription.');
  if (!facts.subscriptionMatchesDealPlan) blockers.push('Active subscription does not match the sold plan.');
  if (!facts.platformValidationPassed) blockers.push('Platform validation has not passed.');
  if (!facts.validationWindowPassed) blockers.push('Payment/subscription validation window has not passed.');
  if (!facts.setupApprovedWhenRequired) blockers.push('Setup approval is required and not complete.');
  if (!facts.restaurantConfirmedWhenRequired) blockers.push('Restaurant confirmation is required and not complete.');
  if (facts.hasActiveDispute) blockers.push('Commission has an active dispute.');

  return {
    eligible: blockers.length === 0,
    blockers,
  };
}
```

Data query:

```sql
select
  l.status = 'accepted' as lead_accepted,
  d.stage in ('won', 'setup_pending', 'setup_in_progress', 'live') as deal_won_or_live,
  d.franchise_id is not null as has_linked_franchise,
  exists (
    select 1 from public.franchise_subscriptions fs
    where fs.franchise_id = d.franchise_id
      and fs.is_active = true
      and (fs.end_date is null or fs.end_date >= current_date)
  ) as has_active_subscription,
  exists (
    select 1 from public.franchise_subscriptions fs
    where fs.franchise_id = d.franchise_id
      and fs.is_active = true
      and fs.plan_id = d.subscription_plan_id
  ) as subscription_matches_deal_plan,
  d.platform_validation_status in ('passed', 'manually_passed') as platform_validation_passed,
  c.eligible_at is not null and c.eligible_at <= now() as validation_window_passed,
  coalesce(sc.status = 'approved', true) as setup_approved_when_required,
  coalesce(sc.restaurant_confirmed, true) as restaurant_confirmed_when_required,
  exists (
    select 1 from public.partner_disputes pd
    where pd.commission_id = c.id
      and pd.status in ('open', 'under_review', 'needs_partner_response')
  ) as has_active_dispute
from public.partner_commissions c
left join public.partner_deals d on d.id = c.deal_id
left join public.partner_leads l on l.id = c.lead_id
left join public.partner_setup_checklists sc on sc.id = c.setup_checklist_id
where c.id = ${commissionId}
limit 1
```

### Modify `src/app/actions/admin.ts`

Add parsing for platform fields:

- `platformLinkKind`
- `existingFranchiseId`
- `existingBranchId`
- `duplicateOfLeadId`
- `subscriptionPlanId`
- `selectedCapabilityCodes`
- `targetBranchIds`

Every action must:

- call `requirePartnerAdmin('/admin/...')`,
- validate inputs with zod or strict manual checks,
- redirect with encoded error on failure,
- revalidate impacted admin and partner routes.

### Modify `src/app/admin/leads/page.tsx`

Add UI blocks per lead:

- Platform match badge:
  - kind,
  - confidence,
  - linked franchise/branch if present,
  - duplicate lead if present.
- Admin decision form fields:
  - status,
  - platform link kind,
  - existing franchise selector if platform match exists,
  - existing branch selector if platform match exists,
  - duplicate lead id hidden/select,
  - note.

If `platform_match_confidence >= 80`, show destructive warning before accepting as new customer.

### Modify `src/app/admin/deals/page.tsx`

Add:

- Plan selector from `listActivePlatformPlans()`.
- Capability checklist from `listPlatformCapabilities()`.
- Feature/plan coverage indicator:
  - plan includes feature,
  - plan does not include feature,
  - branch override required.
- Existing platform link summary:
  - franchise,
  - branch,
  - subscription.
- Buttons:
  - `Save platform scope`
  - `Create onboarding request`
  - `Link existing platform customer`
  - `Run platform validation`

Do not allow `stage = won` submission unless:

- `subscription_plan_id` is set,
- platform link kind is resolved,
- either existing platform link exists or onboarding request exists.

### Modify `src/app/admin/setup/page.tsx`

Add:

- Platform area grouping.
- Auto/manual verification status.
- Evidence JSON summary rendered as readable facts.
- `Run verification` action per task and checklist.
- `Manual pass/fail` action for manual-required tasks only.
- Block `approved` unless required tasks are passed/manually passed and restaurant confirmation is true.

### Modify `src/app/admin/commissions/page.tsx`

Add:

- Eligibility facts table.
- Blockers list.
- Disable/hide `approved` option if `eligible = false`; if still shown, server action must reject.
- Show linked franchise/branch/subscription.

### Modify Partner-Facing Pages

Partner portal should show platform truth transparently:

- `/partner/deals`: linked franchise/branch and setup state.
- `/partner/setup`: task verification statuses and evidence summary.
- `/partner/commissions`: blockers and eligibility date.

Do not show internal admin notes or service errors.

## Internal Dashboard Blueprint

### Required Internal Dashboard Architecture Change

Before adding partner execution, stop passing service-role keys from client headers for new routes. Existing `useOnboarding.ts` sends `x-supabase-service-role`; the clean target architecture must use server-only environment variables inside API routes.

For partner integration, new internal routes must:

- read `SUPABASE_SERVICE_ROLE_KEY` from server env only,
- never accept service-role key from the browser,
- authenticate internal admin according to the dashboard’s admin model,
- log actor identity where available.

### New Internal Routes

Create:

- `src/app/api/partner-onboarding-requests/route.ts`
- `src/app/api/partner-onboarding-requests/[id]/route.ts`
- `src/app/api/partner-onboarding-requests/[id]/execute/route.ts`
- `src/app/api/partner-onboarding-requests/[id]/approve/route.ts`
- `src/app/api/partner-onboarding-requests/[id]/cancel/route.ts`

Execution route algorithm:

1. Load request by id.
2. Require status `approved_for_creation`.
3. If `link_kind` is existing:
   - validate existing franchise/branch,
   - update request to `linked_existing`,
   - update `partner_deals` linkage,
   - insert attribution row.
4. If `link_kind = new_platform_customer`:
   - set request `creation_in_progress`.
   - create Supabase Auth user using service role.
   - generate secure temporary password.
   - call `public.onboard_franchise_owner` with:
     - created auth user id,
     - owner email,
     - generated password,
     - owner names,
     - franchise payload,
     - phone,
     - requested plan id.
   - if RPC returns `success = false`, rollback Auth user and mark failed.
   - if success, update request with `created_auth_user_id`, `created_staff_id`, `created_franchise_id`, `created_branch_ids`.
   - update `partner_deals.franchise_id`, `partner_deals.branch_id`, `partner_deals.subscription_plan_id`, `onboarding_request_id`.
   - insert `partner_platform_attributions`.
   - set request `created`.

### Internal Dashboard Pages

Create:

- `src/app/internal/partner-onboarding/page.tsx`
- `src/app/internal/partner-onboarding/[id]/page.tsx`

Add nav item in:

- `src/app/internal/layout.tsx`

Add partner attribution sections to:

- `src/app/internal/franchises/[id]/page.tsx`
- `src/app/internal/owners/[id]/page.tsx`
- optionally `src/app/internal/owners/page.tsx`

### Internal Dashboard Hooks

Create:

- `src/hooks/usePartnerOnboardingRequests.ts`
- `src/hooks/usePartnerAttributions.ts`

Queries:

- List queue by status.
- Load request detail with lead, deal, partner profile.
- Approve/cancel/execute mutation.
- Load attribution by franchise id.
- Load attribution by branch id.

### Internal Dashboard Acceptance Criteria

- Internal admin can see partner-attributed onboarding requests.
- Internal admin can approve or cancel a request.
- Internal admin can execute a new restaurant request using existing onboarding RPC.
- Internal admin can link existing franchise/branch without creating duplicates.
- Franchise detail shows partner attribution.
- Owner detail shows partner attribution.
- Service role never crosses browser boundary in new routes.

## RMS Blueprint

No broad RMS implementation is required for phase one because RMS already consumes the right platform tables. The integration must respect these existing RMS facts:

- Owner login requires `auth_staff_mapping`.
- Staff access requires `staff_franchise_roles`.
- Branch access requires `staff_branch_assignments`.
- Runtime feature access requires effective authz capability views.
- Role action grants are enforced through `requireCapability`.

Optional later RMS read-only surface:

- Add partner attribution card to a franchise/settings page, guarded by `franchise/manage`.
- Do not allow RMS staff to modify partner payout/commission records.

## QR Blueprint

No broad QR rewrite is required. The partner setup verifier should read QR source-of-truth tables:

- `qr_menu_profiles`
- `qr_menu_schedules`
- `qr_menu_franchise_defaults`
- `qr_menu_branch_default_overrides`

QR runtime fails loudly if no active profile can be resolved. Partner verification must match that logic and should not invent fallback rules.

If a setup partner creates QR profiles through QR portal:

- The staff user must exist.
- The staff user must have franchise access.
- Profile must be active.
- Franchise default or branch override must be set.
- Menu items must exist and be branch-mapped if QR menu is sold.

## Platform Onboarding Request JSON Shape

`franchise_payload`:

```json
{
  "name": "Cafe Demo",
  "code": "CAFE-DEMO",
  "owner_name": "Raf Demo",
  "contact_email": "owner@example.com",
  "contact_phone": "+919999999999"
}
```

`branches_payload`:

```json
[
  {
    "name": "Main Branch",
    "code": "CAFE-DEMO-MAIN",
    "address": "123 Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "postal_code": "400001",
    "number_of_tables": 10,
    "timezone": "Asia/Kolkata",
    "currency_code": "INR",
    "currency_symbol": "₹",
    "opening_time": "09:00",
    "closing_time": "23:00",
    "is_primary": true
  }
]
```

Before calling the RPC, transform to the internal dashboard RPC structure:

```ts
const franchises = [
  {
    name: request.franchise_payload.name,
    code: request.franchise_payload.code,
    owner_name: request.franchise_payload.owner_name,
    contact_email: request.franchise_payload.contact_email,
    contact_phone: request.franchise_payload.contact_phone,
    branches: request.branches_payload,
  },
];
```

## Exact Implementation Order

### Phase 1: Schema Files Only

1. Add SQL migration file from the migration blueprint.
2. Do not run it.
3. Add TypeScript types that assume new columns exist.
4. Add database contract tests that parse expected table/column names from SQL.

Completion gate:

- SQL file exists.
- SQL file contains no destructive drops.
- SQL file contains RLS policies.
- SQL file contains indexes for queue views.

### Phase 2: Read-Only Platform Catalog

1. Add `platform/catalog.ts`.
2. Add tests for plan/capability normalization using mocked `SqlExecutor`.
3. Update admin dashboard data loader to include platform plans/features.
4. Render plan/capability selectors in admin deals page.

Completion gate:

- Deals page shows live plans.
- Deals page shows capability choices.
- No hard-coded final deal plan.

### Phase 3: Lead Reconciliation

1. Add `platform/reconciliation.ts`.
2. Add unit tests for:
   - exact phone duplicate,
   - exact email existing franchise,
   - name/city weak match,
   - no match new prospect.
3. Call reconciliation after lead insert.
4. Show match evidence in admin lead review.
5. Require explicit admin platform decision on accept.

Completion gate:

- Accepted lead records platform link kind.
- Duplicate lead stores duplicate id.
- Existing customer link stores franchise/branch id.

### Phase 4: Onboarding Request Lifecycle

1. Add `platform/onboarding-requests.ts`.
2. Add admin actions to create/link/approve request.
3. Add admin deal UI for request creation.
4. Add internal dashboard queue pages and execute route.
5. Execution route calls `onboard_franchise_owner`.

Completion gate:

- New customer path creates request, not immediate platform records from partner app.
- Internal dashboard can execute request.
- Deal receives resulting platform IDs.

### Phase 5: Setup Verification

1. Add `setup-task-generator.ts`.
2. Add `setup-verification.ts`.
3. Generate tasks from selected capabilities.
4. Add `Run verification` admin action.
5. Update setup page to show evidence.

Completion gate:

- QR setup can only pass when QR runtime facts exist.
- Menu setup can only pass when menu facts exist.
- Staff setup can only pass when owner/staff auth facts exist.

### Phase 6: Commission Eligibility

1. Add `commission-eligibility.ts`.
2. Update commission review action to compute blockers before approval.
3. Show blockers on admin and partner pages.
4. Move commission from `estimated` to `pending` only when platform linkage exists.
5. Approve only when eligibility passes.

Completion gate:

- Admin cannot approve blocked commission.
- Commission evidence explains every blocker.

### Phase 7: Internal Dashboard Attribution

1. Add attribution hooks/pages.
2. Add franchise/owner detail attribution cards.
3. Add metrics:
   - partner-attributed franchises,
   - partner-attributed active subscriptions,
   - partner-attributed branches,
   - setup pass/fail,
   - pending commissions.

Completion gate:

- Internal admin can audit partner impact without opening affiliate app.

### Phase 8: Hardening

1. Add audit events for every platform link/request/verification/commission decision.
2. Add idempotency checks.
3. Ensure `getDatabase()` uses singleton connection config and does not leak clients.
4. Add exhaustive tests.
5. Run allowed validations only; do not run Playwright.

Completion gate:

- Typecheck passes.
- Lint passes.
- Unit/integration tests pass.
- No Playwright invoked.

## Test Plan

Do not run Playwright tests.

### Unit Tests

Add tests under `tests/partner-program/platform/`.

Files:

- `catalog.test.ts`
- `reconciliation.test.ts`
- `setup-task-generator.test.ts`
- `setup-verification.test.ts`
- `commission-eligibility.test.ts`

Required cases:

- Plan catalog returns active plans only.
- Capability catalog preserves `scope_kind` and `supports_branch_override`.
- Lead reconciliation classifies duplicate phone.
- Lead reconciliation classifies existing franchise by email.
- Lead reconciliation classifies existing branch by name/city.
- Lead reconciliation returns new customer when no match.
- Setup generator always includes base tasks.
- Setup generator adds QR task when `qr` selected.
- Setup generator adds inventory task when `inventory` selected.
- Commission eligibility returns blockers for missing franchise.
- Commission eligibility returns blockers for inactive subscription.
- Commission eligibility passes when all facts are true.

### Server Action Tests

Use mocked auth/database functions.

Cases:

- `reviewLeadAction` rejects missing platform decision on accepted lead.
- `updateDealStageAction` rejects `won` without plan id.
- `reviewCommissionAction` rejects approve when eligibility false.

### SQL Contract Tests

Do not run migrations. Static checks are enough until DB application is explicitly requested.

Cases:

- SQL file defines `partner_platform_onboarding_requests`.
- SQL file defines `partner_platform_attributions`.
- SQL file alters `partner_deals` with `onboarding_request_id`.
- SQL file alters `partner_setup_tasks` with `verification_query_key`.
- SQL file enables RLS on new tables.
- SQL file does not include `drop table`.

### Manual Validation After Migration Is Applied

Only after DB schema is applied:

```sql
select key from public.partner_setup_verification_rules order by sort_order;
select count(*) from public.partner_platform_onboarding_requests;
select count(*) from public.partner_platform_attributions;
```

Application validations:

- `npm run typecheck` if configured.
- `npm run lint` if configured.
- `npm test` or scoped unit test command if configured.
- Do not run any command that invokes Playwright.

## Failure Modes And Required Behavior

| Failure | Required behavior |
| --- | --- |
| Supabase Auth user created but onboarding RPC fails | Roll back Auth user, mark request `failed`, store error |
| Existing franchise link is inactive | Reject link and show admin blocker |
| Branch does not belong to franchise | Reject link |
| Requested plan inactive | Reject onboarding request |
| Selected capability not active | Reject deal scope |
| QR sold but no active QR profile/default | Setup verification fails |
| Menu sold but no active branch menu items | Setup verification fails |
| Commission approval attempted before platform validation | Server rejects approval |
| Duplicate lead accepted as new | Server rejects unless admin override is explicitly modeled |
| Service role missing in internal execute route | Fail loudly with config error |

## Done Means 100%

The vision is complete only when all of these are true:

- [x] Partner lead intake automatically reconciles against partner pipeline and platform records.
- [x] Admin lead review shows match evidence and requires platform decision.
- [x] Accepted lead creates a deal with resolved platform link kind.
- [x] Deal scope uses live `subscription_plans` and capabilities.
- [x] New customer deals create onboarding requests.
- [x] Existing customer deals link to `franchises`/`branches`.
- [x] Internal dashboard can approve/execute onboarding requests.
- [x] Onboarding execution calls `public.onboard_franchise_owner`.
- [x] Deal records resulting `franchise_id`, `branch_id`, and `subscription_plan_id`.
- [x] Partner attribution rows are created.
- [x] Setup tasks are generated from selected platform scope.
- [x] Setup verification checks actual franchise, branch, auth, subscription, capability, menu, QR, POS, payment, inventory facts.
- [x] Partner setup page shows verification state.
- [x] Admin setup page blocks approval until required facts pass.
- [x] Commission eligibility uses platform facts and blockers.
- [x] Admin commission page blocks invalid approvals server-side.
- [x] Internal dashboard owner/franchise pages show partner attribution.
- [x] Tests cover catalog, reconciliation, onboarding lifecycle, setup verification, commission eligibility.
- [x] Documentation names every owning system and every source-of-truth table.
- [x] No browser code receives service-role secrets in the partner onboarding queue.
- [x] No Playwright tests are run for this work.
