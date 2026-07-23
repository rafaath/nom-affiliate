import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnchoredDetails } from '@/components/program/anchored-details';
import { AdminRecordDetails } from '@/components/program/admin-record-details';
import { ApprovalStateNotice } from '@/components/program/approval-state-notice';
import { EmptyState } from '@/components/program/empty-state';
import { PlatformPackageSelector } from '@/components/program/platform-package-selector';
import { PortalShell } from '@/components/shell/portal-shell';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import type { PlatformCatalog } from '@/lib/partner-program/platform/types';
import type { PartnerProfile } from '@/lib/partner-program/types';

const { mockUsePathname } = vi.hoisted(() => ({ mockUsePathname: vi.fn(() => '/partner/leads') }));
vi.mock('next/navigation', () => ({ usePathname: mockUsePathname }));
vi.mock('@/app/actions/auth', () => ({ signOutAction: vi.fn() }));

const profile: PartnerProfile = {
  id: 'partner-id',
  auth_user_id: 'user-id',
  full_name: 'Partner',
  phone: null,
  email: 'partner@example.com',
  city: null,
  locality_areas: [],
  partner_type: 'affiliate',
  tier: 'affiliate',
  application_status: 'submitted',
  certification_status: 'not_started',
  quality_score: 0,
  referral_code: 'PARTNER1',
  is_suspended: false,
  suspended_reason: null,
  created_at: '2026-07-21T00:00:00.000Z',
};

const catalog: PlatformCatalog = {
  plans: [
    {
      id: '00000000-0000-0000-0000-000000000001',
      code: 'GROWTH',
      name: 'Growth',
      description: 'Core restaurant tools',
      price_cents: 500000,
      currency_code: 'INR',
      billing_period: 'monthly',
      is_active: true,
      features: [{ id: 'qr-id', code: 'qr', label: 'QR menu', description: null, is_core: true, is_active: true }],
      feature_codes: ['qr'],
    },
  ],
  features: [
    { id: 'qr-id', code: 'qr', label: 'QR menu', description: null, is_core: true, is_active: true },
    { id: 'inventory-id', code: 'inventory', label: 'Inventory', description: 'Stock control', is_core: false, is_active: true },
  ],
  productInterestFeatureCodes: {
    pos: [],
    inventory: ['inventory'],
    qr_menu: ['qr'],
    qr_ordering: [],
    online_ordering: [],
    website: [],
    loyalty: [],
    staff_order_management: [],
    full_restaurant_setup: ['qr', 'inventory'],
    not_sure: [],
  },
};

describe('partner UI foundations', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/partner/leads');
    window.history.replaceState(null, '', '/');
  });

  it('opens anchored details when a visitor lands on its hash', () => {
    window.history.replaceState(null, '', '/#partner-terms');
    render(
      <AnchoredDetails anchorId="partner-terms">
        <summary>Program terms</summary>
        <p>Terms content</p>
      </AnchoredDetails>
    );

    expect(screen.getByText('Program terms').closest('details')).toHaveAttribute('open');
  });

  it('marks the active portal route and opens an accessible mobile drawer', async () => {
    const user = userEvent.setup();
    render(
      <PortalShell
        eyebrow="Nom Growth"
        title="Partner Portal"
        navItems={[{ href: '/partner', label: 'Dashboard' }, { href: '/partner/leads', label: 'Leads' }]}
      >
        <p>Portal content</p>
      </PortalShell>
    );

    expect(screen.getAllByRole('link', { name: 'Leads' })[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('button', { name: /sign out/i })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Open portal navigation' }));
    expect(screen.getByRole('dialog', { name: 'Portal navigation' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close portal navigation' })).toBeVisible();
  });

  it('renders approval alerts, status badges, and embedded empty states', () => {
    render(
      <div>
        <ApprovalStateNotice
          access={{
            allowed: false,
            code: 'approval_required',
            message: 'Nom must approve your application before you can submit restaurant leads.',
            profile,
          }}
        />
        <EmptyState title="No leads" description="Approved partners can submit here." />
      </div>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Lead submission is not available');
    expect(screen.getByText('Submitted')).toBeVisible();
    expect(screen.getByText('No leads')).toBeVisible();
  });

  it('links approved partners to the required agreement', () => {
    render(
      <ApprovalStateNotice
        access={{
          allowed: false,
          code: 'agreement_required',
          message: 'Review and accept the current Referral Partner Agreement.',
          profile: { ...profile, application_status: 'approved_affiliate' },
        }}
      />
    );

    expect(screen.getByRole('link', { name: 'Review and accept agreement' })).toHaveAttribute(
      'href',
      '/partner/agreement'
    );
  });

  it('pairs the server-friendly native select with an accessible label', () => {
    render(
      <div>
        <Label htmlFor="status">Status</Label>
        <NativeSelect id="status" defaultValue="submitted">
          <option value="submitted">Submitted</option>
        </NativeSelect>
      </div>
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('submitted');
  });

  it('keeps full admin records behind an accessible disclosure', () => {
    render(
      <AdminRecordDetails
        summary="View full application"
        items={[
          { label: 'LinkedIn profile', value: <a href="https://www.linkedin.com/in/partner">Open LinkedIn profile</a> },
          { label: 'Resume', value: null },
        ]}
      />
    );

    fireEvent.click(screen.getByText('View full application'));
    expect(screen.getByRole('link', { name: 'Open LinkedIn profile' })).toBeVisible();
    expect(screen.getByText('Not provided')).toBeVisible();
  });

  it('supports keyboard package selection and exposes the selected package fields', () => {
    render(<PlatformPackageSelector catalog={catalog} commissionRules={[]} partnerType="affiliate" />);
    const growth = screen.getByRole('radio', { name: /Growth/i });
    growth.focus();
    fireEvent.keyDown(growth, { key: 'Enter' });
    expect(growth).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: /Branches/i })).toBeVisible();
    expect(document.querySelector('input[name="requestedPlanId"]')).toHaveValue(catalog.plans[0].id);
  });
});
