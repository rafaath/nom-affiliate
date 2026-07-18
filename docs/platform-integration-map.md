# Nom Partner Program Platform Integration Map

This document captures the current macro/micro understanding of how the partner program must connect to the existing Nom platform. It is intentionally platform-native: partner work should not live as an isolated CRM when RMS, QR, subscriptions, plans, features, onboarding, and internal administration already exist.

For the file-by-file implementation blueprint, SQL design, verification rules, and test matrix, see `docs/platform-integration-implementation-blueprint.md`.

## Source Systems Reviewed

- `affiliate`: standalone partner program app.
- `rms_all/dev`: RMS product surface, staff auth, feature gating, POS, menu, inventory, billing, subscriptions, branch/franchise operations.
- `qr/nomnom`: QR menu, QR portal, public menu/runtime, online website, loyalty, table gate, games/events, QR payment settings.
- `Internaldashboard/internaldashboardrms`: internal control plane for plans, features, franchises, owners, branch feature overrides, onboarding, QR/game/platform admin surfaces.
- Supabase dev database `wuryzsyfytlbrysfnwtj`: source of truth for live tables, enums, relationships, and RPC functions.

## Platform Backbone

The real platform is centered on these records:

- `franchises`: restaurant/franchise account root. Important fields include `name`, `code`, `owner_name`, `contact_email`, `contact_phone`, `primary_user_id`, `gst_registration_type`.
- `branches`: physical/online outlet records. Important fields include `franchise_id`, `name`, `code`, `number_of_tables`, `branch_kind`, address/timezone/currency, `restaurant_type`, `gst_liability`.
- `staff`: RMS/portal staff identity. Franchise owners are staff records, usually linked through `franchises.primary_user_id`.
- `auth_staff_mapping`: Supabase Auth user to RMS `staff.id`.
- `staff_franchise_roles`: staff role per franchise.
- `staff_branch_assignments`: branch access and primary branch assignment.
- `subscription_plans`: plan catalog.
- `franchise_subscriptions`: active subscription assignment per franchise.
- `features`, `plan_features`, `plan_resource_limits`: plan capability and quota model.
- `franchise_feature_overrides`, `franchise_resource_overrides`: franchise-specific overrides.
- `branch_feature_mappings`: branch-level overrides.
- `authz_effective_franchise_capabilities`, `authz_effective_branch_capabilities`: runtime capability source used by RMS.

The dev database currently has 2 subscription plans, 30 features, 8 franchises, 16 branches, and partner tables installed.

## Existing Onboarding Source Of Truth

Internal dashboard onboarding already performs real platform creation through:

- API route: `Internaldashboard/internaldashboardrms/src/app/api/onboard-franchise-owner/route.ts`
- RPC: `public.onboard_franchise_owner(...)`

That flow:

1. Creates a Supabase Auth user.
2. Calls `onboard_franchise_owner`.
3. Creates `franchises`.
4. Creates `franchise_subscriptions`.
5. Creates `branches`.
6. Creates `staff`.
7. Sets `franchises.primary_user_id`.
8. Creates `auth_staff_mapping`.
9. Creates `staff_franchise_roles`.
10. Creates `staff_branch_assignments`.

This is the platform-native “restaurant becomes real” workflow. Partner deals should link into this flow instead of treating “won” as only a partner CRM stage.

## Existing RMS Access Model

RMS uses staff context and capability gating:

- RMS auth context loads `auth_staff_mapping`, `staff`, franchise roles, branch assignments, selected franchise, selected branch.
- RMS calls `getEnabledCapabilities(franchiseId)` and `getBranchCapabilityStates(branchId)`.
- Feature access is enforced through `requireCapability(...)` and `assertAuthorized(...)`.
- Navigation modules come from effective capabilities, not static partner product labels.

Implication: partner-sold “products” must map to actual `features` and `subscription_plans`, because those drive real RMS access.

## Existing QR / Portal Model

QR/portal is also platform-native:

- Portal auth uses `staff.generated_password`, `staff_franchise_roles`, and selected franchise cookies.
- Portal access validates staff-to-franchise access.
- QR profile management writes to:
  - `qr_menu_profiles`
  - `qr_menu_schedules`
  - `qr_menu_franchise_defaults`
  - `qr_menu_branch_default_overrides`
  - `qr_menu_marketplace_installations`
  - QR game/content tables
- QR public runtime resolves active branch profile by this priority:
  1. Branch schedule.
  2. Branch default override.
  3. Franchise-wide schedule.
  4. Franchise default profile.

Implication: a partner “QR setup” checklist should verify real QR state: profile exists, active/published, set as franchise or branch default, and branch runtime can resolve it.

## Existing Internal Dashboard Control Plane

Internal dashboard already manages:

- Plans: `subscription_plans`.
- Plan-feature matrix: `plan_features`.
- Plan limits: `plan_resource_limits`.
- Franchise overrides: `franchise_feature_overrides`, `franchise_resource_overrides`.
- Branch feature controls: `branch_feature_mappings`.
- Owners/franchises/branches overview.
- Franchise owner onboarding.
- QR curated pages, games, AI generation costs, OTP provider settings, Nom app install incentives, rate limits.

Implication: partner admin should not duplicate internal dashboard ownership. It should either:

1. Link into internal dashboard records and state; or
2. Create a partner-attributed request queue that internal dashboard/admin workflows can execute.

## Current Affiliate App State

The affiliate app is solid as a standalone partner portal:

- Partner applications/profiles.
- Partner lead submission.
- Lead admin review.
- Deal pipeline.
- Setup checklist.
- Commissions.
- Payouts.
- Disputes.
- Admin review pages.

The database already has some platform hooks:

- `partner_leads.existing_franchise_id -> franchises.id`
- `partner_leads.existing_branch_id -> branches.id`
- `partner_deals.franchise_id -> franchises.id`
- `partner_deals.branch_id -> branches.id`
- `partner_deals.subscription_plan_id -> subscription_plans.id`

But the app does not yet fully use them as the source of truth.

## Critical Mismatch

The current affiliate flow treats “accepted/won/live/setup approved” mostly as partner-program state. The real platform treats restaurant success as:

- franchise exists,
- owner/staff auth exists,
- branches exist,
- plan is assigned,
- features are enabled,
- QR/menu/POS/inventory/staff configuration exists,
- restaurant can actually operate in RMS/QR,
- payments/subscriptions/usage can be validated.

Therefore, partner commission eligibility cannot be based only on admin stage transitions. It must be based on platform facts.

## Required Target Architecture

### 1. Lead Intake Must Reconcile Against Platform Entities

When a partner submits a restaurant lead:

- Normalize restaurant name, phone, email, city, locality.
- Search partner leads for duplicate ownership conflicts.
- Search `franchises` and `branches` for existing platform customers.
- Store match result:
  - new prospect,
  - existing customer,
  - existing branch,
  - already in pipeline,
  - duplicate partner claim.
- Populate `existing_franchise_id` / `existing_branch_id` when matched.
- Admin lead review should show platform match evidence, not just free-text notes.

### 2. Products Sold Must Come From Real Plans And Features

Partner forms should not rely on static product strings such as `qr_menu`, `qr_ordering`, `pos`, `inventory`.

They should load:

- active `subscription_plans`,
- active `features`,
- plan-feature mapping,
- branch-level feature capability metadata.

The partner can express interest in product families, but admin deal close must resolve to:

- `subscription_plan_id`,
- selected feature set,
- branch rollout scope,
- setup checklist template based on actual features.

### 3. Won Deal Must Link To Platform Onboarding

When a deal is marked “won”, one of two things must happen:

- Existing customer: link `partner_deals.franchise_id` / `branch_id` to the existing platform records.
- New customer: create a controlled onboarding request that can call or mirror `onboard_franchise_owner`.

The safest architecture is a partner-attributed onboarding request queue, not direct immediate creation from arbitrary partner/admin clicks.

Recommended new concept:

- `partner_platform_onboarding_requests`
  - `partner_id`
  - `lead_id`
  - `deal_id`
  - `requested_plan_id`
  - owner payload
  - franchise payload
  - branch payload
  - requested features
  - status: `draft`, `ready_for_internal_review`, `approved_for_creation`, `created`, `failed`, `cancelled`
  - resulting `auth_user_id`, `staff_id`, `franchise_id`, `branch_ids`
  - error/audit metadata

Internal dashboard can then execute or review this request using the same platform onboarding pathway.

### 4. Setup Checklist Must Be Platform-Aware

Setup tasks should not be generic labels only. They should map to actual platform areas:

- Owner/staff created: `auth_staff_mapping`, `staff`, `staff_franchise_roles`.
- Franchise created: `franchises`.
- Branches created: `branches`.
- Plan active: `franchise_subscriptions`.
- Feature access active: `authz_effective_franchise_capabilities`.
- Branch feature state active: `authz_effective_branch_capabilities` / `branch_feature_mappings`.
- Menu setup: `categories`, `menu`, `menu_branch_mapping`, modifier/tax/charge/discount tables.
- QR setup: `qr_menu_profiles`, `qr_menu_franchise_defaults`, `qr_menu_branch_default_overrides`, `qr_menu_schedules`.
- POS setup: tables, sections, billing types, registers, payment methods, print templates.
- Staff setup: staff users, roles, branch assignments.
- Inventory setup: materials, suppliers, warehouses, recipes, units where applicable.
- Payments/QR payment setup: `payment_methods`, `branch_online_payment_configs`.
- Loyalty/customer features where included.

Recommended task fields:

- `task_key`
- `platform_area`
- `required_feature_code`
- `required_table`
- `required_entity_id`
- `verification_query_key`
- `auto_verified_at`
- `manual_verified_by`
- `evidence`

### 5. Commission Eligibility Must Use Platform Facts

Commission should become eligible only when the relevant platform state is true.

Examples:

- Referral commission:
  - lead accepted,
  - linked franchise exists,
  - active subscription exists,
  - validation window passed,
  - customer is not refunded/cancelled/invalid.
- Setup commission:
  - setup checklist submitted,
  - required feature setup is auto/manually verified,
  - restaurant confirms setup,
  - Nom admin approves.
- Sales/full-service commission:
  - deal linked to subscription plan,
  - franchise subscription active,
  - initial payment/subscription validation passed.
- Add-on commission:
  - feature/add-on enabled in effective capabilities,
  - branch/franchise scope matches sold add-on,
  - payment/add-on activation validated if applicable.

### 6. Internal Dashboard Must See Partner Attribution

Internal dashboard should eventually show:

- partner-attributed franchises,
- partner-attributed branches,
- partner-attributed active plans,
- partner-attributed onboarding requests,
- partner influence on revenue,
- setup status by platform area,
- partner quality/churn/refund flags.

The internal dashboard is already the right place for plan/feature/owner/franchise admin; partner admin should not become a second disconnected source of truth.

### 7. Affiliate Admin Should Become Partner Operations, Not Full Platform Admin

Affiliate admin should manage:

- partner applications,
- lead quality,
- partner deal attribution,
- setup assignment/review,
- commission/payout/dispute lifecycle.

Internal dashboard should manage:

- plans,
- features,
- capability matrix,
- owners/franchises/branches,
- platform onboarding,
- platform configuration controls.

The bridge between them should be explicit platform links and onboarding requests.

## Concrete Gaps To Close

- Load live `subscription_plans` and `features` in affiliate admin deal UI.
- Add platform match/reconciliation to lead review.
- Add platform onboarding request model.
- Link partner deal close to onboarding request or existing platform records.
- Replace generic setup tasks with feature/platform-aware tasks.
- Add auto-verification queries for QR/menu/POS/inventory/staff/payment setup.
- Compute commissions from platform state, not just admin stage transitions.
- Surface partner attribution in internal dashboard owners/franchises/branches views.
- Add docs explaining which system owns which responsibility.
- Add tests for platform reconciliation, onboarding request lifecycle, setup auto-verification, and commission eligibility.

## Decision

The affiliate system should not be considered 100% complete until it is platform-native. The current implementation is a strong standalone v1 shell, but the target architecture requires explicit integration with RMS, QR, subscriptions, plans, features, onboarding, and internal dashboard operations.

## Implementation Status

The platform-native bridge is now implemented in code:

- Affiliate SQL migration file: `supabase/migrations/20260524090000_partner_platform_integration.sql`.
- Affiliate platform bridge modules: `src/lib/partner-program/platform/*`.
- Affiliate admin review surfaces: `/admin/leads`, `/admin/deals`, `/admin/onboarding`, `/admin/setup`, `/admin/commissions`.
- Internal dashboard queue: `/internal/partner-onboarding`.
- Internal dashboard server routes: `/api/internal/partner-onboarding`, `/api/internal/partner-onboarding/[id]/approve`, `/api/internal/partner-onboarding/[id]/reject`, `/api/internal/partner-onboarding/[id]/execute`.
- Internal attribution route and hooks: `/api/internal/partner-attributions`, `usePartnerAttributions`.
