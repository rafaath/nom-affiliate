# Affiliate Google-only authentication

Deployed to https://affiliate.nom.enterprises on 2026-09-13 as part of the owner-approved combined release. See [release verification](production-release-2026-09-13.md).

## Scope

The affiliate login/application UI starts Google OAuth through Supabase. Password forms are removed; old password actions and recovery pages redirect to Google login without calling password, signup, or recovery APIs. Application submission requires an authenticated Google-session user before schema checks or writes and takes the email from that user, ignoring any posted replacement.

The shared `getGoogleSessionUser` gate checks a server-validated user, confirmed email, Google identity, matching subject in verified JWT claims, and an OAuth AMR entry. It is used by the server user accessor (including partner/admin actions), proxy and callback. This prevents a password/OTP session for a linked Google account from gaining affiliate access and prevents proxy/login redirect loops. Refreshed cookies are preserved on proxy redirects.

Google was the only enabled OAuth provider in Production during the read-only provider inspection; Email was also enabled. The OAuth AMR claim does not identify the particular social provider. If more social providers are enabled in the shared project later, session-specific provider attestation is needed to preserve exclusive Google access. We intentionally do not use the account's primary `app_metadata.provider` as the current session method: legacy email accounts can be linked to Google.

Supabase provider settings, other applications, shared passwords, users, database policies and migrations are unchanged. This is an application-server access restriction, not a change to direct shared Supabase API/RLS access.

## Verification

Story: a partner starts Google sign-in, returns through the affiliate callback, then accesses the portal or submits an application using the verified account email.

- 28 test files / 144 tests pass, including password/OTP rejection, linked-account Google OAuth acceptance, expired/mismatched claims, protected/admin routing, recovery callback rejection, safe destinations, cookie propagation and authenticated application submission.
- TypeScript check passes.
- Targeted ESLint passes for changed auth files and tests.
- Production build passes.
- Local production-server HTTP checks: `/login` and `/apply` return 200 with Google sign-in and no password inputs; both legacy recovery routes return 307 to `/login?notice=google-only`; anonymous `/partner` returns 307 to Google login with its return path preserved.
- `git diff --check` passes.
- Live browser inspection after deployment passed: the existing Google-authenticated account opened the partner dashboard with its approved profile intact, and continued to work after reload. A fresh OAuth round trip was not performed.
- No live signup, email, password change, application write, or provider mutation was performed by verification.

The Next.js/React guidance informed server-action authorization and shared checks instead of relying on hidden UI controls or proxy-only protection.

## Deployment and live verification

1. Completed: owner approved deploying the pending tracking, lead-editing and commission changes together with Google-only auth.
2. Completed: release deployed with existing production Supabase configuration and `NEXT_PUBLIC_APP_URL=https://affiliate.nom.enterprises`. No new environment variable or migration was needed for Google-only access; separate tracking variables were configured for the combined release.
3. Verify Google sign-in end to end with an existing partner/admin account using its original email; existing password-only affiliate sessions must sign in again with Google.
4. Confirm `/login` and `/apply` have no password option, legacy recovery URLs point to Google login, and partner/admin roles and existing history remain intact.
5. Confirm a linked account authenticated by password cannot access this app. Leave the shared project's Email provider enabled and verify other apps' password logins are unaffected.
6. Any existing partner without a usable Google account for their original email needs a support-assisted migration. Do not create a duplicate partner profile with a different email.
