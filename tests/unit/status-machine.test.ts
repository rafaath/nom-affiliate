import { describe, expect, it } from 'vitest';
import {
  canTransitionCommission,
  canTransitionDeal,
  canTransitionLead,
  canTransitionSetup,
} from '@/lib/partner-program/status-machine';

describe('status machines', () => {
  it('allows lead acceptance from submitted', () => {
    expect(canTransitionLead('submitted', 'accepted')).toBe(true);
  });

  it('blocks reopening live deals', () => {
    expect(canTransitionDeal('live', 'lost')).toBe(false);
  });

  it('allows setup corrections after review', () => {
    expect(canTransitionSetup('submitted_for_review', 'corrections_requested')).toBe(true);
  });

  it('allows approved commission to be scheduled', () => {
    expect(canTransitionCommission('approved', 'scheduled_for_payout')).toBe(true);
  });
});
