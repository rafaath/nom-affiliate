import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MarketingHeader } from '@/components/shell/marketing-header';

const { mockGetCurrentUser } = vi.hoisted(() => ({ mockGetCurrentUser: vi.fn() }));

vi.mock('@/lib/supabase/auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('@/app/actions/auth', () => ({ signOutAction: vi.fn() }));

describe('MarketingHeader', () => {
  beforeEach(() => mockGetCurrentUser.mockReset());
  afterEach(cleanup);

  it('shows login and application actions to signed-out visitors', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    render(await MarketingHeader());

    expect(screen.getByRole('link', { name: 'Log in' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Apply' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows the portal profile action and sign out to signed-in visitors', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-id', email: 'partner@example.com' });
    render(await MarketingHeader());

    expect(screen.getByRole('link', { name: 'Open partner portal' })).toHaveAttribute('href', '/partner');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Apply' })).not.toBeInTheDocument();
  });
});
