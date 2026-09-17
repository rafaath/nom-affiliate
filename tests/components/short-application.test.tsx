import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormDraftPersistence } from '@/components/program/form-draft-persistence';
import type { CurrentUser } from '@/lib/supabase/auth';

let user: CurrentUser | null = null;
const existingProfile = vi.fn();
const recoverProfile = vi.fn();
const details = vi.fn();

beforeEach(() => {
  vi.resetModules();
  sessionStorage.clear();
  user = null;
  existingProfile.mockReset().mockResolvedValue(null);
  recoverProfile.mockReset().mockResolvedValue(null);
  details.mockReset().mockResolvedValue({
    locality_areas: [], requested_partner_type: 'affiliate', restaurant_network_size: 0,
    can_visit_restaurants: false, can_help_setup: false, restaurant_experience: '',
    applicant_kind: 'individual', business_name: null, background: '', preferred_language: '',
    heard_from: '', linkedin_profile_url: null, resume_drive_url: null,
  });
  vi.doMock('@/lib/supabase/auth', () => ({ getCurrentUser: async () => user, requireUser: async () => user }));
  vi.doMock('@/lib/partner-program/data', () => ({
    getPartnerProfileByAuthUser: existingProfile,
    claimPendingPartnerApplication: recoverProfile,
    getPartnerApplicationDetails: details,
  }));
  vi.doMock('@/app/actions/partner', () => ({ submitApplicationAction: vi.fn(), saveApplicationDetailsAction: vi.fn() }));
  vi.doMock('@/app/actions/auth', () => ({ signInWithGoogleAction: vi.fn() }));
  vi.doMock('@/components/shell/marketing-header', () => ({ MarketingHeader: () => <header>Nom</header> }));
  vi.doMock('@/components/shell/marketing-footer', () => ({ MarketingFooter: () => <footer>Nom</footer> }));
  vi.doMock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
});

afterEach(() => {
  for (const path of [
    '@/lib/supabase/auth', '@/lib/partner-program/data', '@/app/actions/partner', '@/app/actions/auth',
    '@/components/shell/marketing-header', '@/components/shell/marketing-footer', 'next/navigation',
  ]) vi.doUnmock(path);
  sessionStorage.clear();
  vi.resetModules();
});

describe('short partner application', () => {
  it('puts Google sign-in before review information, without showing the application anonymously', async () => {
    const { default: ApplyPage } = await import('@/app/apply/page');
    render(await ApplyPage({ searchParams: Promise.resolve({}) }));
    const button = screen.getByRole('button', { name: /Sign in with Google to apply/ });
    const learnLink = screen.getByRole('link', { name: 'Learn how it works' });
    expect(learnLink).toHaveAttribute('href', '/#workflow');
    expect(button.compareDocumentPosition(learnLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(button.compareDocumentPosition(screen.getByRole('heading', { name: 'What happens next?' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(existingProfile).not.toHaveBeenCalled();
  });

  it('asks for only name, phone, city and terms after Google sign-in, prefilling the name', async () => {
    user = { id: 'google-user', email: 'verified@example.com', fullName: 'Test Partner' };
    const { default: ApplyPage } = await import('@/app/apply/page');
    render(await ApplyPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect(screen.getByLabelText('Full name')).toHaveValue('Test Partner');
    expect(screen.getByLabelText('Phone')).toHaveAttribute('type', 'tel');
    expect(screen.getByLabelText('Phone')).toHaveAttribute('autocomplete', 'tel');
    expect(screen.getByLabelText('City')).toBeRequired();
    expect(screen.getByText('Signed in as verified@example.com')).toBeVisible();
    expect(screen.getByRole('checkbox')).toBeRequired();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Submit application' })).toBeVisible();
    expect(screen.queryByLabelText(/Restaurant experience/)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('takes existing applicants to the portal, rather than showing another application', async () => {
    user = { id: 'google-user', email: 'verified@example.com' };
    existingProfile.mockResolvedValue({ id: 'partner' });
    const { default: ApplyPage } = await import('@/app/apply/page');
    await expect(ApplyPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('redirect:/partner?application=already-exists');
    expect(recoverProfile).not.toHaveBeenCalled();
  });

  it('makes secondary details available later without requiring any answer or another agreement', async () => {
    user = { id: 'google-user', email: 'verified@example.com' };
    const { default: ProfilePage } = await import('@/app/partner/profile/page');
    const { container } = render(await ProfilePage({ searchParams: Promise.resolve({ saved: '1' }) }));
    expect(screen.getByRole('status')).toHaveTextContent('saved');
    expect(screen.getByLabelText('Restaurant experience')).toBeVisible();
    expect(screen.getByLabelText('LinkedIn profile')).toBeVisible();
    expect(container.querySelectorAll('[required]')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Back to dashboard' })).toHaveAttribute('href', '/partner');
    expect(details).toHaveBeenCalledWith('google-user');
  });

  it('keeps saving drafts after clearing a successful submission', () => {
    sessionStorage.setItem('details:submitted', '1');
    sessionStorage.setItem('details', JSON.stringify({ background: 'Old draft' }));
    render(<><form id="details"><input aria-label="Background" name="background" defaultValue="Saved answer" /></form>
      <FormDraftPersistence formId="details" storageKey="details" hasError={false} clearOnSuccess /></>);
    expect(screen.getByLabelText('Background')).toHaveValue('Saved answer');
    fireEvent.input(screen.getByLabelText('Background'), { target: { value: 'A new edit' } });
    expect(JSON.parse(sessionStorage.getItem('details')!)).toEqual({ background: 'A new edit' });
  });
});
