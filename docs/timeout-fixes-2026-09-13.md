# Affiliate timeout and approval-flow fixes

## Release scope

Release approved on 2026-09-13 after local verification. The Mumbai region setting takes effect with the new Vercel deployment; the exact Git commit, deployment status, and post-release checks are reported in the release handoff. No production schema, database role, environment variable, or Supabase Auth provider changes are required.

Rollback target captured before release: `dpl_2XWF6ShqD3AUqox2PWETvgbZovnu` (`nom-affiliate-jdqyfg2nx-rohans-projects-e9b1b996.vercel.app`, commit `7263ab8`).

## Evidence and limits

- The supplied log export contained 15 Vercel 300-second timeouts and one PostgreSQL statement timeout.
- The deployed functions were in `iad1`; production Supabase is in Mumbai (`ap-south-1`).
- Production already uses the transaction pooler on port `6543`, with the restricted `nom_affiliate_runtime` role. The role already has a 30-second statement timeout, 5-second lock timeout, and 30-second idle-in-transaction timeout. The 120-second default seen through the administrator's MCP session was not the application's effective statement limit.
- The previous admin applications page loaded 14 data queries, although it only consumed the applications result. The partner dashboard awaited its six reads serially.
- Successful profile reads were generally sub-millisecond in PostgreSQL. This does not measure connection acquisition, frozen sockets, failed statements, or historical lock waits. The initiating cause of each historical timeout is not recoverable from the exported logs, so this is not proof of one exclusive root cause.

## Changes

- `getAdminPageData` requests only each screen's required sections. Applications now uses one data query, excluding auth/schema checks and transaction setup. Independent sections are submitted together rather than awaited one by one.
- Portal operations and workflow writes use an owned, short-lived postgres.js connection through Supavisor. One operation cannot retain a frozen application socket for the next request or terminate another operation's connection on failure. This trades connection-setup overhead for predictable serverless connection lifecycle; Supavisor remains the shared backend pool. No new dependency or custom persistent connection pool was added.
- Each operation has a 20-second overall database deadline, covering connection setup and transaction completion. Transaction-local settings limit each statement to 10 seconds, lock waits to 3 seconds, and idle transaction time to 15 seconds. Closing is confined to the owned client. Lost commit acknowledgments can be ambiguous, so writes are never automatically retried and users are told to check current status before resubmitting.
- Schema readiness checks are single-flight per server instance, with failed checks eligible for retry. No cross-user profile or auth response cache was added.
- Slow/failed operations log an operation name, elapsed milliseconds, and error code, without SQL parameters or personal information.
- Google session checks remain intact. Auth network requests now have an abort deadline, and `getCurrentUser` is memoized only within a React server request.
- Pending access notices poll a private, authenticated status endpoint every 30 seconds while visible, and on focus. Only an actual access-state change triggers a page refresh. Polls stop on cleanup, do not overlap, and do not clear the page on transient failures.
- Agreement acceptance redirects directly to lead submission. The receipt page also links to submission. Application, review, agreement, and lead forms display pending state and disable repeated submission.
- Added loading/error UI and a 60-second Vercel page/action guardrail. Mumbai deployment region is configured in `vercel.json`.
- The redundant pending-application claim update was removed; that update already happens atomically with profile/application creation.

## Verification

- Unit/component tests cover query selection, concurrent section scheduling, approval handoff, unchanged Google-only guards, agreement/lead access, deadline cleanup, no automatic write retries, background polling, and authenticated/private status responses.
- Production build, TypeScript checks, ESLint, and whitespace checks pass.
- Five opt-in smoke checks passed using the real production runtime role: schema readiness, effective transaction-local timeouts, cancellation of a slow SELECT and recovery, four concurrent small reads, and the actual applications/dashboard loaders.
- Smoke tests performed no persistent writes. They intentionally generated a PostgreSQL statement-timeout event by setting a **transaction-local** 50 ms limit around `pg_sleep(0.25)`; that diagnostic event is expected.
- No live affiliate was approved, no legal agreement was accepted, and no lead was created for testing. A real two-session browser walkthrough and post-deployment timing/log inspection remain release checks; local read tests do not establish Vercel production latency after the region move.

Run the opt-in database checks with the intended environment and project guard:

```sh
rtk proxy npx vercel env run -e production -- env RUN_DATABASE_SMOKE=1 EXPECTED_DATABASE_PROJECT=jgfmizxnpjtirrrbqzpo npx vitest run tests/integration/database-connection.test.ts --pool=forks --maxWorkers=1
```

## Pooler guidance

Production's transaction pooler URL is already appropriate for Vercel. Session pooling dedicates a backend connection to a persistent client; it is not a remedy for these timeouts. `DATABASE_POOL_MAX` is a separate application-client setting, not the switch between session and transaction modes. Local `.env.local` changes do not update Vercel Production variables.

- [Supabase connection modes and serverless guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: hanging connections in Vercel serverless functions](https://supabase.com/docs/guides/troubleshooting/troubleshooting-connect_timeout-or-hanging-queries-in-vercel-serverless-functions-775f92)
- [Supabase PostgreSQL timeouts](https://supabase.com/docs/guides/database/postgres/timeouts)
- [Vercel function regions](https://vercel.com/docs/functions/configuring-functions/region)

Keep `prepare: false` and the existing restricted runtime role. No SQL migration or pooler-URL change is required for these fixes. Before release, push/deploy the code, verify function region `bom1`, then check a genuine approval → agreement → lead flow and inspect logs for `[database]` warnings/errors.
