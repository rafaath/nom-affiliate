import type { CommissionStatus, DealStage, LeadStatus, SetupStatus } from './types';

const leadTransitions: Record<LeadStatus, LeadStatus[]> = {
  submitted: ['under_review', 'accepted', 'rejected', 'duplicate', 'already_in_pipeline', 'needs_more_information'],
  under_review: ['accepted', 'rejected', 'duplicate', 'already_in_pipeline', 'needs_more_information'],
  accepted: ['needs_more_information'],
  rejected: ['under_review'],
  duplicate: ['under_review'],
  already_in_pipeline: ['under_review'],
  needs_more_information: ['under_review', 'accepted', 'rejected'],
};

const dealTransitions: Record<DealStage, DealStage[]> = {
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

const setupTransitions: Record<SetupStatus, SetupStatus[]> = {
  not_started: ['assigned'],
  assigned: ['in_progress', 'failed'],
  in_progress: ['submitted_for_review', 'corrections_requested', 'failed'],
  submitted_for_review: ['approved', 'corrections_requested', 'failed'],
  corrections_requested: ['in_progress', 'submitted_for_review', 'failed'],
  approved: [],
  failed: ['assigned'],
};

const commissionTransitions: Record<CommissionStatus, CommissionStatus[]> = {
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

export function canTransitionLead(from: LeadStatus, to: LeadStatus) {
  return leadTransitions[from].includes(to);
}

export function canTransitionDeal(from: DealStage, to: DealStage) {
  return dealTransitions[from].includes(to);
}

export function canTransitionSetup(from: SetupStatus, to: SetupStatus) {
  return setupTransitions[from].includes(to);
}

export function canTransitionCommission(from: CommissionStatus, to: CommissionStatus) {
  return commissionTransitions[from].includes(to);
}

export function assertTransition<TStatus extends string>(
  canTransition: boolean,
  from: TStatus,
  to: TStatus,
  entity: string
) {
  if (!canTransition) {
    throw new Error(`Invalid ${entity} status transition from ${from} to ${to}`);
  }
}
