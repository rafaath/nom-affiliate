# Nom Partner Program

Standalone Next.js application for the Nom Affiliate & Implementation Partner Program.

## Stack

- Next.js `16.2.6` with Turbopack
- React `19.2.6`
- Supabase Auth + Postgres
- Tailwind CSS v4 + shadcn-style source components
- Vitest + Testing Library + Playwright

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with the Supabase dev project values. The app intentionally shows a loud configuration error for protected routes when Supabase env vars are missing.

Use `DATABASE_URL` for server-side table access and Supabase only for Auth:

```bash
DATABASE_URL=postgresql://postgres.PROJECT_REF:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_POOL_MAX=1
SUPABASE_URL=https://wuryzsyfytlbrysfnwtj.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3021
PARTNER_ADMIN_BOOTSTRAP_EMAILS=you@example.com
```

Do not expose `DATABASE_URL` to the browser. The frontend never receives it; Next.js server actions and server components use it as the backend database boundary. Supabase Auth is also configured with server-only env names.

Set `DATABASE_SSL=disable` only for a local non-SSL Postgres database. Supabase-hosted databases should use SSL.

For Vercel, use the **Transaction pooler** URI (port `6543`) for the correct Supabase project. Preserve an application-specific runtime role where configured; do not replace it with the privileged `postgres` role shown in the generic example. The host/region in the example is illustrative. Session pooling (`5432`) is intended for persistent IPv4 clients; changing pooler modes does not fix slow queries or cross-region latency. Keep `prepare: false` for transaction pooling.

Portal reads and workflow writes use one short-lived connection per operation through the shared Supabase pooler. Each has a 20-second end-to-end database deadline, transaction-local 10-second statement and 3-second lock limits, and closes on completion. Writes are never automatically retried. `DATABASE_POOL_MAX=1` remains the conservative default for standalone legacy catalog/integration helpers; it does not select the Supabase pooler mode or limit the number of Vercel instances.

`vercel.json` places functions in Mumbai (`bom1`) alongside the current production database. Update this deliberately if the database region changes. Local `.env.local` values and Vercel Production environment variables are separate; changing one does not update the other.

## Login

The affiliate app uses **Google sign-in only**, through the shared Supabase Auth project. Start at `/apply` or `/login` and use the Google account with the same email as any existing Nom partner account.

Password login, email/password signup, password-reset emails, and password changes are disabled in this application. Legacy recovery pages/actions redirect to Google login. Server components, server actions, the proxy, and the callback require a verified email, a Google identity, and a signed OAuth authentication-method claim. A password/OTP session is not sufficient even for an account linked to Google. Existing non-OAuth affiliate sessions need to sign in again.

**Shared-project boundary:** leave Supabase's Email provider enabled for other Nom applications. No provider settings, users, passwords, sessions, database policies, or migrations are changed by this app-only rollout. This gate relies on Google being the project's only enabled OAuth provider (as verified in Production on 2026-09-13). If other OAuth providers are enabled later, add session-specific provider attestation before claiming exclusive Google authentication; a linked identity alone does not prove which OAuth provider authenticated a session.

Existing saved applications can still be claimed after Google login using the same verified email. Historic email templates are retained for reference but are not part of the affiliate onboarding flow.

For admin access, use Google sign-in, then add that user's `auth.users.id` to `partner_admins` or temporarily include their email in `PARTNER_ADMIN_BOOTSTRAP_EMAILS`. Existing role and approval checks remain unchanged.

Partner application writes require the partner database schema to be ready. See [Google-only rollout and verification](docs/google-only-auth.md) for deployment checks.

## Database

Migration files live in `supabase/migrations`.

If the initial partner migration was already applied before pending-application recovery existed, also apply `supabase/migrations/20260524043000_partner_pending_applications.sql`.

Platform-native RMS/QR/internal-dashboard integration is modeled in `supabase/migrations/20260524090000_partner_platform_integration.sql`. Apply it after the base partner migrations before using:

- platform lead reconciliation,
- partner-attributed onboarding requests,
- feature-aware setup verification,
- platform-gated commission approvals,
- internal dashboard partner onboarding queue.

Affiliate-facing RMS package selection is modeled in `supabase/migrations/20260524100000_affiliate_requested_package_flow.sql`. Apply it after the platform integration migration before using `/partner/leads`. It adds:

- affiliate-requested plan/features/branch count on submitted leads,
- requested-vs-approved package snapshots on deals,
- affiliate package context and branch handoff fields on onboarding requests,
- commission preview and RMS provisioning handoff data captured before admin review.

The intended sales flow is: partner selects the restaurant's desired RMS plan/modules on `/partner/leads`, Nom admin approves or overrides that package, internal dashboard provisions RMS from the approved package, and commission approval uses platform eligibility checks.

Application privacy acknowledgement and immutable Referral Partner Agreement acceptance are modeled in `supabase/migrations/20260723120000_add_referral_partner_agreement_acceptances.sql`. Apply migrations in filename order. Approved partners must accept the current agreement in `/partner/agreement` before lead forms, commission catalog data, or payout-detail forms are enabled.

Do not run migrations from this app unless explicitly instructed. The database source of truth is Supabase project `wuryzsyfytlbrysfnwtj`.

Production already contains the original partner tables without matching entries in its migration ledger. Do not replay the earlier partner migrations or run `supabase db push` from this partial migration directory against Production. Apply `supabase/migrations/20260731120000_reconcile_production_partner_schema.sql` as one new migration through the canonical shared-database migration workflow; it validates the existing baseline, adds the missing legal/security changes, and restores required partner seed data.

## Validation

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

Do not run `npm run test:e2e` for this implementation pass.

## Manual Smoke Path

1. Apply all partner migrations in filename order.
2. Approve a partner, open `/partner/agreement`, and accept the current version.
3. Open `/partner/leads` and confirm active RMS plans/features render.
4. Select a plan, add modules, set branch count, and verify the package summary/commission preview updates.
5. Submit a complete restaurant handoff with legal name, owner email, branch address, state/country/timezone, and Nom service context.
6. In `/admin/leads`, confirm the requested package is visible and defaulted into approval controls; approve as-is or override plan/features/branch count.
7. In `/admin/deals`, confirm requested vs approved package is preserved and onboarding status is visible.
8. In `/admin/onboarding` and internal dashboard `/internal/partner-onboarding`, confirm the request shows affiliate package context and pre-filled branch execution details.
9. Execute internal dashboard provisioning only after approval; the RMS call should use the approved plan and approved feature set.
