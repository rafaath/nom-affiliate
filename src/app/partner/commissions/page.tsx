import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { PageHeader } from '@/components/program/page-header';
import { StatusBadge } from '@/components/program/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartnerDashboard } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerCommissionsPage() {
  try {
    const user = await requireUser('/partner/commissions');
    const dashboard = await getPartnerDashboard(user.id, user.email);

    return (
      <div>
      <PageHeader eyebrow="Partner portal" title="Commissions" description="Follow every eligible earning record from estimate through payout or final decision." />
      <Card>
        <CardHeader>
          <CardTitle>Commission tracking</CardTitle>
          <CardDescription>Estimated, pending, approved, paid, held, and rejected earnings.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {dashboard.commissions.map((commission) => (
            <div key={commission.id} className="grid gap-3 rounded-xl border p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div>
                <div className="font-semibold capitalize">{commission.commission_type} commission</div>
                <div className="text-sm text-muted-foreground">{commission.condition_summary}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Platform eligibility {commission.platform_eligibility_status ?? 'not checked'}
                </div>
                {(commission.platform_eligibility_blockers ?? []).length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-xs text-destructive">
                    {(commission.platform_eligibility_blockers ?? []).map((blocker: string) => (
                      <li key={blocker}>• {blocker}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <StatusBadge status={commission.status} />
              <div className="font-bold">{formatCurrency(commission.amount_cents || 0, commission.currency_code)}</div>
            </div>
          ))}
          {dashboard.commissions.length === 0 ? (
            <EmptyState title="No commissions yet" description="Commissions appear when restaurants become eligible opportunities." />
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
