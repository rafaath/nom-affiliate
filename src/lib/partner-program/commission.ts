import { addDays, isAfter } from 'date-fns';
import type { CommissionType, DealStage, LeadStatus, SetupStatus } from './types';

export type CommissionRule = {
  commission_type: CommissionType;
  fixed_amount_cents: number | null;
  percent_bps: number | null;
  validation_days: number;
  currency_code: string;
};

export type CommissionEligibilityInput = {
  leadStatus: LeadStatus;
  dealStage: DealStage | null;
  setupStatus?: SetupStatus | null;
  paymentValidatedAt?: Date | null;
  restaurantApprovedSetup?: boolean;
  hasActiveDispute?: boolean;
  now?: Date;
};

export function calculateCommissionAmount(rule: CommissionRule, revenueCents = 0) {
  const fixed = rule.fixed_amount_cents ?? 0;
  const percentage = rule.percent_bps ? Math.round((revenueCents * rule.percent_bps) / 10_000) : 0;
  return fixed + percentage;
}

export function evaluateCommissionEligibility(input: CommissionEligibilityInput) {
  const now = input.now ?? new Date();

  if (input.hasActiveDispute) {
    return { eligible: false, reason: 'Commission is held because an active dispute exists.' };
  }

  if (input.leadStatus !== 'accepted') {
    return { eligible: false, reason: 'Lead must be accepted by Nom before commission can be approved.' };
  }

  if (input.dealStage !== 'won' && input.dealStage !== 'setup_pending' && input.dealStage !== 'setup_in_progress' && input.dealStage !== 'live') {
    return { eligible: false, reason: 'Restaurant must become a won paying opportunity.' };
  }

  if (!input.paymentValidatedAt || isAfter(input.paymentValidatedAt, now)) {
    return { eligible: false, reason: 'Payment validation period has not completed yet.' };
  }

  return { eligible: true, reason: 'Lead accepted and customer payment validation completed.' };
}

export function evaluateSetupCommissionEligibility(input: CommissionEligibilityInput) {
  const base = evaluateCommissionEligibility(input);
  if (!base.eligible) return base;

  if (input.setupStatus !== 'approved' || !input.restaurantApprovedSetup) {
    return {
      eligible: false,
      reason: 'Setup commission requires completed checklist, restaurant confirmation, and admin approval.',
    };
  }

  return { eligible: true, reason: 'Setup was approved by restaurant and Nom admin.' };
}

export function validationDate(from: Date, validationDays: number) {
  return addDays(from, validationDays);
}
