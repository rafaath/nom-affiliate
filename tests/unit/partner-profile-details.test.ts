import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { partnerApplicationDetailsSchema } from '@/lib/partner-program/schemas';

const queries: { text: string; values: unknown[] }[] = [];
let hasProfile = true;
let hasApplication = true;

beforeEach(() => {
  vi.resetModules();
  queries.length = 0;
  hasProfile = true;
  hasApplication = true;
  vi.doMock('next/cache', () => ({ unstable_noStore: vi.fn() }));
  vi.doMock('@/lib/db/client', () => ({ assertPartnerSchemaReady: vi.fn() }));
  vi.doMock('@/lib/db/operation', () => ({
    withDatabaseOperation: async (_operation: string, work: (sql: unknown) => Promise<unknown>) => work(
      async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const text = strings.join('?').replace(/\s+/g, ' ').trim();
        queries.push({ text, values });
        if (text.includes('select * from public.partner_profiles')) return hasProfile ? [{ id: 'owned-partner' }] : [];
        if (text.includes('update public.partner_applications')) return hasApplication ? [{ id: 'application' }] : [];
        return [];
      },
    ),
  }));
  vi.doUnmock('@/lib/partner-program/data');
});

afterEach(() => {
  for (const path of ['next/cache', '@/lib/db/client', '@/lib/db/operation']) vi.doUnmock(path);
  vi.resetModules();
});

describe('optional partner profile details', () => {
  it('allows every secondary answer to be omitted, but validates supplied values', () => {
    expect(partnerApplicationDetailsSchema.safeParse({}).success).toBe(true);
    expect(partnerApplicationDetailsSchema.safeParse({ restaurantNetworkSize: -1 }).success).toBe(false);
    expect(partnerApplicationDetailsSchema.safeParse({ background: 'x'.repeat(1201) }).success).toBe(false);
  });

  it('scopes reads to both the application and profile owner', async () => {
    const { getPartnerApplicationDetails } = await import('@/lib/partner-program/data');
    await getPartnerApplicationDetails('session-user');
    expect(queries[0].text).toContain('a.auth_user_id = ? and p.auth_user_id = ?');
    expect(queries[0].values).toEqual(['session-user', 'session-user']);
  });

  it('updates only owned self-reported details, not approval, tier, terms or submission dates', async () => {
    const { savePartnerApplicationDetails } = await import('@/lib/partner-program/data');
    await savePartnerApplicationDetails('session-user', partnerApplicationDetailsSchema.parse({ background: 'Sales' }));
    expect(queries[0].text).toContain('for update');
    expect(queries[0].values).toEqual(['session-user']);
    const writes = queries.filter((query) => query.text.startsWith('update'));
    expect(writes).toHaveLength(2);
    for (const query of writes) {
      expect(query.text).toMatch(/where (partner_id|id) = \? and auth_user_id = \?/);
      expect(query.values.slice(-2)).toEqual(['owned-partner', 'session-user']);
      expect(query.text).not.toMatch(/\b(application_status|status|tier|partner_type|submitted_at|review_note|reviewed_by|reviewed_at|program_terms_accepted_at)\s*=/);
    }
  });

  it('does not create or alter anything for an account without an application', async () => {
    hasProfile = false;
    const { savePartnerApplicationDetails } = await import('@/lib/partner-program/data');
    await expect(savePartnerApplicationDetails('session-user', partnerApplicationDetailsSchema.parse({}))).rejects.toThrow('Submit your partner application first');
    expect(queries).toHaveLength(1);
  });

  it('does not update the profile if the owned application is missing', async () => {
    hasApplication = false;
    const { savePartnerApplicationDetails } = await import('@/lib/partner-program/data');
    await expect(savePartnerApplicationDetails('session-user', partnerApplicationDetailsSchema.parse({}))).rejects.toThrow('Partner application not found');
    expect(queries.some((query) => query.text.startsWith('update public.partner_profiles'))).toBe(false);
  });
});
