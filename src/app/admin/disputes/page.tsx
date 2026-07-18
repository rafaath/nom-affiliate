import { resolveDisputeAction } from '@/app/actions/admin';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { DISPUTE_STATUSES } from '@/lib/partner-program/types';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminDisputesPage() {
  try {
    await requirePartnerAdmin('/admin/disputes');
    const dashboard = await getAdminDashboard();

    return (
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
              <form action={resolveDisputeAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="disputeId" value={dispute.id} />
                <select name="status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue={dispute.status}>
                  {DISPUTE_STATUSES.map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                <Input name="decision" placeholder="Final decision" />
                <Button type="submit">Resolve</Button>
              </form>
            </div>
          ))}
          {dashboard.disputes.length === 0 ? <EmptyState title="No disputes" description="Partner disputes appear here." /> : null}
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
