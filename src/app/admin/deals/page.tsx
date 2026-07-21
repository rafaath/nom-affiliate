import { updateDealStageAction } from '@/app/actions/admin';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { PageHeader } from '@/components/program/page-header';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { dealStageLabels } from '@/lib/partner-program/labels';
import { legalDealStageTargets } from '@/lib/partner-program/status-machine';
import type { DealStage } from '@/lib/partner-program/types';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminDealsPage() {
  try {
    await requirePartnerAdmin('/admin/deals');
    const dashboard = await getAdminDashboard();
    const plans = dashboard.platformCatalog.plans;
    const features = dashboard.platformCatalog.features;

    return (
      <div>
        <PageHeader eyebrow="Partner admin" title="Deals" description="Move accepted opportunities through legal stages without replaying downstream work." />
      <Card>
        <CardHeader>
          <CardTitle>Platform deal management</CardTitle>
          <CardDescription>Move opportunities while keeping plan, features, onboarding requests, and attribution tied to RMS facts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {dashboard.deals.map((deal) => (
            <div key={deal.id} className="record-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{deal.partner_leads?.restaurant_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Partner: {deal.partner_profiles?.full_name} · Expected {formatCurrency(deal.expected_commission_cents || 0)}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Platform: {deal.platform_link_kind?.replaceAll('_', ' ') ?? 'not linked'} · Plan{' '}
                    {deal.subscription_plans?.name ?? 'not selected'} · Onboarding{' '}
                    {deal.partner_platform_onboarding_requests?.status ?? 'not required'}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Affiliate requested {deal.requested_subscription_plans?.name ?? 'unknown plan'} · {deal.requested_branch_count ?? 1} branches ·{' '}
                    {(deal.requested_feature_codes ?? []).length} capabilities · Preview{' '}
                    {formatCurrency(deal.requested_commission_preview_cents || 0, deal.requested_subscription_plans?.currency_code)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Franchise {deal.franchise_id ?? 'pending'} · Branch {deal.branch_id ?? 'pending'}
                  </div>
                </div>
                <StatusBadge status={deal.stage} />
              </div>
              <form action={updateDealStageAction} className="mt-4 grid gap-3">
                <input type="hidden" name="dealId" value={deal.id} />
                <div className="grid gap-3 xl:grid-cols-3">
                  <div className="grid gap-2"><Label htmlFor={`deal-stage-${deal.id}`}>Deal stage</Label><NativeSelect id={`deal-stage-${deal.id}`} name="stage" defaultValue={deal.stage}>
                    {legalDealStageTargets(deal.stage as DealStage).map((stage) => (
                      <option key={stage} value={stage}>{dealStageLabels[stage]}</option>
                    ))}
                  </NativeSelect></div>
                  <div className="grid gap-2"><Label htmlFor={`deal-plan-${deal.id}`}>Approved plan</Label><NativeSelect id={`deal-plan-${deal.id}`} name="requestedPlanId" defaultValue={deal.subscription_plan_id ?? ''}>
                    <option value="">Default best-fit plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {plan.currency_code} {(plan.price_cents / 100).toLocaleString()}
                      </option>
                    ))}
                  </NativeSelect></div>
                  <div className="grid gap-2"><Label htmlFor={`deal-branches-${deal.id}`}>Branch count</Label><Input id={`deal-branches-${deal.id}`} name="requestedBranchCount" type="number" min={1} defaultValue={deal.requested_branch_count || 1} /></div>
                </div>
                <div className="grid gap-2 rounded-lg border p-3">
                  <div className="text-sm font-medium">Sold platform capabilities</div>
                  <div className="grid gap-2 md:grid-cols-3">
                    {features.map((feature) => (
                      <label key={feature.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="requestedFeatureCodes"
                          value={feature.code}
                          defaultChecked={(deal.products_sold ?? []).includes(feature.code)}
                        />
                        <span>{feature.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                  <div className="grid gap-2"><Label htmlFor={`deal-commission-${deal.id}`}>Expected commission (cents)</Label><Input id={`deal-commission-${deal.id}`} name="expectedCommissionCents" type="number" min={0} defaultValue={deal.expected_commission_cents ?? 0} /></div>
                  <div className="grid gap-2"><Label htmlFor={`deal-note-${deal.id}`}>Next action / note</Label><Input id={`deal-note-${deal.id}`} name="note" defaultValue={deal.next_action ?? ''} /></div>
                  <Button type="submit">Update deal</Button>
                </div>
              </form>
            </div>
          ))}
          {dashboard.deals.length === 0 ? <EmptyState title="No deals" description="Accepted leads become deals here." /> : null}
        </CardContent>
      </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
