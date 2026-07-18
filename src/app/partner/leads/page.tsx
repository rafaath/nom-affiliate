import { submitLeadAction } from '@/app/actions/partner';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { ErrorBanner } from '@/components/program/error-banner';
import { PlatformPackageSelector } from '@/components/program/platform-package-selector';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getPartnerDashboard, getPartnerSalesCatalog } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { PAIN_POINTS, PRODUCT_INTERESTS } from '@/lib/partner-program/types';
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
    const salesCatalog = await getPartnerSalesCatalog(user.id);

    return (
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Register a restaurant lead</CardTitle>
            <CardDescription>Submit restaurants where you have genuine context or contact.</CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={params.error} />
            <form action={submitLeadAction} className="grid gap-4">
              <Field label="Restaurant name" name="restaurantName" required />
              <Field label="Legal / registered business name" name="legalBusinessName" required />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Owner / manager" name="ownerName" required />
                <Field label="Phone" name="phone" required />
              </div>
              <Field label="Owner email" name="email" type="email" required />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="City" name="city" required />
                <Field label="Locality" name="locality" required />
              </div>
              <Field label="Primary branch address" name="branchAddress" required />
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="State" name="state" required />
                <Field label="Country" name="country" defaultValue="India" required />
                <Field label="Postal code" name="postalCode" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Timezone" name="timezone" defaultValue="Asia/Kolkata" required />
                <Field label="GST / registration context" name="gstRegistrationType" placeholder="regular, composition, unregistered, not sure" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Restaurant type" name="restaurantType" required />
                <Field label="Number of outlets" name="outletCount" type="number" min={1} defaultValue={1} required />
              </div>
              <PlatformPackageSelector
                catalog={salesCatalog.platformCatalog}
                commissionRules={salesCatalog.commissionRules}
                partnerType={dashboard.profile.partner_type}
              />
              <div className="grid gap-4 rounded-2xl border p-4">
                <div>
                  <div className="font-medium">RMS customer context</div>
                  <p className="text-sm text-muted-foreground">
                    Tell Nom if you believe this restaurant already exists in RMS or is an add-on opportunity.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="affiliateReportedPlatformLinkKind">What is this opportunity?</Label>
                  <select
                    id="affiliateReportedPlatformLinkKind"
                    name="affiliateReportedPlatformLinkKind"
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    defaultValue="new_restaurant"
                  >
                    <option value="new_restaurant">New restaurant not on RMS</option>
                    <option value="existing_franchise">Existing RMS franchise expansion</option>
                    <option value="existing_branch">Existing RMS branch support</option>
                    <option value="existing_customer_addon">Existing RMS customer add-on/modules</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="affiliateReportedExistingCustomerNotes">Known RMS customer details</Label>
                  <Textarea
                    id="affiliateReportedExistingCustomerNotes"
                    name="affiliateReportedExistingCustomerNotes"
                    placeholder="Known franchise/branch name, owner contact, current RMS usage, add-on need..."
                  />
                </div>
              </div>
              <Field label="Current system" name="currentSystem" placeholder="Old POS, manual, not sure" />
              <Field label="Products interested in" name="productsInterestedCsv" placeholder={PRODUCT_INTERESTS.join(', ')} required />
              <Field label="Pain points" name="painPointsCsv" placeholder={PAIN_POINTS.join(', ')} required />
              <Field label="Relationship context" name="relationshipContext" placeholder="Owner is my contact, visited and interested..." required />
              <Field label="Preferred contact time" name="preferredContactTime" />
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
              <label className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                <input name="consentToContact" type="checkbox" className="mt-0.5 size-4" required />
                The restaurant agreed to be contacted or has a genuine reason to expect follow-up.
              </label>
              <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                Fake, duplicate, scraped, or unsupported leads may be rejected and can affect partner quality.
              </p>
              <Button type="submit">Submit lead</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your leads</CardTitle>
            <CardDescription>Status updates are shown here as Nom reviews each restaurant.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboard.leads.map((lead) => (
              <div key={lead.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{lead.restaurant_name}</div>
                    <div className="text-sm text-muted-foreground">{lead.city} · {lead.locality}</div>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
                {lead.rejection_reason ? <p className="mt-3 text-sm text-destructive">{lead.rejection_reason}</p> : null}
                <div className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="font-medium">{lead.requested_package_summary || 'Package not captured'}</div>
                  <div className="text-muted-foreground">
                    Requested plan {lead.requested_subscription_plans?.name ?? 'not selected'} · {lead.requested_branch_count ?? lead.outlet_count} branches · Preview{' '}
                    {formatCurrency(lead.requested_commission_preview_cents || 0, lead.requested_subscription_plans?.currency_code)}
                  </div>
                  <div className="text-muted-foreground">
                    Platform match {lead.platform_match_kind ?? 'not checked'} · Confidence {lead.platform_match_confidence ?? 0}% · Review{' '}
                    {lead.platform_review_decision ?? 'pending'}
                  </div>
                  <div className="text-muted-foreground">
                    Partner-reported context {lead.affiliate_reported_platform_link_kind?.replaceAll('_', ' ') ?? 'not supplied'}
                  </div>
                </div>
              </div>
            ))}
            {dashboard.leads.length === 0 ? (
              <EmptyState title="No leads submitted" description="Submit your first restaurant to start tracking ownership." />
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

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...inputProps } = props;
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...inputProps} />
    </div>
  );
}
