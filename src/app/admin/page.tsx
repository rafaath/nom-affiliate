import { ConfigRequired } from '@/components/program/config-required';
import { MetricCard } from '@/components/program/metric-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminPage() {
  try {
    await requirePartnerAdmin('/admin');
    const dashboard = await getAdminDashboard();
    const approvedCommission = dashboard.commissions
      .filter((commission) => commission.status === 'approved')
      .reduce((sum, commission) => sum + Number(commission.amount_cents || 0), 0);
    const pendingCommission = dashboard.commissions
      .filter((commission) => ['pending', 'under_review'].includes(commission.status))
      .reduce((sum, commission) => sum + Number(commission.amount_cents || 0), 0);

    return (
      <div className="grid gap-8">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Partner signups" value={dashboard.partners.length} helper="All partner profiles" />
          <MetricCard label="Leads submitted" value={dashboard.leads.length} helper="Partner-driven prospects" />
          <MetricCard label="Won deals" value={dashboard.deals.filter((deal) => ['won', 'setup_pending', 'setup_in_progress', 'live'].includes(deal.stage)).length} helper="Closed opportunities" />
          <MetricCard label="Approved payout" value={formatCurrency(approvedCommission)} helper="Ready to batch" />
        </section>
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Operational queue</CardTitle>
              <CardDescription>Work Nom must review.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <QueueRow label="Applications pending review" value={dashboard.applications.filter((item) => ['submitted', 'under_review', 'needs_more_information', 'interview_requested'].includes(item.status)).length} />
              <QueueRow label="Leads pending review" value={dashboard.leads.filter((item) => ['submitted', 'under_review'].includes(item.status)).length} />
              <QueueRow label="Platform onboarding requests" value={dashboard.onboardingRequests.filter((item) => ['submitted', 'approved', 'provisioning', 'failed'].includes(item.status)).length} />
              <QueueRow label="Setup pending approval" value={dashboard.setupChecklists.filter((item) => item.status === 'submitted_for_review').length} />
              <QueueRow label="Commission pending review" value={dashboard.commissions.filter((item) => ['pending', 'under_review'].includes(item.status)).length} />
              <QueueRow label="Open disputes" value={dashboard.disputes.filter((item) => ['open', 'under_review', 'needs_partner_response'].includes(item.status)).length} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Money controls</CardTitle>
              <CardDescription>Payout cycle health.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <QueueRow label="Pending commission value" value={formatCurrency(pendingCommission)} />
              <QueueRow label="Approved commission value" value={formatCurrency(approvedCommission)} />
              <QueueRow label="Active platform plans" value={dashboard.platformCatalog.plans.length} />
              <QueueRow label="Partner-attributed franchises" value={dashboard.platformAttributions.length} />
              <QueueRow label="Payout methods to verify" value={dashboard.payoutMethods.filter((item) => item.status === 'pending_approval').length} />
              <QueueRow label="Payout batches" value={dashboard.payoutBatches.length} />
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

function QueueRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
