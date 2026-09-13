import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerAccessRefresh } from '@/components/program/partner-access-refresh';

const { refresh, router } = vi.hoisted(() => {
  const refresh = vi.fn();
  return { refresh, router: { refresh } };
});
vi.mock('next/navigation', () => ({ useRouter: () => router }));

beforeEach(() => {
  vi.useFakeTimers();
  refresh.mockClear();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ stateKey: 'submitted:approval_required' }) }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('partner approval refresh', () => {
  it('only refreshes when the server reports a new access state', async () => {
    const view = render(<PartnerAccessRefresh stateKey="submitted:approval_required" />);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ stateKey: 'approved_affiliate:agreement_required' }) } as Response);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('skips hidden tabs and deduplicates focus/visibility checks', async () => {
    const view = render(<PartnerAccessRefresh stateKey="submitted:approval_required" />);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetch).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    view.unmount();
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does not navigate or clear the page on a failed background check', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as Response);
    const view = render(<PartnerAccessRefresh stateKey="submitted:approval_required" />);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(refresh).not.toHaveBeenCalled();
    view.unmount();
  });
});
