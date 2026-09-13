'use client';

import Link from 'next/link';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ATTRIBUTION_KEY, CONSENT_KEY, DENIED_CONSENT, MEASUREMENT_CONSENT,
  attributionRecord, consentRecord, extractAttribution, getGoogleAdsConfig, readAttribution, readConsent,
  type AdsConsent,
} from '@/lib/analytics/google-ads';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const ConversionContext = createContext<(id: string) => void>(() => {});
const SENT_PREFIX = 'nom-ads-submitted:';
const SENT_TTL = 7 * 86_400_000;
const PUBLIC_PATHS = new Set(['/', '/apply', '/login', '/privacy', '/application-terms']);
let volatileConsent: string | null = null;
function subscribeConsent(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('nom-privacy-choice', listener);
  window.addEventListener('focus', listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('nom-privacy-choice', listener);
    window.removeEventListener('focus', listener);
  };
}
const consentSnapshot = () => readConsent(stored(CONSENT_KEY) || volatileConsent);
const serverConsentSnapshot = () => null;
const clientHydratedSnapshot = () => true;
const serverHydratedSnapshot = () => false;

function stored(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function store(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Continue without persistent storage. */ }
}

function clearAttribution() {
  try { localStorage.removeItem(ATTRIBUTION_KEY); } catch { /* Storage may be disabled. */ }
  const host = location.hostname;
  const domains = ['', host, `.${host}`];
  // Google tag cookies may have been written on a parent domain.
  const labels = host.split('.');
  for (let i = 1; i < labels.length - 1; i++) domains.push(`.${labels.slice(i).join('.')}`);
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (!name.startsWith('_gcl_')) continue;
    for (const domain of domains) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax; Secure${domain ? `; Domain=${domain}` : ''}`;
  }
}

function hasSentMarker(key: string) {
  const expires = Number(stored(key));
  if (Number.isFinite(expires) && expires > Date.now()) return true;
  try { localStorage.removeItem(key); } catch { /* Google still deduplicates transaction IDs. */ }
  return false;
}

export function GoogleAdsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, consentSnapshot, serverConsentSnapshot);
  const hydrated = useSyncExternalStore(subscribeConsent, clientHydratedSnapshot, serverHydratedSnapshot);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);
  const sent = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  const config = useMemo(() => getGoogleAdsConfig(), []);
  const enabled = Boolean(config && typeof window !== 'undefined' && location.origin === config.origin);
  const eligiblePage = PUBLIC_PATHS.has(pathname) || pathname === '/partner';

  useEffect(() => {
    if (!enabled || !eligiblePage || !hydrated || consent === 'granted') return;
    if (initialized.current) window.gtag?.('consent', 'update', DENIED_CONSENT);
    clearAttribution();
  }, [consent, hydrated, enabled, eligiblePage]);

  useEffect(() => {
    if (!enabled || !eligiblePage || consent !== 'granted' || !config) return;
    const current = extractAttribution(location.search);
    const hasNewClick = Boolean(current.gclid || current.gbraid || current.wbraid);
    const previous = readAttribution(stored(ATTRIBUTION_KEY));
    const attribution = hasNewClick ? current : { ...previous, ...current };
    if (Object.keys(current).length) store(ATTRIBUTION_KEY, attributionRecord(attribution));
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      // Google's command queue consumes IArguments, not ordinary event objects.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
    if (!initialized.current) {
      window.gtag('consent', 'default', DENIED_CONSENT);
      window.gtag('set', 'ads_data_redaction', true);
      window.gtag('js', new Date());
      initialized.current = true;
    }
    window.gtag('consent', 'update', MEASUREMENT_CONSENT);
    // Explicit safe metadata prevents auth codes, application errors, and names
    // in the portal from becoming URL/title/referrer parameters.
    window.gtag('set', {
      page_location: `${config.origin}${pathname}${Object.keys(attribution).length ? `?${new URLSearchParams(attribution)}` : ''}`,
      page_referrer: '', page_title: 'Nom Partner Program',
    });
    window.gtag('config', config.id, {
      send_page_view: false, allow_google_signals: false,
      allow_ad_personalization_signals: false, allow_enhanced_conversions: false,
      cookie_domain: location.hostname,
    });
  }, [consent, enabled, eligiblePage, pathname, config]);

  const reportConversion = useCallback((transactionId: string) => {
    if (!enabled || !ready || consent !== 'granted' || !config || pathname !== '/partner') return;
    if (!/^[\w-]{43}$/.test(transactionId)) return;
    const key = `${SENT_PREFIX}${config.id}/${config.label}:${transactionId}`;
    if (sent.current.has(key) || pending.current.has(key) || hasSentMarker(key)) return;
    pending.current.add(key);
    window.gtag?.('event', 'conversion', {
      send_to: `${config.id}/${config.label}`,
      transaction_id: transactionId,
      // No speculative revenue value or applicant form data.
      event_callback: () => {
        sent.current.add(key);
        pending.current.delete(key);
        store(key, String(Date.now() + SENT_TTL));
      },
    });
    // A reload may retry an unacknowledged event using the same transaction ID;
    // Google Ads performs the authoritative conversion deduplication.
  }, [enabled, ready, consent, pathname, config]);

  function choose(choice: AdsConsent) {
    const record = consentRecord(choice);
    store(CONSENT_KEY, record);
    volatileConsent = stored(CONSENT_KEY) === record ? null : record;
    window.dispatchEvent(new Event('nom-privacy-choice'));
    setSettingsOpen(false);
    if (choice === 'denied') {
      window.gtag?.('consent', 'update', DENIED_CONSENT);
      clearAttribution();
    }
  }

  const showBanner = enabled && eligiblePage && hydrated && (consent === null || settingsOpen);
  return (
    <ConversionContext.Provider value={reportConversion}>
      {children}
      {enabled && eligiblePage && consent === 'granted' && config ? (
        <Script id="nom-google-ads" src={`https://www.googletagmanager.com/gtag/js?id=${config.id}`}
          strategy="afterInteractive" onReady={() => setReady(true)} />
      ) : null}
      {showBanner ? (
        <section aria-label="Advertising measurement preferences" className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-h-[calc(100dvh-1.5rem)] max-w-lg flex-col rounded-xl border border-plum/20 bg-paper p-5 text-ink shadow-xl">
          <h2 className="shrink-0 font-display text-xl font-bold">Help us measure our ads?</h2>
          <div className="min-h-0 overflow-y-auto py-3 text-sm leading-6">
            <p>With your permission, Google receives ad-click identifiers, device/browser information and a completed-application event to measure which ads work. We don’t send your application answers or enable personalised ads. Applying works either way.</p>
            <Link href="/privacy" className="underline">Privacy notice</Link>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <button type="button" className="rounded-lg border border-plum px-4 py-2 font-bold" onClick={() => choose('denied')}>Decline</button>
            <button type="button" className="rounded-lg border border-plum px-4 py-2 font-bold" onClick={() => choose('granted')}>Allow measurement</button>
          </div>
        </section>
      ) : enabled && eligiblePage && hydrated ? (
        <button type="button" onClick={() => setSettingsOpen(true)} className="fixed bottom-2 left-2 z-40 rounded border bg-paper px-3 py-2 text-xs text-ink shadow-sm">Privacy choices</button>
      ) : null}
    </ConversionContext.Provider>
  );
}

export function ApplicationConversion({ transactionId }: { transactionId: string | null }) {
  const report = useContext(ConversionContext);
  useEffect(() => { if (transactionId) report(transactionId); }, [report, transactionId]);
  return null;
}
