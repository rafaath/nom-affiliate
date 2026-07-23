import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { MarketingHeader } from '@/components/shell/marketing-header';
import {
  PARTNER_PRIVACY_NOTICE_EFFECTIVE_DATE,
  PARTNER_PRIVACY_NOTICE_VERSION,
  partnerPrivacyNoticeSections,
} from '@/lib/partner-program/privacy-notice';
import { getCurrentUser } from '@/lib/supabase/auth';

export const metadata: Metadata = {
  title: 'Partner Program Privacy Notice',
};

export default async function PartnerPrivacyPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader currentUser={currentUser} />
      <LegalDocument
        eyebrow="Privacy"
        title="Partner Program Privacy Notice"
        version={PARTNER_PRIVACY_NOTICE_VERSION}
        effectiveDate={PARTNER_PRIVACY_NOTICE_EFFECTIVE_DATE}
        introduction={
          <p>
            This notice covers partner applications, partner accounts, restaurant referrals, commissions, payouts, and related program communications.
          </p>
        }
        sections={partnerPrivacyNoticeSections}
      />
      <MarketingFooter isSignedIn={Boolean(currentUser)} />
    </div>
  );
}

