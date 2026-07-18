import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '@/components/program/status-badge';

describe('StatusBadge', () => {
  it('renders known labels', () => {
    render(<StatusBadge status="scheduled_for_payout" />);
    expect(screen.getByText('Scheduled for Payout')).toBeInTheDocument();
  });

  it('renders unknown labels safely', () => {
    render(<StatusBadge status="custom_state" />);
    expect(screen.getByText('custom state')).toBeInTheDocument();
  });
});
