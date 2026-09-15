import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/page';

const { mockGetCurrentUser } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(async () => ({ id: 'user-id', email: 'partner@example.com' })),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    prefetch,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; prefetch?: boolean }) => (
    <a {...props} data-prefetch={prefetch === false ? 'false' : 'true'}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/supabase/auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('@/app/actions/auth', () => ({ signOutAction: vi.fn() }));
vi.mock('@/components/shell/marketing-header', () => ({ MarketingHeader: () => null }));
vi.mock('@/components/shell/marketing-footer', () => ({ MarketingFooter: () => null }));

describe('signed-in marketing navigation', () => {
  it('states the 25% referral reward and one-time invoice basis in the hero', async () => {
    render(await HomePage());

    const headline = screen.getByRole('heading', {
      level: 1,
      name: 'Refer restaurants. Earn 25% with Nom.',
    });
    const hero = headline.closest('section');
    expect(hero).toHaveTextContent('one-time commission on each converted branch’s first paid annual subscription invoice');
    expect(hero).toHaveTextContent('Eligibility and terms apply.');
  });

  it('does not prefetch the database-backed partner portal from public pages', async () => {
    render(await HomePage());

    const portalLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === '/partner');

    expect(portalLinks).toHaveLength(2);
    for (const link of portalLinks) {
      expect(link).toHaveAttribute('data-prefetch', 'false');
    }
  });

  it('explains India affiliate earnings and one-time conditions in an expandable FAQ', async () => {
    const user = userEvent.setup();
    render(await HomePage());

    const question = screen.getByText('How much can I earn as an affiliate in India?');
    const disclosure = question.closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    await user.click(question);
    expect(disclosure).toHaveAttribute('open');
    expect(disclosure).toHaveTextContent('one-time 25% commission');
    expect(disclosure).toHaveTextContent('each converted branch’s first paid annual subscription invoice');
    expect(disclosure).toHaveTextContent('₹4,000–₹16,000 per branch');
    expect(disclosure).toHaveTextContent('₹1,000–₹4,000 for each eligible converted branch');
    expect(disclosure).toHaveTextContent('₹10,000 first-year subscription means ₹2,500 in commission');
    expect(disclosure).toHaveTextContent('not a monthly or renewal payment');
    expect(disclosure).toHaveTextContent('payment validation, approval, and program terms apply');
  });
});
