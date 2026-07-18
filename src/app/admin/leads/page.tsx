import { reviewLeadAction } from '@/app/actions/admin';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminLeadsPage() {
  try {
    await requirePartnerAdmin('/admin/leads');
    const dashboard = await getAdminDashboard();
    const plans = dashboard.platformCatalog.plans;
    const features = dashboard.platformCatalog.features;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform-native lead review queue</CardTitle>
          <CardDescription>Accept valid leads only after duplicate, existing customer, plan, and platform scope checks.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {dashboard.leads.map((lead) => (
            <div key={lead.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{lead.restaurant_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {lead.city} · {lead.locality} · submitted by {lead.partner_profiles?.full_name}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Match: {lead.platform_match_kind ?? 'not checked'} · Confidence {lead.platform_match_confidence ?? 0}%
                  </div>
                  <div className="mt-2 rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">Affiliate requested package</div>
                    <div className="text-muted-foreground">
                      {lead.requested_subscription_plans?.name ?? 'No plan selected'} · {lead.requested_branch_count ?? lead.outlet_count} branches ·{' '}
                      {formatCurrency(lead.requested_monthly_revenue_cents || 0, lead.requested_subscription_plans?.currency_code)} monthly value ·{' '}
                      {formatCurrency(lead.requested_commission_preview_cents || 0, lead.requested_subscription_plans?.currency_code)} commission preview
                    </div>
                    <div className="text-muted-foreground">
                      {(lead.requested_feature_codes ?? []).length} requested capabilities · {lead.legal_business_name ?? lead.restaurant_name} ·{' '}
                      {lead.branch_address ?? 'address missing'} {lead.state ? `· ${lead.state}` : ''}
                    </div>
                    <div className="text-muted-foreground">
                      Partner says {lead.affiliate_reported_platform_link_kind?.replaceAll('_', ' ') ?? 'new restaurant'} ·{' '}
                      {lead.affiliate_reported_existing_customer_notes || 'no existing-customer note'}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{lead.relationship_context}</p>
                </div>
                <StatusBadge status={lead.status} />
              </div>
              {(lead.platform_match_evidence ?? []).length > 0 ? (
                <details className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
                  <summary className="cursor-pointer font-medium">Match evidence</summary>
                  <div className="mt-3 grid gap-2">
                    {(lead.platform_match_evidence ?? []).map((item: any) => (
                      <div key={`${item.source}-${item.id}`} className="rounded-md border bg-background p-3">
                        <div className="font-medium">
                          {item.source.replaceAll('_', ' ')} · {item.label} · {item.score}%
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {(item.signals ?? []).map((signal: any) => signal.reason).join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
              <form action={reviewLeadAction} className="mt-4 grid gap-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="partnerId" value={lead.partner_id} />
                <div className="grid gap-3 md:grid-cols-3">
                  <select name="status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="accepted">
                    <option value="accepted">Accept</option>
                    <option value="under_review">Under review</option>
                    <option value="needs_more_information">Request more info</option>
                    <option value="duplicate">Duplicate</option>
                    <option value="already_in_pipeline">Already in pipeline</option>
                    <option value="rejected">Reject</option>
                  </select>
                  <select
                    name="platformLinkKind"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    defaultValue={lead.platform_match_kind ?? lead.affiliate_reported_platform_link_kind ?? 'new_restaurant'}
                  >
                    <option value="new_restaurant">New restaurant</option>
                    <option value="existing_franchise">Existing franchise</option>
                    <option value="existing_branch">Existing branch</option>
                    <option value="existing_customer_addon">Existing customer add-on</option>
                  </select>
                  <select name="requestedPlanId" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue={lead.requested_plan_id ?? ''}>
                    <option value="">Default best-fit plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {plan.currency_code} {(plan.price_cents / 100).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input name="existingFranchiseId" defaultValue={lead.existing_franchise_id ?? ''} placeholder="Existing franchise UUID" />
                  <Input name="existingBranchId" defaultValue={lead.existing_branch_id ?? ''} placeholder="Existing branch UUID" />
                  <Input name="requestedBranchCount" type="number" min={1} defaultValue={lead.requested_branch_count || lead.outlet_count || 1} placeholder="Branch count" />
                </div>
                <div className="grid gap-2 rounded-lg border p-3">
                  <div className="text-sm font-medium">Requested platform capabilities</div>
                  <div className="grid gap-2 md:grid-cols-3">
                    {features.map((feature) => (
                      <label key={feature.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="requestedFeatureCodes"
                          value={feature.code}
                          defaultChecked={
                            (lead.requested_feature_codes ?? []).includes(feature.code) ||
                            (lead.products_interested ?? []).some((interest: string) =>
                              dashboard.platformCatalog.productInterestFeatureCodes[interest as keyof typeof dashboard.platformCatalog.productInterestFeatureCodes]?.includes(feature.code)
                            )
                          }
                        />
                        <span>{feature.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Input name="note" placeholder="Reason / note" />
                  <Button type="submit">Update platform decision</Button>
                </div>
              </form>
            </div>
          ))}
          {dashboard.leads.length === 0 ? <EmptyState title="No leads" description="Submitted restaurant leads appear here." /> : null}
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
