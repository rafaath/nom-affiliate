import { reviewSetupAction } from '@/app/actions/admin';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { SETUP_STATUSES } from '@/lib/partner-program/types';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminSetupPage() {
  try {
    await requirePartnerAdmin('/admin/setup');
    const dashboard = await getAdminDashboard();

    return (
      <div className="grid gap-4">
        {dashboard.setupChecklists.map((checklist) => (
          <Card key={checklist.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Setup checklist</CardTitle>
                  <CardDescription>
                    Partner: {checklist.partner_profiles?.full_name} · Franchise {checklist.franchise_id ?? 'pending'} · Branch{' '}
                    {checklist.branch_id ?? 'pending'}
                  </CardDescription>
                </div>
                <StatusBadge status={checklist.status} />
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {checklist.verification_summary?.total ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Platform checks: {checklist.verification_summary.passed}/{checklist.verification_summary.total} passed · Blocking failures{' '}
                  {checklist.verification_summary.blocking_failures}
                </div>
              ) : null}
              <div className="grid gap-2 md:grid-cols-2">
                {(checklist.partner_setup_tasks ?? []).map((task: any) => (
                  <div key={task.id} className="grid gap-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span>{task.label}</span>
                      <StatusBadge status={task.verification_status ?? task.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.verification_rule_code ?? 'manual'} · {task.verification_summary ?? 'Not checked yet'}
                    </div>
                  </div>
                ))}
              </div>
              <form action={reviewSetupAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="checklistId" value={checklist.id} />
                <select name="status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue={checklist.status}>
                  {SETUP_STATUSES.map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                <Input name="note" placeholder="Review note" />
                <Button type="submit">Review setup</Button>
              </form>
            </CardContent>
          </Card>
        ))}
        {dashboard.setupChecklists.length === 0 ? <EmptyState title="No setup checklists" description="Won deals create setup reviews here." /> : null}
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
