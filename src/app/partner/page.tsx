import Link from 'next/link';
import { ConfigRequired } from '@/components/program/config-required';
import { ApprovalStateNotice } from '@/components/program/approval-state-notice';
import { EmptyState } from '@/components/program/empty-state';
import { MetricCard } from '@/components/program/metric-card';
import { PageHeader } from '@/components/program/page-header';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';
import { formatCurrency } from '@/lib/partner-program/format';
import { getPartnerDashboard, summarizeEarnings } from '@/lib/partner-program/data';
import { partnerTierLabels } from '@/lib/partner-program/labels';
import { evaluatePartnerLeadAccess } from '@/lib/partner-program/lead-access';

export default async function PartnerDashboardPage() {
  try {
    const user = await requireUser('/partner');
    const dashboard = await getPartnerDashboard(user.id, user.email);

    if (!dashboard.profile) {
      return (
        <EmptyState
          title="Finish your partner application"
          description="Your login is confirmed, but no partner profile has been saved yet. Continue the application to unlock your referral code and portal."
          actionHref="/apply"
          actionLabel="Finish application"
        />
      );
    }

    const earnings = summarizeEarnings(dashboard.commissions);
    const leadAccess = evaluatePartnerLeadAccess(dashboard.profile, dashboard.agreementAcceptance);
    const gettingStartedSteps = [
      {
        label: 'Partner profile created',
        complete: true,
        href: '/partner',
        actionLabel: 'View dashboard',
      },
      {
        label: leadAccess.allowed
          ? 'Submit your first restaurant lead'
          : leadAccess.code === 'agreement_required'
            ? 'Accept the Referral Partner Agreement'
            : 'Wait for Nom approval',
        complete: leadAccess.allowed,
        href: leadAccess.allowed
          ? '/partner/leads'
          : leadAccess.code === 'agreement_required'
            ? '/partner/agreement'
            : '/partner',
        actionLabel: leadAccess.allowed
          ? 'Submit a lead'
          : leadAccess.code === 'agreement_required'
            ? 'Review agreement'
            : 'View approval state',
      },
      {
        label: 'Add payout details',
        complete: dashboard.payoutMethods.length > 0,
        href: '/partner/payouts',
        actionLabel: 'Add payout details',
      },
    ];
    const completedSteps = gettingStartedSteps.filter((step) => step.complete).length;
    const gettingStartedProgress = Math.round((completedSteps / gettingStartedSteps.length) * 100);
    const nextStep = gettingStartedSteps.find((step) => !step.complete);

    return (
      <div className="grid gap-8">
        <PageHeader eyebrow="Partner portal" title={`Welcome, ${dashboard.profile.full_name}`} description="Track application access, restaurant opportunities, eligible commissions, and payout progress." />
        {!leadAccess.allowed ? <ApprovalStateNotice access={leadAccess} /> : null}
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Estimated" value={formatCurrency(earnings.estimated)} helper="Future commission" />
          <MetricCard label="Pending" value={formatCurrency(earnings.pending)} helper="Under validation" />
          <MetricCard label="Approved" value={formatCurrency(earnings.approved)} helper="Ready for payout cycle" />
          <MetricCard label="Paid" value={formatCurrency(earnings.paid)} helper="Completed payouts" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>What to do next</CardTitle>
              <CardDescription>
                {nextStep ? nextStep.label : 'You’re ready to submit and track restaurant opportunities.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {leadAccess.allowed ? <Button asChild><Link href={nextStep?.href ?? '/partner/leads'}>{nextStep?.actionLabel ?? 'Register restaurant lead'}</Link></Button> : null}
              <Button variant="outline" asChild><Link href="/partner/resources">Open sales kit</Link></Button>
              {dashboard.setupChecklists.length > 0 ? (
                <Button variant="outline" asChild><Link href="/partner/setup">View restaurant setup</Link></Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Partner level</CardTitle>
              <CardDescription>{partnerTierLabels[dashboard.profile.tier]}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Application</span>
                <StatusBadge status={dashboard.profile.application_status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Referral code</span>
                <code className="rounded bg-muted px-2 py-1 text-sm">{dashboard.profile.referral_code}</code>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Deal pipeline</CardTitle>
              <CardDescription>Your latest restaurant opportunities.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {dashboard.deals.slice(0, 6).map((deal) => (
                <div key={deal.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">{deal.partner_leads?.restaurant_name ?? 'Restaurant'}</div>
                    <div className="text-sm text-muted-foreground">{deal.next_action || 'No next action set'}</div>
                    <div className="text-xs text-muted-foreground">
                      {deal.requested_subscription_plans?.name ?? 'Requested package pending'} → {deal.subscription_plans?.name ?? 'approval pending'} · Onboarding{' '}
                      {deal.partner_platform_onboarding_requests?.status ?? 'not required yet'}
                    </div>
                  </div>
                  <StatusBadge status={deal.stage} />
                </div>
              ))}
              {dashboard.deals.length === 0 ? (
                <EmptyState
                  title="No deals yet"
                  description="Accepted leads become tracked opportunities here."
                  actionHref={leadAccess.allowed ? '/partner/leads' : undefined}
                  actionLabel={leadAccess.allowed ? 'Submit first lead' : undefined}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Getting started</CardTitle>
              <CardDescription>{completedSteps} of {gettingStartedSteps.length} account steps complete.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Progress value={gettingStartedProgress} />
              {gettingStartedSteps.map((step) => (
                <div key={step.label} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{step.label}</span>
                  <span className={step.complete ? 'text-sm font-medium text-primary' : 'text-sm text-muted-foreground'}>
                    {step.complete ? 'Done' : 'To do'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
