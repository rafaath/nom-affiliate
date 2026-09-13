'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function PartnerAccessRefresh({ stateKey }: { stateKey: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    let stopped = false;
    let changed = false;
    let controller: AbortController | undefined;
    let lastChecked = Date.now();

    async function check() {
      if (stopped || changed || controller || document.visibilityState !== 'visible') return;
      // Focus and visibility events can fire together; never send duplicate polls.
      if (Date.now() - lastChecked < 5_000) return;
      lastChecked = Date.now();
      controller = new AbortController();
      const timer = setTimeout(() => controller?.abort(), 12_000);
      try {
        const response = await fetch('/api/partner/access', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data: { stateKey?: string } = await response.json();
        if (!stopped && typeof data.stateKey === 'string' && data.stateKey !== stateKey) {
          changed = true;
          startTransition(() => router.refresh());
        }
      } catch {
        // A background check must not erase the current page or sign the user out.
      } finally {
        clearTimeout(timer);
        controller = undefined;
      }
    }

    const interval = setInterval(() => void check(), 30_000);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      stopped = true;
      clearInterval(interval);
      controller?.abort();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [router, stateKey]);

  return null;
}
