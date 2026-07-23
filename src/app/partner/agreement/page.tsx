import Link from 'next/link';
import { CheckCircle2, FileSignature } from 'lucide-react';
import { acceptReferralPartnerAgreementAction } from '@/app/actions/partner';
import { ApprovalStateNotice } from '@/components/program/approval-state-notice';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { ErrorBanner } from '@/components/program/error-banner';
import { PageHeader } from '@/components/program/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartnerAgreementState } from '@/lib/partner-program/data';
import { evaluatePartnerLeadAccess } from '@/lib/partner-program/lead-access';
import {
  REFERRAL_PARTNER_AGREEMENT_EFFECTIVE_DATE,
  REFERRAL_PARTNER_AGREEMENT_TITLE,
  REFERRAL_PARTNER_AGREEMENT_VERSION,
  referralPartnerAgreementSections,
} from '@/lib/partner-program/referral-agreement';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerAgreementPage({
  searchParams,
}: {
  searchParams: Promise<{ accepted?: string; error?: string }>;
}) {
  try {
    const params = await searchParams;
    const user = await requireUser('/partner/agreement');
    const agreementState = await getPartnerAgreementState(user.id);

    if (!agreementState.profile) {
      return (
        <EmptyState
          title="Finish your partner application"
          description="Your application must be submitted and approved before you can accept the Referral Partner Agreement."
          actionHref="/apply"
          actionLabel="Finish application"
        />
      );
    }

    const access = evaluatePartnerLeadAccess(agreementState.profile, agreementState.agreementAcceptance);

    if (access.allowed) {
      const acceptance = agreementState.agreementAcceptance;
      return (
        <div className="grid gap-7">
          <PageHeader
            eyebrow="Partner portal"
            title="Referral Partner Agreement"
            description="Your current agreement acceptance and receipt."
          />
          <Card className="border-success/30 bg-lime/25">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-success text-white">
                  <CheckCircle2 className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Agreement accepted</CardTitle>
                  <CardDescription className="mt-1">
                    {acceptance
                      ? `Version ${acceptance.agreement_version} · ${new Date(acceptance.accepted_at).toLocaleString('en-IN')}`
                      : 'Current version accepted'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              {acceptance ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Receipt ID</dt>
                    <dd className="mt-1 break-all font-mono text-xs">{acceptance.id}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Document fingerprint</dt>
                    <dd className="mt-1 break-all font-mono text-xs">{acceptance.agreement_sha256}</dd>
                  </div>
                </dl>
              ) : null}
              <div>
                <Button variant="outline" asChild>
                  <Link href="/referral-partner-agreement" target="_blank">
                    Open accepted agreement
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (access.code !== 'agreement_required') {
      return (
        <div className="grid gap-7">
          <PageHeader
            eyebrow="Partner portal"
            title="Referral Partner Agreement"
            description="Agreement acceptance becomes available after approval."
          />
          <ApprovalStateNotice access={access} />
          <div>
            <Button variant="outline" asChild>
              <Link href="/referral-partner-agreement" target="_blank">
                Preview the agreement
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-7">
        <PageHeader
          eyebrow="Partner portal"
          title="Review and accept"
          description="Accept the current Referral Partner Agreement to unlock restaurant lead submission."
        />
        <ErrorBanner message={params.error} />
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-plum text-paper">
                <FileSignature className="size-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>{REFERRAL_PARTNER_AGREEMENT_TITLE}</CardTitle>
                <CardDescription className="mt-1">
                  Version {REFERRAL_PARTNER_AGREEMENT_VERSION} · Effective {REFERRAL_PARTNER_AGREEMENT_EFFECTIVE_DATE}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-[36rem] overflow-y-auto rounded-lg border bg-paper p-5 sm:p-7" tabIndex={0}>
              <div className="divide-y divide-plum/15">
                {referralPartnerAgreementSections.map((section) => (
                  <section className="py-6 first:pt-0 last:pb-0" key={section.title}>
                    <h2 className="font-display text-xl font-bold">{section.title}</h2>
                    {'paragraphs' in section
                      ? section.paragraphs.map((paragraph) => (
                          <p className="mt-3 text-sm leading-7 text-ink-body" key={paragraph}>
                            {paragraph}
                          </p>
                        ))
                      : null}
                    {'bullets' in section ? (
                      <ul className="mt-3 grid gap-2 pl-5 text-sm leading-7 text-ink-body">
                        {section.bullets.map((bullet) => (
                          <li className="list-disc pl-1" key={bullet}>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            </div>

            <form action={acceptReferralPartnerAgreementAction} className="mt-6 grid gap-5">
              <input type="hidden" name="agreementVersion" value={REFERRAL_PARTNER_AGREEMENT_VERSION} />
              <label className="flex items-start gap-3 rounded-lg border border-plum/20 bg-lilac/40 p-4 text-sm leading-6">
                <input
                  className="mt-1 size-4 shrink-0 accent-plum"
                  name="agreementAccepted"
                  type="checkbox"
                  required
                />
                <span>
                  I have read and accept the {REFERRAL_PARTNER_AGREEMENT_TITLE}, version{' '}
                  {REFERRAL_PARTNER_AGREEMENT_VERSION}. If I am accepting for an organisation, I confirm that I am
                  authorised to bind it.
                </span>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button type="submit">Accept and continue</Button>
                <Button variant="outline" asChild>
                  <Link href="/referral-partner-agreement" target="_blank">
                    Open printable version
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
