# Nom Partner Program Completion Checklist

This checklist tracks completion against `nom_affiliate_partner_program_prd.md`.

## Foundation

- [x] Standalone `affiliate` app scaffolded.
- [x] Latest verified Next.js, React, Supabase, TanStack Query, Vitest, and Playwright package versions pinned.
- [x] Turbopack configured for dev/build.
- [x] Strict TypeScript and ESLint configured.
- [x] Tailwind v4 and shadcn-style component system configured.
- [x] Supabase Auth and database env validation fails loudly.
- [x] Security headers configured.
- [x] Health endpoint implemented.

## Database

- [x] SQL migration file created only; not executed.
- [x] Partner profiles and applications modeled.
- [x] Referral codes modeled.
- [x] Training progress and resources modeled.
- [x] Leads and lead events modeled.
- [x] Deals and deal events modeled.
- [x] Setup checklists and setup tasks modeled.
- [x] Commission rules and commission lifecycle modeled.
- [x] Payout methods, batches, and items modeled.
- [x] Disputes modeled.
- [x] Notifications modeled.
- [x] Audit events modeled.
- [x] RLS enabled for all partner tables.
- [x] Partner self-access policies written.
- [x] Admin full-access policies written.
- [x] Default v1 commission rules seeded.
- [x] Default partner resources seeded.

## Public Experience

- [x] Public landing page explains what partners sell.
- [x] Public landing page explains who partners sell to.
- [x] Public landing page explains how partners earn.
- [x] Public landing page explains partner types.
- [x] Public landing page explains support, rules, trust, and workflow.
- [x] Application page captures PRD signup fields.
- [x] Login page implemented.
- [x] Supabase Auth callback implemented.

## Partner Portal

- [x] Partner dashboard home implemented.
- [x] Earnings summary implemented.
- [x] Main action shortcuts implemented.
- [x] Deal pipeline preview implemented.
- [x] Partner tier/status card implemented.
- [x] Onboarding checklist implemented.
- [x] Referral code visibility implemented.
- [x] Lead registration form implemented.
- [x] Lead status list implemented.
- [x] Deal tracking page implemented.
- [x] Setup checklist page implemented.
- [x] Commission tracking page implemented.
- [x] Payout details collection implemented.
- [x] Resource center implemented.
- [x] Notifications page implemented.

## Admin Console

- [x] Admin route guard implemented.
- [x] Metrics dashboard implemented.
- [x] Partner review queue implemented.
- [x] Lead review queue implemented.
- [x] Deal management implemented.
- [x] Setup review implemented.
- [x] Commission review implemented.
- [x] Payout batch creation implemented.
- [x] Dispute resolution implemented.
- [x] Audit insert points added for key admin actions.

## Business Logic

- [x] Referral code normalization/generation implemented.
- [x] Lead duplicate identity scoring implemented.
- [x] Lead status transition rules implemented.
- [x] Deal stage transition rules implemented.
- [x] Setup status transition rules implemented.
- [x] Commission status transition rules implemented.
- [x] Commission amount calculation implemented.
- [x] Referral commission eligibility implemented.
- [x] Setup commission eligibility implemented.
- [x] 90-day accepted lead ownership default implemented.
- [x] 30-day v1 validation default implemented.

## Tests

- [x] Referral code unit tests.
- [x] Duplicate detection unit tests.
- [x] Commission logic unit tests.
- [x] Status machine unit tests.
- [x] Status badge component tests.
- [x] Public landing E2E smoke test.
- [x] SQL/RLS contract test outline added.

## Documentation

- [x] README added.
- [x] Environment setup documented.
- [x] Database migration policy documented.
- [x] Validation commands documented.
- [x] Completion checklist documented.

## Platform Integration Alignment

The initial checklist completed the standalone partner-program shell. After reviewing RMS, QR, internal dashboard, and the live dev database, the true vision requires deeper platform-native integration before the program can be called 100% complete.

- [x] Cross-codebase platform discovery completed.
- [x] Live Supabase dev schema inspected for franchises, branches, plans, features, subscriptions, QR, internal admin, and partner tables.
- [x] Existing platform onboarding source of truth identified: `public.onboard_franchise_owner`.
- [x] Existing plan/feature source of truth identified: `subscription_plans`, `features`, `plan_features`, `franchise_subscriptions`, effective capability views.
- [x] Existing QR setup source of truth identified: `qr_menu_profiles`, `qr_menu_schedules`, `qr_menu_franchise_defaults`, `qr_menu_branch_default_overrides`.
- [x] Integration map documented in `docs/platform-integration-map.md`.
- [x] Deep implementation blueprint documented in `docs/platform-integration-implementation-blueprint.md`.
- [x] Partner lead review reconciles against existing `franchises` and `branches`.
- [x] Affiliate deal UI loads live `subscription_plans` and `features`.
- [x] Partner deal close links to existing platform records or a platform onboarding request.
- [x] Platform onboarding request table and lifecycle modeled in SQL.
- [x] Internal dashboard can see partner-attributed onboarding requests.
- [x] Setup checklist tasks map to real platform areas, tables, and feature codes.
- [x] Setup tasks support automatic platform-state verification.
- [x] QR setup verification checks active profile/default/schedule state.
- [x] Menu setup verification checks actual menu/category/branch mapping state.
- [x] Staff setup verification checks `staff`, roles, and branch assignments.
- [x] Subscription validation checks `franchise_subscriptions` and active plan state.
- [x] Commission eligibility uses platform source-of-truth state, not only admin stage transitions.
- [x] Internal dashboard owner/franchise/branch views expose partner attribution.
- [x] Tests cover lead reconciliation, platform onboarding request lifecycle, setup verification, and platform-based commission eligibility.
