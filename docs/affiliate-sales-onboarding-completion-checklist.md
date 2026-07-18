# Affiliate Sales Onboarding Completion Checklist

This checklist tracks the missing affiliate-facing sales workflow that must sit in front of the RMS/internal-dashboard provisioning flow. It is intentionally product-complete: the affiliate chooses what the restaurant wants, Nom/admin approves or overrides it, and RMS provisioning/commissions use only approved platform facts.

## Completion Standard

- [x] Affiliate can see active RMS subscription plans before submitting a restaurant lead.
- [x] Affiliate can see active RMS features/modules before submitting a restaurant lead.
- [x] Affiliate can select the restaurant's intended plan.
- [x] Affiliate can select requested modules/add-ons/features.
- [x] Affiliate can specify the intended branch/outlet count.
- [x] Affiliate sees a package summary before submission.
- [x] Affiliate sees a commission preview before submission.
- [x] Submitted lead stores affiliate-requested plan, features, branch count, package summary, revenue estimate, and commission preview.
- [x] Submitted lead stores restaurant handoff fields required for RMS provisioning: legal name, owner contact, branch address, state, country, postal code, timezone, GST/registration context.
- [x] Admin review shows affiliate-requested package clearly.
- [x] Admin review can approve the requested package as-is.
- [x] Admin review can override requested plan/features/branch count with approved values.
- [x] Deals preserve both affiliate-requested package and admin-approved package.
- [x] Onboarding requests preserve both affiliate-requested package and admin-approved package.
- [x] Internal dashboard onboarding queue shows affiliate context, requested package, approved package, branch details, and missing execution requirements.
- [x] RMS provisioning uses the approved plan and approved capabilities only.
- [x] Affiliate portal shows lead package status, duplicate/existing-customer match status, and review decision.
- [x] Affiliate portal shows onboarding request status after admin/internal-dashboard actions.
- [x] Affiliate portal setup view explains missing RMS blockers in plain language.
- [x] Commission approval is based on approved/activated platform facts, not the affiliate's requested package alone.
- [x] Unit/contract tests verify package calculation, requested-vs-approved schema, and migration coverage.
- [x] Documentation explains the smoke path and expected outcomes without Playwright.

## Implementation Phases

### Phase 1 — Requested Package Model

- [x] Add DB columns for affiliate-requested package fields on `partner_leads`.
- [x] Add DB columns for affiliate-requested package snapshot on `partner_deals`.
- [x] Add DB columns for affiliate-requested package context on `partner_platform_onboarding_requests`.
- [x] Extend schema readiness checks to fail loudly when the package migration is missing.
- [x] Add tests that assert requested/approved fields exist in migration files.

### Phase 2 — Affiliate-Facing Selection

- [x] Load active RMS plans/features for authenticated partners.
- [x] Render plan selector on `/partner/leads`.
- [x] Render feature/module selector on `/partner/leads`.
- [x] Render branch-count selector on `/partner/leads`.
- [x] Render package summary and commission preview.
- [x] Validate selected plan/features server-side against RMS source-of-truth tables.
- [x] Store package snapshot with the submitted lead.

### Phase 3 — Handoff Data Collection

- [x] Require owner email for onboarding-capable referrals.
- [x] Collect legal/business name.
- [x] Collect primary branch address.
- [x] Collect state/country/postal code/timezone.
- [x] Collect GST/registration context.
- [x] Pass handoff fields into onboarding requests and internal dashboard execution payloads.

### Phase 4 — Admin Approval Layer

- [x] Show affiliate-requested package on admin lead review.
- [x] Default admin approval controls to affiliate-requested values.
- [x] Preserve affiliate-requested values when admin overrides approved values.
- [x] Show requested vs approved values on deal management.
- [x] Carry requested vs approved values into onboarding request metadata.

### Phase 5 — Affiliate Visibility

- [x] Show requested package on partner lead list.
- [x] Show platform match/duplicate status on partner lead list.
- [x] Show approved package and onboarding status on partner deal list.
- [x] Show setup blockers in partner setup view.
- [x] Show commission eligibility blockers in partner commission view.

### Phase 6 — Internal Dashboard Visibility

- [x] Show legal/business and branch handoff details in Partner Onboarding queue.
- [x] Pre-fill execution form from affiliate-provided branch details.
- [x] Show affiliate requested package vs approved package.
- [x] Preserve execution blockers as explicit operator-facing messages.

### Phase 7 — Validation

- [x] Run TypeScript type-check.
- [x] Run ESLint.
- [x] Run unit/component tests.
- [x] Run production build.
- [x] Do not run Playwright/e2e tests.
