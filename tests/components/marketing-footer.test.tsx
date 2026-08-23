import { render, screen } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MarketingFooter } from '@/components/shell/marketing-footer';

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

describe('MarketingFooter', () => {
  it('does not prefetch the database-backed portal for signed-in users', () => {
    render(<MarketingFooter isSignedIn />);

    expect(screen.getByRole('link', { name: 'Partner portal' }))
      .toHaveAttribute('data-prefetch', 'false');
  });
});
