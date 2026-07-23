import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { MarketingHeader } from '@/components/shell/marketing-header';
import {
  REFERRAL_PARTNER_AGREEMENT_EFFECTIVE_DATE,
  REFERRAL_PARTNER_AGREEMENT_TITLE,
  REFERRAL_PARTNER_AGREEMENT_VERSION,
  referralPartnerAgreementSections,
} from '@/lib/partner-program/referral-agreement';
import { getCurrentUser } from '@/lib/supabase/auth';

export const metadata: Metadata = {
  title: 'Referral Partner Agreement',
};

export default async function ReferralPartnerAgreementPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader currentUser={currentUser} />
      <LegalDocument
        eyebrow="Partner legal"
        title={REFERRAL_PARTNER_AGREEMENT_TITLE}
        version={REFERRAL_PARTNER_AGREEMENT_VERSION}
        effectiveDate={REFERRAL_PARTNER_AGREEMENT_EFFECTIVE_DATE}
        introduction={
          <p>
            This agreement governs approved referral partners. Viewing it does not make an applicant a partner; an approved partner must accept it through the authenticated portal.
          </p>
        }
        sections={referralPartnerAgreementSections}
      />
      <MarketingFooter isSignedIn={Boolean(currentUser)} />
    </div>
  );
}
