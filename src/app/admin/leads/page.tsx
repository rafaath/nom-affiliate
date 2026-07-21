import { reviewLeadAction } from '@/app/actions/admin';
import { AdminRecordDetails } from '@/components/program/admin-record-details';
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
import { leadStatusLabels, painPointLabels, productInterestLabels } from '@/lib/partner-program/labels';
import { legalLeadStatusTargets } from '@/lib/partner-program/status-machine';
import type { LeadStatus } from '@/lib/partner-program/types';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminLeadsPage() {
  try {
    await requirePartnerAdmin('/admin/leads');
    const dashboard = await getAdminDashboard();
    const plans = dashboard.platformCatalog.plans;
    const features = dashboard.platformCatalog.features;

    return (
      <div>
        <PageHeader eyebrow="Partner admin" title="Lead review" description="Validate restaurant ownership, platform matches, requested scope, and legal status movement." />
      <Card>
        <CardHeader>
          <CardTitle>Platform-native lead review queue</CardTitle>
          <CardDescription>Accept valid leads only after duplicate, existing customer, plan, and platform scope checks.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {dashboard.leads.map((lead) => (
            <div key={lead.id} className="record-panel">
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
              <AdminRecordDetails
                summary="View full submitted lead"
                items={[
                  { label: 'Restaurant name', value: lead.restaurant_name },
                  { label: 'Legal business name', value: lead.legal_business_name },
                  { label: 'Owner / manager', value: lead.owner_name },
                  { label: 'Phone', value: lead.phone },
                  { label: 'Email', value: lead.email },
                  { label: 'Restaurant type', value: lead.restaurant_type },
                  { label: 'City', value: lead.city },
                  { label: 'Locality', value: lead.locality },
                  { label: 'Primary branch address', value: lead.branch_address, wide: true },
                  { label: 'State', value: lead.state },
                  { label: 'Country', value: lead.country },
                  { label: 'Postal code', value: lead.postal_code },
                  { label: 'Timezone', value: lead.timezone },
                  { label: 'GST / registration context', value: lead.gst_registration_type },
                  { label: 'Number of outlets', value: lead.outlet_count },
                  { label: 'Current system', value: lead.current_system },
                  {
                    label: 'Products interested in',
                    value: formatLabelList(lead.products_interested, productInterestLabels),
                    wide: true,
                  },
                  {
                    label: 'Pain points',
                    value: formatLabelList(lead.pain_points, painPointLabels),
                    wide: true,
                  },
                  { label: 'Nom service history', value: formatNomServiceHistory(lead.affiliate_reported_platform_link_kind) },
                  {
                    label: 'Known Nom account details',
                    value: lead.affiliate_reported_existing_customer_notes,
                    wide: true,
                  },
                  { label: 'Relationship context', value: lead.relationship_context, wide: true },
                  { label: 'Restaurant consented to contact', value: lead.consent_to_contact ? 'Yes' : 'No' },
                  { label: 'Preferred contact time', value: lead.preferred_contact_time },
                  { label: 'Notes', value: lead.notes, wide: true },
                  { label: 'Package selected by partner', value: lead.requested_subscription_plans?.name },
                  { label: 'Requested branches', value: lead.requested_plan_id ? lead.requested_branch_count : null },
                  {
                    label: 'Requested capabilities',
                    value: formatFeatureList(lead.requested_feature_codes, features),
                    wide: true,
                  },
                  { label: 'Submitted', value: formatDate(lead.created_at) },
                ]}
              />
              {normalizeMatchEvidence(lead.platform_match_evidence).length > 0 ? (
                <details className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
                  <summary className="cursor-pointer font-medium">Match evidence</summary>
                  <div className="mt-3 grid gap-2">
                    {normalizeMatchEvidence(lead.platform_match_evidence).map((item) => (
                      <div key={`${item.source}-${item.id}`} className="rounded-md border bg-background p-3">
                        <div className="font-medium">
                          {item.source.replaceAll('_', ' ')} · {item.label} · {item.score}%
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {item.signals.map((signal) => signal.reason).join(' · ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
              <form action={reviewLeadAction} className="mt-4 grid gap-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <input type="hidden" name="partnerId" value={lead.partner_id} />
                <div className="grid gap-3 xl:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor={`lead-status-${lead.id}`}>Lead status</Label>
                    <NativeSelect id={`lead-status-${lead.id}`} name="status" defaultValue={lead.status}>
                      {legalLeadStatusTargets(lead.status as LeadStatus).map((status) => (
                        <option value={status} key={status}>{leadStatusLabels[status]}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`link-kind-${lead.id}`}>Platform relationship</Label>
                  <NativeSelect
                    id={`link-kind-${lead.id}`}
                    name="platformLinkKind"
                    defaultValue={lead.platform_match_kind ?? lead.affiliate_reported_platform_link_kind ?? 'new_restaurant'}
                  >
                    <option value="new_restaurant">New restaurant</option>
                    <option value="existing_franchise">Existing franchise</option>
                    <option value="existing_branch">Existing branch</option>
                    <option value="existing_customer_addon">Existing customer add-on</option>
                  </NativeSelect>
                  </div>
                  <div className="grid gap-2">
                  <Label htmlFor={`plan-${lead.id}`}>Approved plan</Label>
                  <NativeSelect id={`plan-${lead.id}`} name="requestedPlanId" defaultValue={lead.requested_plan_id ?? ''}>
                    <option value="">Default best-fit plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} · {plan.currency_code} {(plan.price_cents / 100).toLocaleString()}
                      </option>
                    ))}
                  </NativeSelect>
                  </div>
                </div>
                <div className="grid gap-3 xl:grid-cols-3">
                  <AdminField id={`franchise-${lead.id}`} label="Existing franchise UUID"><Input id={`franchise-${lead.id}`} name="existingFranchiseId" defaultValue={lead.existing_franchise_id ?? ''} /></AdminField>
                  <AdminField id={`branch-${lead.id}`} label="Existing branch UUID"><Input id={`branch-${lead.id}`} name="existingBranchId" defaultValue={lead.existing_branch_id ?? ''} /></AdminField>
                  <AdminField id={`branch-count-${lead.id}`} label="Approved branch count"><Input id={`branch-count-${lead.id}`} name="requestedBranchCount" type="number" min={1} defaultValue={lead.requested_branch_count || lead.outlet_count || 1} /></AdminField>
                </div>
                <div className="grid gap-2">
                  <label htmlFor={`ownerEmail-${lead.id}`} className="text-sm font-medium">
                    Owner email <span className="font-normal text-muted-foreground">(required before onboarding)</span>
                  </label>
                  <Input
                    id={`ownerEmail-${lead.id}`}
                    name="ownerEmail"
                    type="email"
                    defaultValue={lead.email ?? ''}
                    placeholder="owner@restaurant.com"
                  />
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
                  <AdminField id={`lead-note-${lead.id}`} label="Decision note"><Input id={`lead-note-${lead.id}`} name="note" /></AdminField>
                  <Button type="submit">Update platform decision</Button>
                </div>
              </form>
            </div>
          ))}
          {dashboard.leads.length === 0 ? <EmptyState title="No leads" description="Submitted restaurant leads appear here." /> : null}
        </CardContent>
      </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}

function AdminField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return <div className="grid gap-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('en-IN') : null;
}

function formatLabelList(values: unknown, labels: Record<string, string>) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values.map((value) => labels[String(value)] ?? String(value).replaceAll('_', ' ')).join(', ');
}

function formatFeatureList(values: unknown, features: Array<{ code: string; label: string }>) {
  if (!Array.isArray(values) || values.length === 0) return null;
  return values
    .map((value) => features.find((feature) => feature.code === value)?.label ?? String(value).replaceAll('_', ' '))
    .join(', ');
}

function formatNomServiceHistory(value: string | null | undefined) {
  const labels: Record<string, string> = {
    new_restaurant: 'New to Nom',
    existing_franchise: 'Existing Nom franchise adding locations',
    existing_branch: 'Existing Nom restaurant adding a branch',
    existing_customer_addon: 'Existing Nom customer interested in more services',
  };

  return value ? labels[value] ?? value.replaceAll('_', ' ') : null;
}

type MatchEvidenceView = {
  source: string;
  id: string;
  label: string;
  score: number;
  signals: Array<{ reason: string }>;
};

function normalizeMatchEvidence(value: unknown): MatchEvidenceView[] {
  let candidate = value;

  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(candidate)) return [];

  return candidate.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const signals = Array.isArray(record.signals)
      ? record.signals.flatMap((signal) => {
          if (!signal || typeof signal !== 'object') return [];
          const reason = String((signal as Record<string, unknown>).reason || '').trim();
          return reason ? [{ reason }] : [];
        })
      : [];

    return [{
      source: String(record.source || 'match'),
      id: String(record.id || 'unknown'),
      label: String(record.label || 'Possible match'),
      score: Number(record.score || 0),
      signals,
    }];
  });
}
