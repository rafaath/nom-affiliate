import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalDocument } from '@/components/legal/legal-document';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { MarketingHeader } from '@/components/shell/marketing-header';
import {
  APPLICATION_TERMS_EFFECTIVE_DATE,
  APPLICATION_TERMS_VERSION,
  applicationTerms,
} from '@/lib/partner-program/terms';
import { getCurrentUser } from '@/lib/supabase/auth';

export const metadata: Metadata = {
  title: 'Partner Application Terms',
};

export default async function ApplicationTermsPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader currentUser={currentUser} />
      <LegalDocument
        eyebrow="Application legal"
        title="Partner Application Terms"
        version={APPLICATION_TERMS_VERSION}
        effectiveDate={APPLICATION_TERMS_EFFECTIVE_DATE}
        introduction={
          <p>
            These terms cover only your application and account review. If approved, you will separately accept the{' '}
            <Link className="font-bold text-primary underline underline-offset-4" href="/referral-partner-agreement">
              Referral Partner Agreement
            </Link>{' '}
            before submitting restaurant leads.
          </p>
        }
        sections={applicationTerms.map((term) => ({
          title: term.title,
          paragraphs: [term.body],
        }))}
        footer={
          <p>
            The accompanying{' '}
            <Link className="font-bold text-primary underline underline-offset-4" href="/privacy">
              Partner Program Privacy Notice
            </Link>{' '}
            explains how Nom handles application information.
          </p>
        }
      />
      <MarketingFooter isSignedIn={Boolean(currentUser)} />
    </div>
  );
}

