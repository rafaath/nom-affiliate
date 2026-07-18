import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { StatusBadge } from '@/components/program/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartnerDashboard } from '@/lib/partner-program/data';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerSetupPage() {
  try {
    const user = await requireUser('/partner/setup');
    const dashboard = await getPartnerDashboard(user.id, user.email);

    return (
      <div className="grid gap-6">
        {dashboard.setupChecklists.map((checklist) => (
          <Card key={checklist.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Restaurant setup checklist</CardTitle>
                  <CardDescription>
                    Deal stage: {checklist.partner_deals?.stage ?? 'assigned'} · Platform checks{' '}
                    {checklist.verification_summary?.total
                      ? `${checklist.verification_summary.passed}/${checklist.verification_summary.total} passed`
                      : 'not checked yet'}
                  </CardDescription>
                </div>
                <StatusBadge status={checklist.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {(checklist.partner_setup_tasks ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order).map((task: any) => (
                <div key={task.id} className="grid gap-2 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{task.label}</span>
                    <StatusBadge status={task.verification_status ?? task.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">{task.verification_summary ?? 'Nom has not checked this platform area yet.'}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {dashboard.setupChecklists.length === 0 ? (
          <EmptyState title="No setup assigned yet" description="Setup checklists appear after a restaurant is won and assigned." />
        ) : null}
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
