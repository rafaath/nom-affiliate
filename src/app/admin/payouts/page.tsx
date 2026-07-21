import { createPayoutBatchAction } from '@/app/actions/admin';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { PageHeader } from '@/components/program/page-header';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminPayoutsPage() {
  try {
    await requirePartnerAdmin('/admin/payouts');
    const dashboard = await getAdminDashboard();

    return (
      <div className="grid gap-8">
        <PageHeader eyebrow="Partner admin" title="Payout batches" description="Group approved commissions into reviewed payout cycles." />
        <Card>
          <CardHeader>
            <CardTitle>Create payout batch</CardTitle>
            <CardDescription>Collect all approved commissions into a reviewed payout batch.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createPayoutBatchAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-2"><Label htmlFor="payout-batch-label">Batch label</Label><Input id="payout-batch-label" name="label" placeholder="July partner payouts" /></div>
              <Button type="submit">Create batch from approved commissions</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payout batches</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {dashboard.payoutBatches.map((batch) => (
              <div key={batch.id} className="flex items-center justify-between rounded-xl border p-4">
                <div>
                  <div className="font-semibold">{batch.label}</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(batch.total_amount_cents || 0, batch.currency_code)}</div>
                </div>
                <StatusBadge status={batch.status} />
              </div>
            ))}
            {dashboard.payoutBatches.length === 0 ? <EmptyState title="No payout batches" description="Approved commissions can be batched from here." /> : null}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
