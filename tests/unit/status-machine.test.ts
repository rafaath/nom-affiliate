import { describe, expect, it } from 'vitest';
import {
  canTransitionCommission,
  canTransitionDeal,
  canTransitionLead,
  canTransitionSetup,
  legalCommissionStatusTargets,
  legalDealStageTargets,
  legalLeadStatusTargets,
  legalSetupStatusTargets,
} from '@/lib/partner-program/status-machine';
import {
  COMMISSION_STATUSES,
  DEAL_STAGES,
  LEAD_STATUSES,
  SETUP_STATUSES,
  type CommissionStatus,
  type DealStage,
  type LeadStatus,
  type SetupStatus,
} from '@/lib/partner-program/types';

const expectedLead: Record<LeadStatus, LeadStatus[]> = {
  submitted: ['under_review', 'accepted', 'rejected', 'duplicate', 'already_in_pipeline', 'needs_more_information'],
  under_review: ['accepted', 'rejected', 'duplicate', 'already_in_pipeline', 'needs_more_information'],
  accepted: ['needs_more_information'],
  rejected: ['under_review'],
  duplicate: ['under_review'],
  already_in_pipeline: ['under_review'],
  needs_more_information: ['under_review', 'accepted', 'rejected'],
};

const expectedDeal: Record<DealStage, DealStage[]> = {
  lead_submitted: ['lead_accepted', 'lost', 'dormant'],
  lead_accepted: ['intro_sent', 'contacted', 'interested', 'lost', 'dormant'],
  intro_sent: ['contacted', 'interested', 'demo_scheduled', 'lost', 'dormant'],
  contacted: ['interested', 'demo_scheduled', 'follow_up_needed', 'lost', 'dormant'],
  interested: ['demo_scheduled', 'pricing_shared', 'follow_up_needed', 'lost'],
  demo_scheduled: ['demo_completed', 'follow_up_needed', 'lost'],
  demo_completed: ['pricing_shared', 'follow_up_needed', 'won', 'lost'],
  pricing_shared: ['follow_up_needed', 'won', 'lost'],
  follow_up_needed: ['contacted', 'demo_scheduled', 'pricing_shared', 'won', 'lost', 'dormant'],
  won: ['setup_pending', 'setup_in_progress', 'live'],
  lost: ['dormant', 'contacted'],
  dormant: ['contacted', 'interested', 'lost'],
  setup_pending: ['setup_in_progress', 'live'],
  setup_in_progress: ['live', 'follow_up_needed'],
  live: [],
};

const expectedSetup: Record<SetupStatus, SetupStatus[]> = {
  not_started: ['assigned'],
  assigned: ['in_progress', 'failed'],
  in_progress: ['submitted_for_review', 'corrections_requested', 'failed'],
  submitted_for_review: ['approved', 'corrections_requested', 'failed'],
  corrections_requested: ['in_progress', 'submitted_for_review', 'failed'],
  approved: [],
  failed: ['assigned'],
};

const expectedCommission: Record<CommissionStatus, CommissionStatus[]> = {
  estimated: ['pending', 'rejected'],
  pending: ['under_review', 'held', 'rejected'],
  under_review: ['approved', 'held', 'rejected'],
  approved: ['scheduled_for_payout', 'held', 'reversed'],
  scheduled_for_payout: ['paid', 'held', 'reversed'],
  paid: ['reversed'],
  held: ['under_review', 'approved', 'rejected'],
  rejected: ['under_review'],
  reversed: [],
};

describe('status machines', () => {
  it('exhaustively accepts only configured lead transitions', () => {
    for (const from of LEAD_STATUSES) for (const to of LEAD_STATUSES) {
      expect(canTransitionLead(from, to), `${from} -> ${to}`).toBe(expectedLead[from].includes(to));
    }
  });

  it('exhaustively accepts only configured deal transitions', () => {
    for (const from of DEAL_STAGES) for (const to of DEAL_STAGES) {
      expect(canTransitionDeal(from, to), `${from} -> ${to}`).toBe(expectedDeal[from].includes(to));
    }
  });

  it('exhaustively accepts only configured setup transitions', () => {
    for (const from of SETUP_STATUSES) for (const to of SETUP_STATUSES) {
      expect(canTransitionSetup(from, to), `${from} -> ${to}`).toBe(expectedSetup[from].includes(to));
    }
  });

  it('exhaustively accepts only configured commission transitions', () => {
    for (const from of COMMISSION_STATUSES) for (const to of COMMISSION_STATUSES) {
      expect(canTransitionCommission(from, to), `${from} -> ${to}`).toBe(expectedCommission[from].includes(to));
    }
  });

  it('exposes the current state plus legal targets, including terminal current-only states', () => {
    for (const status of LEAD_STATUSES) expect(legalLeadStatusTargets(status)).toEqual([status, ...expectedLead[status]]);
    for (const status of DEAL_STAGES) expect(legalDealStageTargets(status)).toEqual([status, ...expectedDeal[status]]);
    for (const status of SETUP_STATUSES) expect(legalSetupStatusTargets(status)).toEqual([status, ...expectedSetup[status]]);
    for (const status of COMMISSION_STATUSES) expect(legalCommissionStatusTargets(status)).toEqual([status, ...expectedCommission[status]]);
    expect(legalDealStageTargets('live')).toEqual(['live']);
    expect(legalSetupStatusTargets('approved')).toEqual(['approved']);
    expect(legalCommissionStatusTargets('reversed')).toEqual(['reversed']);
  });
});
