import { reviewCommissionAction } from '@/app/actions/admin';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { COMMISSION_STATUSES } from '@/lib/partner-program/types';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminCommissionsPage() {
  try {
    await requirePartnerAdmin('/admin/commissions');
    const dashboard = await getAdminDashboard();

    return (
      <Card>
        <CardHeader>
          <CardTitle>Commission review</CardTitle>
          <CardDescription>Approve, hold, reject, adjust, or schedule commission records.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {dashboard.commissions.map((commission) => (
            <div key={commission.id} className="rounded-xl border p-4">
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
              <form action={reviewCommissionAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input type="hidden" name="commissionId" value={commission.id} />
                <select name="status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue={commission.status}>
                  {COMMISSION_STATUSES.map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                <Input name="amountCents" type="number" min={0} placeholder="Adjusted amount cents" />
                <Input name="note" placeholder="Review note" />
                <Button type="submit">Save</Button>
              </form>
            </div>
          ))}
          {dashboard.commissions.length === 0 ? <EmptyState title="No commissions" description="Commission records appear when deals are won." /> : null}
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
