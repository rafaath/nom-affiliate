import Link from 'next/link';
import { completeTrainingStepAction } from '@/app/actions/partner';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { MetricCard } from '@/components/program/metric-card';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';
import { formatCurrency } from '@/lib/partner-program/format';
import { getPartnerDashboard, summarizeEarnings } from '@/lib/partner-program/data';
import { partnerTierLabels } from '@/lib/partner-program/labels';

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
    const completed = dashboard.trainingProgress.filter((item) => item.status === 'completed').length;
    const progress = dashboard.trainingProgress.length
      ? Math.round((completed / dashboard.trainingProgress.length) * 100)
      : 0;

    return (
      <div className="grid gap-8">
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
              <CardDescription>Keep the partner engine moving.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button asChild><Link href="/partner/leads">Register restaurant lead</Link></Button>
              <Button variant="outline" asChild><Link href="/partner/resources">Open sales kit</Link></Button>
              <Button variant="outline" asChild><Link href="/partner/payouts">Add payout details</Link></Button>
              <Button variant="outline" asChild><Link href="/partner/setup">Review setup checklist</Link></Button>
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
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Onboarding</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
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
                  actionHref="/partner/leads"
                  actionLabel="Submit first lead"
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Onboarding checklist</CardTitle>
              <CardDescription>Complete the path to your first commission.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {dashboard.trainingProgress.map((item) => (
                <div key={item.module_key} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium capitalize">{String(item.module_key).replaceAll('_', ' ')}</div>
                    <StatusBadge status={item.status} />
                  </div>
                  {item.status !== 'completed' ? (
                    <form action={completeTrainingStepAction}>
                      <input type="hidden" name="moduleKey" value={item.module_key} />
                      <Button size="sm" variant="outline" type="submit">Mark done</Button>
                    </form>
                  ) : null}
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
