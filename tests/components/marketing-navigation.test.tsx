import { render, screen } from '@testing-library/react';
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
});
