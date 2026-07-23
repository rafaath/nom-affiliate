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
DATABASE_URL=postgresql://postgres:password@db.wuryzsyfytlbrysfnwtj.supabase.co:5432/postgres?sslmode=require
DATABASE_POOL_MAX=1
SUPABASE_URL=https://wuryzsyfytlbrysfnwtj.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3021
PARTNER_ADMIN_BOOTSTRAP_EMAILS=you@example.com
```

Do not expose `DATABASE_URL` to the browser. The frontend never receives it; Next.js server actions and server components use it as the backend database boundary. Supabase Auth is also configured with server-only env names.

Set `DATABASE_SSL=disable` only for a local non-SSL Postgres database. Supabase-hosted databases should use SSL.

Keep `DATABASE_POOL_MAX=1` for Supabase session-pooler development connections to avoid exhausting the limited session client pool.

## Login

There is no default password. Create a partner account from `/apply` with an email and a password of at least 8 characters, then use the same email/password on `/login`.

When Supabase email confirmation is enabled, `/apply` stores the application first, sends the confirmation email, and automatically links the application to the confirmed Auth user after login.

The branded confirmation email source lives in `supabase/templates/confirmation.html`. Hosted Supabase projects must copy it into **Authentication → Email Templates → Confirm signup**; see `docs/supabase-auth-email-template.md`. Configure custom SMTP before public launch.

For an admin login, create or use a Supabase Auth user, then either add that user's `auth.users.id` to the `partner_admins` table after the migration has been applied, or temporarily include the user's email in `PARTNER_ADMIN_BOOTSTRAP_EMAILS`.

Partner signup and portal routes intentionally refuse to run until the partner database migration has been applied. This prevents creating orphan Supabase Auth users when tables like `partner_profiles` do not exist yet.

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
