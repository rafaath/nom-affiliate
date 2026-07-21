import { savePayoutMethodAction } from '@/app/actions/partner';
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
import { getPartnerDashboard } from '@/lib/partner-program/data';
import { evaluatePartnerLeadAccess } from '@/lib/partner-program/lead-access';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerPayoutsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  try {
    const params = await searchParams;
    const user = await requireUser('/partner/payouts');
    const dashboard = await getPartnerDashboard(user.id, user.email);
    const access = evaluatePartnerLeadAccess(dashboard.profile);

    return (
      <div>
        <PageHeader eyebrow="Partner portal" title="Payout details" description="Maintain reviewed payout information and see its approval state." />
        {!access.allowed ? <div className="mb-7"><ApprovalStateNotice access={access} /></div> : null}
      <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
        {access.allowed ? <Card>
          <CardHeader>
            <CardTitle>Add payout details</CardTitle>
            <CardDescription>UPI is preferred for v1. Bank details use a secure reference only.</CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={params.error} />
            <form action={savePayoutMethodAction} className="grid gap-4">
              <Field label="Payout name" name="payoutName" required />
              <div className="grid gap-2">
                <Label htmlFor="payoutType">Payout type</Label>
                <NativeSelect id="payoutType" name="payoutType" defaultValue="upi">
                  <option value="upi">UPI</option>
                  <option value="bank_reference">Bank reference</option>
                </NativeSelect>
              </div>
              <Field label="UPI ID" name="upiId" placeholder="name@bank" />
              <Field label="Bank name" name="bankName" />
              <Field label="Bank account last 4 digits" name="bankAccountLast4" maxLength={4} />
              <Field label="Bank account reference" name="bankAccountReference" placeholder="Token/reference from finance system" />
              <Field label="Tax ID / PAN" name="taxId" />
              <Field label="GST number" name="gstNumber" />
              <Button type="submit">Save payout method</Button>
            </form>
          </CardContent>
        </Card> : null}

        <Card>
          <CardHeader>
            <CardTitle>Payout methods</CardTitle>
            <CardDescription>Nom reviews details before payout batches are processed.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboard.payoutMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <div className="font-semibold">{method.payout_name}</div>
                  <div className="text-sm text-muted-foreground">{method.upi_id || method.bank_account_reference}</div>
                </div>
                <StatusBadge status={method.status} />
              </div>
            ))}
            {dashboard.payoutMethods.length === 0 ? (
              <EmptyState title="No payout method yet" description="Add details before approved commissions can be paid." />
            ) : null}
          </CardContent>
        </Card>
      </div>
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
