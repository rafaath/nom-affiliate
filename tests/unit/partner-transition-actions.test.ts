import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REFERRAL_PARTNER_AGREEMENT_VERSION } from '@/lib/partner-program/referral-agreement';

const accepted = vi.fn();
const reviewed = vi.fn();
const revalidate = vi.fn();

beforeEach(() => {
  vi.resetModules();
  accepted.mockReset().mockResolvedValue({ id: 'receipt' });
  reviewed.mockReset().mockResolvedValue(undefined);
  revalidate.mockReset();
  vi.doMock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
  vi.doMock('next/cache', () => ({ revalidatePath: revalidate }));
  vi.doMock('@/lib/supabase/auth', () => ({
    getCurrentUser: async () => ({ id: 'partner-user', email: 'partner@example.com' }),
    requirePartnerAdmin: async () => ({ id: 'admin-user' }),
  }));
  vi.doMock('@/lib/partner-program/data', () => ({ acceptReferralPartnerAgreement: accepted }));
  vi.doMock('@/lib/partner-program/admin-data', () => ({ reviewApplication: reviewed }));
});

afterEach(() => {
  for (const moduleId of ['next/navigation', 'next/cache', '@/lib/supabase/auth', '@/lib/partner-program/data', '@/lib/partner-program/admin-data']) vi.doUnmock(moduleId);
  vi.resetModules();
});

describe('approval-to-submission handoff', () => {
  it('takes an explicitly accepted agreement straight to lead submission after the write succeeds', async () => {
    const { acceptReferralPartnerAgreementAction } = await import('@/app/actions/partner');
    const form = new FormData();
    form.set('agreementVersion', REFERRAL_PARTNER_AGREEMENT_VERSION);
    form.set('agreementAccepted', 'on');
    await expect(acceptReferralPartnerAgreementAction(form)).rejects.toThrow('redirect:/partner/leads?agreement=accepted');
    expect(accepted).toHaveBeenCalledWith('partner-user', 'partner@example.com');
    expect(revalidate).toHaveBeenCalledWith('/partner/leads');
  });

  it('does not unlock submission when recording agreement acceptance fails', async () => {
    accepted.mockRejectedValue(new Error('Database temporarily unavailable'));
    const { acceptReferralPartnerAgreementAction } = await import('@/app/actions/partner');
    const form = new FormData();
    form.set('agreementVersion', REFERRAL_PARTNER_AGREEMENT_VERSION);
    form.set('agreementAccepted', 'on');
    await expect(acceptReferralPartnerAgreementAction(form)).rejects.toThrow('redirect:/partner/agreement?error=');
    expect(revalidate).not.toHaveBeenCalled();
  });

  it('invalidates partner access pages after an admin approves an application', async () => {
    const { reviewApplicationAction } = await import('@/app/actions/admin');
    const form = new FormData();
    form.set('applicationId', 'application');
    form.set('partnerId', 'partner');
    form.set('status', 'approved_affiliate');
    await expect(reviewApplicationAction(form)).rejects.toThrow('redirect:/admin/partners?reviewed=1');
    expect(reviewed).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved_affiliate' }));
    expect(revalidate).toHaveBeenCalledWith('/partner');
    expect(revalidate).toHaveBeenCalledWith('/partner/agreement');
    expect(revalidate).toHaveBeenCalledWith('/partner/leads');
  });
});
