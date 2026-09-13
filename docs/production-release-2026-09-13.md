# Production release — 13 September 2026

## Result

Deployed and promoted successfully to https://affiliate.nom.enterprises. Google Ads remains an unpublished draft; no spending, billing or campaign activation changes were made.

| Field | Value |
| --- | --- |
| Target / status | Vercel Production / Ready; promotion succeeded |
| Project | nom-affiliate |
| Deployment | dpl_FNMVwdDp9YtRk7tiLytGsuKDEJpq |
| Deployment URL | https://nom-affiliate-ipdzg432j-rohans-projects-e9b1b996.vercel.app |
| Source | Git base 4d2c042 plus owner-approved uncommitted workspace changes |
| Framework | Next.js 16.2.6 |
| Build | 29 seconds; compilation and TypeScript passed |
| Created | 2026-09-13 12:25:06 UTC |
| Rollback candidate | dpl_2hrhkCt1QRdq3KSHJ9fPtxhReVGz — https://nom-affiliate-943n60lb1-rohans-projects-e9b1b996.vercel.app |

Built using `--prod --skip-domain`, smoke-tested the ready deployment, then promoted to the live domain. No git commit or push was performed. `.vercelignore` excludes local secrets, generated browser/build artifacts, and research documents; public assets are included.

## Approved scope

- Affiliate Google-only login and application access, with server-side session checks and legacy password-route redirects.
- Shared Supabase Email and Google provider settings left unchanged so other apps retain their authentication methods.
- Previously pending partner lead edit/delete restrictions (submitted status only).
- Previously pending first-paid annual-invoice commission implementation.
- Consent-gated Google Ads successful-application tracking and privacy notice/controls.

Production commission configuration was checked read-only through Supabase MCP: the first-paid annual-invoice 25% rule is active with a 30-day validation period, the old first-paid-month rule is inactive, and the deal/commission-type uniqueness index exists. No database migration or provider mutation was required or performed during this release.

## Environment

Production public URL is `https://affiliate.nom.enterprises`. Production tracking is enabled with `AW-18193512040` and label `LQs-CI6Hl_YcEOjsq-ND`. A new server-only receipt secret was stored as a Vercel sensitive environment variable, without printing or recording its value. Preview/development configuration and database credentials were not changed. The temporary production env inspection file was removed after checking public values.

## Verification evidence

- 28 test files / 144 tests passed; prior type-check and targeted lint passed; `git diff --check` passed.
- Remote production build passed, deployment became Ready, promotion returned success, and inspecting `affiliate.nom.enterprises` resolved to the new deployment.
- Live `/login` and `/apply`: HTTP 200, Continue with Google present, no password input.
- Live `/forgot-password` and `/reset-password`: HTTP 307 to `/login?notice=google-only`.
- Anonymous `/partner`: HTTP 307 to Google-only login with return path preserved.
- `/api/health`: HTTP 200 / ok. This endpoint checks process health, not database connectivity.
- Live browser: existing Google-authenticated account opened the database-backed partner dashboard with its approved profile intact; reload succeeded. Agreement acceptance remains required for lead submission; no agreement was accepted by the agent.
- Live privacy controls: initial banner visible, decline worked, choices could be reopened, allow worked, and withdrawal worked. Declined choice persisted after reload; browser was left declined.
- Vercel error-level logs for the new deployment over the preceding 15 minutes returned no logs. This is an early observation, not a guarantee of future error-free operation.

## Remaining checks before advertising launch

- Fresh Google OAuth round trip and a successful application with owner-approved test data; no live application or agreement acceptance was performed during verification.
- Tag Assistant/network verification of the actual successful-application event, transaction ID, deduplication, consent behavior and ad-click attribution. UI consent checks alone do not establish conversion delivery or attribution.
- Mobile privacy-panel layout check.
- Replace the affiliate draft's unrelated Robusto conversion goal with a dedicated goal containing only the Nom application action; complete final campaign review and obtain launch approval.

The Google-only session gate assumes Google remains the shared project's only enabled social OAuth provider. If additional social providers are enabled later, add session-specific provider attestation; see [auth notes](google-only-auth.md).
