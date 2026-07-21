import { resolveDisputeAction } from '@/app/actions/admin';
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
import { DISPUTE_STATUSES } from '@/lib/partner-program/types';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminDisputesPage() {
  try {
    await requirePartnerAdmin('/admin/disputes');
    const dashboard = await getAdminDashboard();

    return (
      <div>
      <PageHeader eyebrow="Partner admin" title="Disputes" description="Resolve ownership, commission, setup, and payout questions with a recorded decision." />
      <Card>
        <CardHeader>
          <CardTitle>Dispute management</CardTitle>
          <CardDescription>Resolve ownership, commission, setup, and payout disputes with an audit trail.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {dashboard.disputes.map((dispute) => (
            <div key={dispute.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{dispute.dispute_type.replaceAll('_', ' ')}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{dispute.partner_explanation}</p>
                </div>
                <StatusBadge status={dispute.status} />
              </div>
              <form action={resolveDisputeAction} className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                <input type="hidden" name="disputeId" value={dispute.id} />
                <div className="grid gap-2"><Label htmlFor={`dispute-status-${dispute.id}`}>Dispute status</Label><NativeSelect id={`dispute-status-${dispute.id}`} name="status" defaultValue={dispute.status}>
                  {DISPUTE_STATUSES.map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                  ))}
                </NativeSelect></div>
                <div className="grid gap-2"><Label htmlFor={`dispute-decision-${dispute.id}`}>Final decision</Label><Input id={`dispute-decision-${dispute.id}`} name="decision" /></div>
                <Button type="submit">Resolve</Button>
              </form>
            </div>
          ))}
          {dashboard.disputes.length === 0 ? <EmptyState title="No disputes" description="Partner disputes appear here." /> : null}
        </CardContent>
      </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
