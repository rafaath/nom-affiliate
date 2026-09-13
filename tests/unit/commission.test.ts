import { describe, expect, it } from 'vitest';
import {
  calculateAnnualInvoiceBasis,
  calculateCommissionAmount,
  evaluateCommissionEligibility,
  evaluateSetupCommissionEligibility,
  validationDate,
} from '@/lib/partner-program/commission';

describe('commission rules', () => {
  it.each([[400_000, 100_000], [1_600_000, 400_000]])('pays 25 percent once on an annual branch invoice of %i paise', (invoice, expected) => {
    expect(calculateCommissionAmount({ commission_type: 'referral', fixed_amount_cents: null, percent_bps: 2500, validation_days: 30, currency_code: 'INR' }, calculateAnnualInvoiceBasis(invoice, 1))).toBe(expected);
  });

  it.each([[0, 1], [400_000, 0.5], [400_000, 501], [Number.NaN, 1], [2_147_483_647, 2]])('rejects an invalid invoice basis (%s, %s)', (amount, branches) => {
    expect(() => calculateAnnualInvoiceBasis(amount, branches)).toThrow();
  });

  it('calculates a one-time 25% commission from the annual price of every converted branch', () => {
    const basis = calculateAnnualInvoiceBasis(400_000, 3);
    expect(basis).toBe(1_200_000);
    expect(
      calculateCommissionAmount(
        {
          commission_type: 'referral',
          fixed_amount_cents: null,
          percent_bps: 2500,
          validation_days: 30,
          currency_code: 'INR',
        },
        basis
      )
    ).toBe(300_000);
  });

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
