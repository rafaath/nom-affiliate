import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as database from '@/lib/db/client';
import { getAdminPageData } from '@/lib/partner-program/data';

vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }));

beforeEach(() => {
  vi.spyOn(database, 'assertPartnerSchemaReady').mockResolvedValue();
});
afterEach(() => vi.restoreAllMocks());

describe('page-specific admin queries', () => {
  it('loads applications with one data query, not the entire dashboard', async () => {
    const query = vi.fn(async () => [{ id: 'application' }]);
    const data = await getAdminPageData(['applications'], query as unknown as database.SqlExecutor);
    expect(query).toHaveBeenCalledTimes(1);
    const statement = (query.mock.calls[0] as unknown as [TemplateStringsArray])[0].join(' ');
    expect(statement).toContain('from public.partner_applications');
    expect(data.applications).toEqual([{ id: 'application' }]);
    expect(data.deals).toEqual([]);
    expect(data.payoutBatches).toEqual([]);
    expect(data.platformCatalog.plans).toEqual([]);
  });

  it('loads only the requested payout section', async () => {
    const query = vi.fn(async () => []);
    await getAdminPageData(['payoutBatches'], query as unknown as database.SqlExecutor);
    expect(query).toHaveBeenCalledTimes(1);
    expect((query.mock.calls[0] as unknown as [TemplateStringsArray])[0].join(' ')).toContain('from public.partner_payout_batches');
  });
});
