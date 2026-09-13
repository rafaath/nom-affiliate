import { describe, expect, it, vi } from 'vitest';
import { getPartnerPageData } from '@/lib/partner-program/data';
import type { SqlExecutor } from '@/lib/db/client';
import type { PartnerProfile } from '@/lib/partner-program/types';

vi.mock('next/cache', () => ({ unstable_noStore: vi.fn() }));

const profile: PartnerProfile = {
  id: 'partner-id',
  auth_user_id: 'user-id',
  full_name: 'Partner',
  phone: null,
  email: 'partner@example.com',
  city: null,
  locality_areas: [],
  partner_type: 'affiliate',
  tier: 'affiliate',
  application_status: 'submitted',
  certification_status: 'not_started',
  quality_score: 0,
  referral_code: 'PARTNER1',
  is_suspended: false,
  suspended_reason: null,
  created_at: '2026-07-21T00:00:00.000Z',
};

function createQueryRecorder() {
  const queries: string[] = [];
  const sql = ((strings: TemplateStringsArray) => {
    const query = strings.join(' ').replace(/\s+/g, ' ').trim();
    queries.push(query);

    if (query.includes('from public.partner_profiles')) return Promise.resolve([profile]);
    return Promise.resolve([]);
  }) as unknown as SqlExecutor;

  return { queries, sql };
}

describe('partner page data', () => {
  it('starts independent section reads together after loading the profile', async () => {
    const finish: Array<() => void> = [];
    const queries: string[] = [];
    const sql = ((strings: TemplateStringsArray) => {
      const query = strings.join(' ');
      queries.push(query);
      if (query.includes('from public.partner_profiles')) return Promise.resolve([profile]);
      return new Promise((resolve) => finish.push(() => resolve([])));
    }) as unknown as SqlExecutor;
    const pending = getPartnerPageData('user-id', null, ['deals', 'commissions', 'payoutMethods'], sql);
    await vi.waitFor(() => expect(queries).toHaveLength(4));
    finish.forEach((resolve) => resolve());
    await pending;
  });

  it('loads only the profile and lead history for the leads route', async () => {
    const { queries, sql } = createQueryRecorder();

    const result = await getPartnerPageData('user-id', 'partner@example.com', ['leads'], sql);

    expect(result.profile).toEqual(profile);
    expect(queries.some((query) => query.includes('from public.partner_leads l'))).toBe(true);
    expect(queries.some((query) => query.includes('from public.partner_agreement_acceptances'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_deals d'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_commissions c'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_setup_checklists sc'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_payout_methods'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_notifications'))).toBe(false);
  });

  it('loads agreement and payout data without querying unrelated portal sections', async () => {
    const { queries, sql } = createQueryRecorder();

    await getPartnerPageData(
      'user-id',
      'partner@example.com',
      ['agreementAcceptance', 'payoutMethods'],
      sql
    );

    expect(queries.some((query) => query.includes('from public.partner_agreement_acceptances'))).toBe(true);
    expect(queries.some((query) => query.includes('from public.partner_payout_methods'))).toBe(true);
    expect(queries.some((query) => query.includes('from public.partner_leads l'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_deals d'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_commissions c'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_setup_checklists sc'))).toBe(false);
    expect(queries.some((query) => query.includes('from public.partner_notifications'))).toBe(false);
  });
});
