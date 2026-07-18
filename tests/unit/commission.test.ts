import { describe, expect, it } from 'vitest';
import {
  calculateCommissionAmount,
  evaluateCommissionEligibility,
  evaluateSetupCommissionEligibility,
  validationDate,
} from '@/lib/partner-program/commission';

describe('commission rules', () => {
  it('combines fixed and percentage commission', () => {
    expect(
      calculateCommissionAmount(
        {
          commission_type: 'sales',
          fixed_amount_cents: 200_000,
          percent_bps: 1000,
          validation_days: 30,
          currency_code: 'INR',
        },
        1_000_000
      )
    ).toBe(300_000);
  });

  it('blocks commission until lead is accepted', () => {
    const result = evaluateCommissionEligibility({
      leadStatus: 'submitted',
      dealStage: 'won',
      paymentValidatedAt: new Date('2026-05-01'),
      now: new Date('2026-05-24'),
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('Lead must be accepted');
  });

  it('approves setup only after checklist and restaurant confirmation', () => {
    const result = evaluateSetupCommissionEligibility({
      leadStatus: 'accepted',
      dealStage: 'live',
      paymentValidatedAt: new Date('2026-05-01'),
      setupStatus: 'approved',
      restaurantApprovedSetup: true,
      now: new Date('2026-05-24'),
    });
    expect(result.eligible).toBe(true);
  });

  it('calculates validation dates', () => {
    expect(validationDate(new Date('2026-05-01T00:00:00.000Z'), 30).toISOString()).toBe(
      '2026-05-31T00:00:00.000Z'
    );
  });
});
