import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleAdsProvider, ApplicationConversion } from '@/components/program/google-ads-provider';
import { ATTRIBUTION_KEY, CONSENT_KEY, consentRecord } from '@/lib/analytics/google-ads';

const route = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));
vi.mock('next/script', () => ({ default: function FakeScript({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]); // Model a successful tag load without sending a request.
  return <span data-testid="google-tag" />;
} }));
vi.mock('@/lib/analytics/google-ads', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/analytics/google-ads')>(),
  getGoogleAdsConfig: () => ({ id: 'AW-123', label: 'application', origin: location.origin }),
}));

function commands() { return (window.dataLayer || []).map((item) => Array.from(item as ArrayLike<unknown>)); }
const transaction = 'a'.repeat(43);
function App({ id = transaction }: { id?: string | null }) {
  return <GoogleAdsProvider><ApplicationConversion transactionId={id} /><p>Application form</p></GoogleAdsProvider>;
}

beforeEach(() => {
  localStorage.clear();
  window.dataLayer = [];
  delete window.gtag;
  route.pathname = '/';
  history.replaceState({}, '', '/');
});
afterEach(cleanup);

describe('consent-gated Google Ads', () => {
  it('loads no tag and saves no attribution before consent or after decline', async () => {
    history.replaceState({}, '', '/?gclid=test-click');
    render(<App />);
    expect(await screen.findByText('Allow measurement')).toBeInTheDocument();
    expect(screen.queryByTestId('google-tag')).not.toBeInTheDocument();
    expect(localStorage.getItem(ATTRIBUTION_KEY)).toBeNull();
    fireEvent.click(screen.getByText('Decline'));
    expect(screen.queryByTestId('google-tag')).not.toBeInTheDocument();
    expect(commands()).toEqual([]);
    expect(screen.getByText('Application form')).toBeInTheDocument();
  });
  it('keeps OAuth data out and restores consented attribution after sign-in', async () => {
    history.replaceState({}, '', '/?gclid=test-click&utm_content=table_for_three&code=secret&email=person@example.com');
    const view = render(<App />);
    fireEvent.click(await screen.findByText('Allow measurement'));
    await screen.findByTestId('google-tag');
    expect(localStorage.getItem(ATTRIBUTION_KEY)).toContain('table_for_three');
    expect(JSON.stringify(commands())).not.toContain('secret');
    expect(JSON.stringify(commands())).not.toContain('person@example.com');
    view.unmount();
    history.replaceState({}, '', '/partner?applied=1');
    route.pathname = '/partner';
    render(<App />);
    await waitFor(() => expect(commands().some((cmd) => cmd[1] === 'conversion')).toBe(true));
    const event = commands().find((cmd) => cmd[1] === 'conversion')?.[2] as Record<string, unknown>;
    expect(event).toMatchObject({ send_to: 'AW-123/application', transaction_id: transaction });
    expect(event).not.toHaveProperty('value');
    expect(commands().filter((cmd) => cmd[0] === 'set').some((cmd) => JSON.stringify(cmd).includes('test-click'))).toBe(true);
  });
  it('does not turn an existing dashboard visit or URL flag into a conversion', async () => {
    localStorage.setItem(CONSENT_KEY, consentRecord('granted'));
    route.pathname = '/partner';
    history.replaceState({}, '', '/partner?applied=1');
    render(<App id={null} />);
    await screen.findByTestId('google-tag');
    expect(commands().some((cmd) => cmd[1] === 'conversion')).toBe(false);
  });
  it('deduplicates remounts and honours withdrawal', async () => {
    localStorage.setItem(CONSENT_KEY, consentRecord('granted'));
    route.pathname = '/partner';
    const view = render(<App />);
    await waitFor(() => expect(commands().filter((cmd) => cmd[1] === 'conversion')).toHaveLength(1));
    const event = commands().find((cmd) => cmd[1] === 'conversion')?.[2] as { event_callback: () => void };
    act(() => event.event_callback());
    view.unmount();
    render(<App />);
    await screen.findByTestId('google-tag');
    expect(commands().filter((cmd) => cmd[1] === 'conversion')).toHaveLength(1);
    fireEvent.click(screen.getByText('Privacy choices'));
    fireEvent.click(screen.getByText('Decline'));
    expect(screen.queryByTestId('google-tag')).not.toBeInTheDocument();
    expect(localStorage.getItem(ATTRIBUTION_KEY)).toBeNull();
    expect(commands().at(-1)).toEqual(['consent', 'update', {
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied',
    }]);
  });
});
