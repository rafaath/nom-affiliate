import { submitLeadAction } from '@/app/actions/partner';
import { ConfigRequired } from '@/components/program/config-required';
import { ApprovalStateNotice } from '@/components/program/approval-state-notice';
import { EmptyState } from '@/components/program/empty-state';
import { ErrorBanner } from '@/components/program/error-banner';
import { PageHeader } from '@/components/program/page-header';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { getPartnerDashboard } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { painPointLabels, productInterestLabels } from '@/lib/partner-program/labels';
import { evaluatePartnerLeadAccess } from '@/lib/partner-program/lead-access';
import {
  PAIN_POINTS,
  PRODUCT_INTERESTS,
  type LeadStatus,
  type PlatformLinkKind,
} from '@/lib/partner-program/types';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  try {
    const params = await searchParams;
    const user = await requireUser('/partner/leads');
    const dashboard = await getPartnerDashboard(user.id, user.email);
    if (!dashboard.profile) {
      return (
        <EmptyState
          title="Finish your partner application"
          description="Create your partner profile before submitting restaurant leads."
          actionHref="/apply"
          actionLabel="Finish application"
        />
      );
    }
    const leadAccess = evaluatePartnerLeadAccess(dashboard.profile, dashboard.agreementAcceptance);
    if (!leadAccess.allowed) {
      return (
        <div className="grid gap-7">
          <PageHeader eyebrow="Partner portal" title="Restaurant leads" description="Review your lead history and application access state." />
          <ApprovalStateNotice access={leadAccess} />
          <LeadHistory leads={dashboard.leads} />
        </div>
      );
    }
    return (
      <div>
        <PageHeader eyebrow="Partner portal" title="Restaurant leads" description="Register genuine restaurant opportunities and track Nom’s review." />
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Register a restaurant lead</CardTitle>
            <CardDescription>Submit restaurants where you have genuine context or contact.</CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={params.error} />
            <form action={submitLeadAction} className="grid gap-4">
              <Field label="Restaurant name" name="restaurantName" required />
              <Field label="Legal / registered business name" name="legalBusinessName" />
              <div className="grid gap-4 xl:grid-cols-2">
                <Field label="Owner / manager" name="ownerName" required />
                <Field label="Phone" name="phone" required />
              </div>
              <Field label="Owner email" name="email" type="email" />
              <div className="grid gap-4 xl:grid-cols-2">
                <Field label="City" name="city" required />
                <Field label="Locality" name="locality" required />
              </div>
              <Field label="Primary branch address" name="branchAddress" />
              <div className="grid gap-4 xl:grid-cols-3">
                <Field label="State" name="state" />
                <Field label="Country" name="country" defaultValue="India" />
                <Field label="Postal code" name="postalCode" />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Field label="Timezone" name="timezone" defaultValue="Asia/Kolkata" />
                <Field label="GST / registration context" name="gstRegistrationType" placeholder="regular, composition, unregistered, not sure" />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Field label="Restaurant type" name="restaurantType" />
                <Field label="Number of outlets" name="outletCount" type="number" min={1} defaultValue={1} />
              </div>
              <div className="grid gap-4 rounded-2xl border p-4">
                <div>
                  <div className="font-medium">Nom service history</div>
                  <p className="text-sm text-muted-foreground">
                    Tell us whether this restaurant is new to Nom or already uses Nom services.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="affiliateReportedPlatformLinkKind">What best describes this restaurant?</Label>
                  <NativeSelect
                    id="affiliateReportedPlatformLinkKind"
                    name="affiliateReportedPlatformLinkKind"
                    defaultValue="new_restaurant"
                  >
                    <option value="new_restaurant">New to Nom</option>
                    <option value="existing_franchise">Existing Nom franchise adding locations</option>
                    <option value="existing_branch">Existing Nom restaurant adding a branch</option>
                    <option value="existing_customer_addon">Existing Nom customer interested in more services</option>
                  </NativeSelect>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="affiliateReportedExistingCustomerNotes">What do you know about their Nom account?</Label>
                  <Textarea
                    id="affiliateReportedExistingCustomerNotes"
                    name="affiliateReportedExistingCustomerNotes"
                    placeholder="Franchise or branch name, owner contact, services they use, or what they need..."
                  />
                </div>
              </div>
              <Field label="Current system" name="currentSystem" placeholder="Old POS, manual, not sure" />
              <MultiChoiceField
                legend="Products they may be interested in"
                name="productsInterested"
                options={PRODUCT_INTERESTS.map((value) => ({ label: productInterestLabels[value], value }))}
              />
              <MultiChoiceField
                legend="What challenges are they facing?"
                name="painPoints"
                options={PAIN_POINTS.map((value) => ({ label: painPointLabels[value], value }))}
              />
              <Field label="Relationship context" name="relationshipContext" placeholder="Owner is my contact, visited and interested..." required />
              <Field label="Preferred contact time" name="preferredContactTime" />
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
              <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                <input name="consentToContact" type="checkbox" className="mt-0.5 size-4" required />
                <span>
                  The restaurant agreed to be contacted or has a genuine reason to expect follow-up.
                  <span aria-hidden="true" className="text-destructive"> *</span>
                </span>
              </label>
              <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                Fake, duplicate, scraped, or unsupported leads may be rejected and can affect partner quality.
              </p>
              <Button type="submit">Submit lead</Button>
            </form>
          </CardContent>
        </Card>

        <LeadHistory leads={dashboard.leads} />
        </div>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}

function LeadHistory({ leads }: { leads: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your leads</CardTitle>
        <CardDescription>Status updates are shown here as Nom reviews each restaurant.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {leads.map((lead) => (
          <div key={lead.id} className="record-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{lead.restaurant_name}</div>
                <div className="text-sm text-muted-foreground">{lead.city} · {lead.locality}</div>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            {lead.rejection_reason ? <p className="mt-3 text-sm text-destructive">{lead.rejection_reason}</p> : null}
            <div className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-3 text-sm">
              {lead.requested_subscription_plans ? (
                <>
                  <div className="font-medium">{lead.requested_package_summary || lead.requested_subscription_plans.name}</div>
                  <div className="text-muted-foreground">
                    {formatBranchCount(lead.requested_branch_count ?? lead.outlet_count)} · Estimated commission{' '}
                    {formatCurrency(lead.requested_commission_preview_cents || 0, lead.requested_subscription_plans.currency_code)}
                  </div>
                </>
              ) : (
                <><div className="font-medium">Package to be confirmed</div><div className="text-muted-foreground">Nom will confirm the plan and commission during review.</div></>
              )}
              <div className="border-t pt-2 text-muted-foreground">{formatReviewStatus(lead.status)}</div>
              <div className="text-muted-foreground">{formatPlatformMatch(lead.platform_match_kind)}</div>
              {lead.affiliate_reported_platform_link_kind && lead.affiliate_reported_platform_link_kind !== 'new_restaurant' ? (
                <div className="text-muted-foreground">Submitted as {formatPlatformContext(lead.affiliate_reported_platform_link_kind)}</div>
              ) : null}
            </div>
          </div>
        ))}
        {leads.length === 0 ? <EmptyState title="No leads submitted" description="Approved partners can submit their first restaurant here." /> : null}
      </CardContent>
    </Card>
  );
}

function formatBranchCount(count: number) {
  return `${count} ${count === 1 ? 'branch' : 'branches'}`;
}

function formatReviewStatus(status: LeadStatus) {
  const labels: Record<LeadStatus, string> = {
    submitted: 'Awaiting Nom review',
    under_review: 'Nom is reviewing this lead',
    accepted: 'Accepted by Nom',
    rejected: 'Not accepted by Nom',
    duplicate: 'Marked as a duplicate',
    already_in_pipeline: 'Already in Nom’s pipeline',
    needs_more_information: 'Nom needs more information',
  };

  return labels[status];
}

function formatPlatformMatch(kind?: PlatformLinkKind | null) {
  const labels: Record<PlatformLinkKind, string> = {
    new_restaurant: 'No existing Nom customer match found',
    existing_franchise: 'Possible match with an existing Nom franchise',
    existing_branch: 'Possible match with an existing Nom restaurant',
    existing_customer_addon: 'Possible match with an existing Nom customer',
  };

  return kind ? labels[kind] : 'Nom customer match pending';
}

function formatPlatformContext(kind: PlatformLinkKind) {
  const labels: Record<PlatformLinkKind, string> = {
    new_restaurant: 'a new restaurant',
    existing_franchise: 'an existing Nom franchise adding locations',
    existing_branch: 'an existing Nom restaurant adding a branch',
    existing_customer_addon: 'an existing Nom customer interested in more services',
  };

  return labels[kind];
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, required, ...inputProps } = props;
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>
        {label}
        {required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}
      </Label>
      <Input id={name} name={name} required={required} {...inputProps} />
    </div>
  );
}

function MultiChoiceField({
  legend,
  name,
  options,
}: {
  legend: string;
  name: string;
  options: readonly { label: string; value: string }[];
}) {
  return (
    <fieldset className="grid gap-3 rounded-xl border p-4">
      <legend className="px-1 font-medium">{legend}</legend>
      <p className="text-sm text-muted-foreground">Select all that apply.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm" key={option.value}>
            <input className="size-4 shrink-0 accent-plum" name={name} type="checkbox" value={option.value} />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
