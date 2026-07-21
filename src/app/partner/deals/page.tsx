import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { PageHeader } from '@/components/program/page-header';
import { StatusBadge } from '@/components/program/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartnerDashboard } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerDealsPage() {
  try {
    const user = await requireUser('/partner/deals');
    const dashboard = await getPartnerDashboard(user.id, user.email);

    return (
      <div>
      <PageHeader eyebrow="Partner portal" title="Deals" description="Track accepted restaurants through their sales and go-live stages." />
      <Card>
        <CardHeader>
          <CardTitle>Restaurant deal pipeline</CardTitle>
          <CardDescription>Track every accepted restaurant from intro to go-live.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {dashboard.deals.map((deal) => (
            <div key={deal.id} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <div className="font-semibold">{deal.partner_leads?.restaurant_name ?? 'Restaurant'}</div>
                <div className="text-sm text-muted-foreground">{deal.next_action || 'Awaiting next action'}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Requested {deal.requested_subscription_plans?.name ?? 'unknown plan'} · Approved {deal.subscription_plans?.name ?? 'pending'} · Onboarding{' '}
                  {deal.partner_platform_onboarding_requests?.status ?? 'not required'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Franchise {deal.franchise_id ?? deal.partner_platform_onboarding_requests?.created_franchise_id ?? 'pending'} · Branch{' '}
                  {deal.branch_id ?? deal.partner_platform_onboarding_requests?.created_branch_id ?? 'pending'}
                </div>
              </div>
              <StatusBadge status={deal.stage} />
              <div className="text-sm font-semibold">{formatCurrency(deal.expected_commission_cents || 0)}</div>
            </div>
          ))}
          {dashboard.deals.length === 0 ? (
            <EmptyState
              title="No accepted deals yet"
              description="When Nom accepts a lead, the deal pipeline appears here."
            />
          ) : null}
        </CardContent>
      </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
