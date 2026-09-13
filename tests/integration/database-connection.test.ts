import { beforeAll, describe, expect, it, vi } from 'vitest';
import { withDatabaseOperation } from '@/lib/db/operation';
import { assertPartnerPlatformSchemaReady } from '@/lib/db/client';
import { getAdminPageData, getPartnerPageData } from '@/lib/partner-program/data';

vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }));

// Explicit opt-in only. Uses SELECTs and transaction-local settings; no fixtures,
// schema changes, partner records, auth changes, or other persistent writes.
describe.skipIf(process.env.RUN_DATABASE_SMOKE !== '1')('database connection smoke test', () => {
  beforeAll(() => {
    const url = new URL(process.env.DATABASE_URL!);
    expect(url.port).toBe('6543');
    expect(process.env.EXPECTED_DATABASE_PROJECT).toBeTruthy();
    expect(decodeURIComponent(url.username).endsWith(`.${process.env.EXPECTED_DATABASE_PROJECT}`)).toBe(true);
  });

  it('verifies the application schema', async () => {
    await assertPartnerPlatformSchemaReady();
  }, 30_000);

  it('enforces local statement and lock limits on the real connection', async () => {
    const [row] = await withDatabaseOperation('smoke.settings', (sql) => sql`
      select current_setting('statement_timeout') as statement_timeout,
        current_setting('lock_timeout') as lock_timeout,
        current_setting('idle_in_transaction_session_timeout') as idle_timeout
    `);
    expect(row).toMatchObject({ statement_timeout: '10s', lock_timeout: '3s', idle_timeout: '15s' });
  });

  it('cancels a deliberately slow SELECT and the next operation still succeeds', async () => {
    await expect(withDatabaseOperation('smoke.expected-timeout', async (sql) => {
      await sql`select set_config('statement_timeout', '50ms', true)`;
      await sql`select pg_sleep(0.25)`;
    })).rejects.toMatchObject({ code: '57014' });
    const [row] = await withDatabaseOperation('smoke.recovery', (sql) => sql`select 1 as ok`);
    expect(row.ok).toBe(1);
  });

  it('handles concurrent requests without sharing a stuck application socket', async () => {
    const started = Date.now();
    const results = await Promise.all(Array.from({ length: 4 }, (_, index) =>
      withDatabaseOperation(`smoke.concurrent-${index}`, (sql) => sql`select 1 as ok`)
    ));
    expect(results.every(([row]) => row.ok === 1)).toBe(true);
    console.info('Four concurrent read-only operations completed', { durationMs: Date.now() - started });
  });

  it('loads the actual admin applications and an existing partner dashboard without writing records', async () => {
    const applications = await getAdminPageData(['applications']);
    expect(Array.isArray(applications.applications)).toBe(true);
    expect(applications.deals).toHaveLength(0);
    const [existing] = await withDatabaseOperation('smoke.existing-profile', (sql) => sql`
      select auth_user_id from public.partner_profiles where auth_user_id is not null limit 1
    `);
    if (!existing) return;
    // Null email deliberately disables the pending-application claim path.
    const dashboard = await getPartnerPageData(existing.auth_user_id, null, [
      'agreementAcceptance', 'deals', 'commissions', 'setupChecklists', 'payoutMethods',
    ]);
    expect(dashboard.profile?.auth_user_id).toBe(existing.auth_user_id);
  });
});
