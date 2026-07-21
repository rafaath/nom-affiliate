import { reviewCommissionAction } from '@/app/actions/admin';
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
import { commissionStatusLabels } from '@/lib/partner-program/labels';
import { legalCommissionStatusTargets } from '@/lib/partner-program/status-machine';
import type { CommissionStatus } from '@/lib/partner-program/types';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminCommissionsPage() {
  try {
    await requirePartnerAdmin('/admin/commissions');
    const dashboard = await getAdminDashboard();

    return (
      <div>
        <PageHeader eyebrow="Partner admin" title="Commissions" description="Review eligibility, preserve amounts, and use only legal commission transitions." />
      <Card>
        <CardHeader>
          <CardTitle>Commission review</CardTitle>
          <CardDescription>Approve, hold, reject, adjust, or schedule commission records.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {dashboard.commissions.map((commission) => (
            <div key={commission.id} className="record-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{commission.partner_profiles?.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {commission.commission_type} · {formatCurrency(commission.amount_cents || 0, commission.currency_code)}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Eligibility: {commission.platform_eligibility_status ?? 'not checked'} · Deal{' '}
                    {commission.partner_deals?.stage ?? 'unknown'} · {commission.partner_deals?.platform_link_kind ?? 'platform link pending'}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{commission.condition_summary}</p>
                  {(commission.platform_eligibility_blockers ?? []).length > 0 ? (
                    <ul className="mt-2 grid gap-1 text-sm text-destructive">
                      {(commission.platform_eligibility_blockers ?? []).map((blocker: string) => (
                        <li key={blocker}>• {blocker}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <StatusBadge status={commission.status} />
              </div>
              <form action={reviewCommissionAction} className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto] xl:items-end">
                <input type="hidden" name="commissionId" value={commission.id} />
                <div className="grid gap-2"><Label htmlFor={`commission-status-${commission.id}`}>Commission status</Label><NativeSelect id={`commission-status-${commission.id}`} name="status" defaultValue={commission.status}>
                  {legalCommissionStatusTargets(commission.status as CommissionStatus).map((status) => (
                    <option key={status} value={status}>{commissionStatusLabels[status]}</option>
                  ))}
                </NativeSelect></div>
                <div className="grid gap-2"><Label htmlFor={`commission-amount-${commission.id}`}>Amount (cents)</Label><Input id={`commission-amount-${commission.id}`} name="amountCents" type="number" min={0} defaultValue={commission.amount_cents ?? 0} /></div>
                <div className="grid gap-2"><Label htmlFor={`commission-note-${commission.id}`}>Review note</Label><Input id={`commission-note-${commission.id}`} name="note" defaultValue={commission.review_note ?? ''} /></div>
                <Button type="submit">Save</Button>
              </form>
            </div>
          ))}
          {dashboard.commissions.length === 0 ? <EmptyState title="No commissions" description="Commission records appear when deals are won." /> : null}
        </CardContent>
      </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
