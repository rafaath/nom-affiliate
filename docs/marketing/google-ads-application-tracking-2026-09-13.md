# Nom partner application conversion tracking

## Status

Deployed and enabled on https://affiliate.nom.enterprises on 2026-09-13, with consent required before measurement. Google Ads conversion creation was confirmed by the UI, including the event snippet below. Full live application-event verification and campaign goal wiring remain pending. No campaign was published, no funds added, and no enhanced conversions enabled. See [release verification](../production-release-2026-09-13.md).

- Account: `141-540-8686` (Nom).
- Conversion: `Nom | Partner Application Submitted`.
- Category: Submit lead form; manual code event, not a URL/page-view rule.
- Tag ID: `AW-18193512040`.
- Conversion label: `LQs-CI6Hl_YcEOjsq-ND`.
- Count: One per ad interaction.
- Value: fixed INR 0 (no fabricated application revenue).
- Click-through window: 30 days; engaged-view 3 days; view-through 1 day.
- Secondary action initially, to avoid adding a new account-default bidding target to unrelated campaigns. Select it explicitly for the affiliate campaign via a dedicated custom goal before conversion bidding. Do not change the existing Robusto action account-wide.
- Enhanced conversions are unconfigured/off. No emails or phone numbers are supplied.

## Implementation

`submitApplicationAction` issues a signed, HttpOnly success receipt only after the application database transaction commits. It is bound to the saved partner profile and authenticated account, expires in seven days, and contains a deterministic HMAC transaction identifier. On the authenticated dashboard, the server verifies the receipt and passes only the opaque transaction identifier to the browser. The query string `?applied=1` alone cannot trigger a conversion. Existing applications and historical pending-application recovery do not receive new receipts.

The browser emits the conversion only with affirmative measurement consent and a loaded tag on the `/partner` dashboard. Same-tab pending protection, browser-persisted sent markers, and the same Google Ads `transaction_id` protect against duplicate refresh/remount events. A tag callback indicates local processing, not proof of a recorded or attributed conversion; Google Ads performs authoritative transaction-ID deduplication. Ad blockers, storage restrictions, declined consent, or leaving before delivery can reduce observed conversions.

The tag is loaded via Next.js Script after consent. Ad storage and ad-user-data consent are granted only for measurement; analytics storage and ad personalization remain denied. No advanced-mode pre-consent pings. Privacy choices remain available on public marketing pages and the main partner dashboard. An updated privacy notice describes the integration; this is implementation disclosure, not a legal-compliance certification.

Only allowlisted attribution parameters (`gclid`, `gbraid`, `wbraid`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`) with restricted values are retained in browser storage, and only after consent. They survive the same-browser Google OAuth roundtrip for up to 30 days. Page metadata excludes arbitrary query strings, OAuth tokens/codes, errors, referrers, and personalised portal titles. The event contains no application form fields. Sign-in and callback behavior is unchanged.

Tracking is disabled unless explicitly enabled, tag configuration is valid, and the browser origin exactly matches the configured HTTPS public origin. Missing server signing configuration skips receipts without breaking a saved application. No new database tables or migrations are required for this first-stage browser conversion.

## Production configuration (deployed 2026-09-13)

Configured these Vercel **Production** variables and rebuilt:

```dotenv
NEXT_PUBLIC_APP_URL=https://affiliate.nom.enterprises
NEXT_PUBLIC_GOOGLE_ADS_ENABLED=true
NEXT_PUBLIC_GOOGLE_ADS_ID=AW-18193512040
NEXT_PUBLIC_GOOGLE_ADS_APPLICATION_LABEL=LQs-CI6Hl_YcEOjsq-ND
GOOGLE_ADS_RECEIPT_SECRET=<unique cryptographically random secret of at least 32 characters>
```

The first four variables are public build-time configuration. The receipt secret is a server-only Vercel sensitive variable generated from 48 random bytes; its value is not committed or recorded here. Development and preview configuration was not changed. The owner approved the combined release including commission/lead changes and Google-only auth.

## Verification

- Unit tests: signature validity, user/profile binding, expiry, tampering, deterministic transaction IDs, invalid configuration, consent expiration, attribution allowlisting and expiration, and failure-safe server cookies.
- Component tests: no tag before consent or after declining, attribution across a simulated OAuth return, no conversion from a dashboard URL flag, duplicate protection, and withdrawal.
- Final combined application/program test suite: 28 files, 144 tests passed. Type-checking, production build and targeted lint also passed. Explicit test DOM cleanup was added because the existing no-isolation runner otherwise leaked rendered elements between files.
- Live browser checks passed for the initial consent banner, declining, reopening choices, allowing measurement, and withdrawing again. Portal access worked throughout and the declined choice persisted after reload. This verifies the controls, not network-event delivery; measurement was left declined in the user's browser.
- Still required: mobile-layout check; successful test application with owner-approved test data; verify the event destination and transaction ID in Tag Assistant; verify no event on failures/sign-in alone; refresh to test deduplication; verify incoming ad URLs preserve click IDs; confirm Google Ads diagnostics.
- Do not manufacture a Google ad click or use a real campaign to generate test spend. A debug event without an attributable ad interaction may not appear as an attributed conversion.

## Campaign wiring before launch

Create/select a custom goal containing **only** this Nom application action for the affiliate draft, removing its dependency on `Robusto | Demo Form Submitted`. Keep the other campaign goals unchanged. Until correctly wired and live tracking verified, keep the affiliate campaign unpublished; its provisional Maximize clicks setting is not evidence of functioning application tracking.

Compare the ads using the conversion-action breakdown and cost per qualified application. The two current image URLs share campaign UTMs; Table for three has `utm_content=table_for_three`, while Introductions should receive `utm_content=introductions` for cleaner downstream reports.

Future approved-partner / converted-branch attribution would need separate events and likely consented, server-side click-ID persistence and offline imports. That is not implemented by this first-stage browser tag.

## References

- [Google consent-mode implementation](https://developers.google.com/tag-platform/security/guides/consent)
- [Google tag parameter reference](https://developers.google.com/tag-platform/gtagjs/reference/parameters)
- Conversion ID and label: read directly from the account's generated event snippet, 13 September 2026.
