import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { StatusBadge } from '@/components/program/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminOnboardingPage() {
  try {
    await requirePartnerAdmin('/admin/onboarding');
    const dashboard = await getAdminDashboard();

    return (
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform onboarding handoff</CardTitle>
            <CardDescription>New restaurant deals that internal dashboard must approve and provision.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {dashboard.onboardingRequests.map((request) => (
              <div key={request.id} className="grid gap-3 rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{request.restaurant_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Partner {request.partner_profiles?.full_name} · {request.city} · Plan {request.subscription_plans?.name}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Affiliate requested {request.affiliate_subscription_plans?.name ?? 'unknown plan'} · Approved {request.subscription_plans?.name ?? 'pending'} ·{' '}
                      {request.requested_feature_codes?.length ?? 0} approved capabilities · {request.requested_branch_count} branches
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {request.legal_business_name ?? request.restaurant_name} · {request.branch_address ?? 'address missing'} · {request.state ?? 'state missing'} ·{' '}
                      {request.owner_email}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Request {request.id} · Deal {request.deal_id} · Franchise {request.created_franchise_id ?? 'pending'} · Branch{' '}
                      {request.created_branch_id ?? 'pending'}
                    </div>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                {request.execution_error ? <div className="rounded-lg border p-3 text-sm text-destructive">{request.execution_error}</div> : null}
              </div>
            ))}
            {dashboard.onboardingRequests.length === 0 ? (
              <EmptyState title="No onboarding requests" description="Accepted new-restaurant deals create requests here." />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Partner attribution ledger</CardTitle>
            <CardDescription>Franchises and branches currently attributed to partners.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboard.platformAttributions.map((attribution) => (
              <div key={attribution.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="font-medium">{attribution.franchises?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Partner {attribution.partner_profiles?.full_name} · {attribution.attribution_kind} · Branch{' '}
                    {attribution.branches?.name ?? 'all'}
                  </div>
                </div>
                <StatusBadge status={attribution.is_active ? 'active' : 'inactive'} />
              </div>
            ))}
            {dashboard.platformAttributions.length === 0 ? (
              <EmptyState title="No attributions" description="Won or provisioned deals create partner attribution rows." />
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
