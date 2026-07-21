import { reviewSetupAction } from '@/app/actions/admin';
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
import { setupStatusLabels } from '@/lib/partner-program/labels';
import { legalSetupStatusTargets } from '@/lib/partner-program/status-machine';
import type { SetupStatus } from '@/lib/partner-program/types';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminSetupPage() {
  try {
    await requirePartnerAdmin('/admin/setup');
    const dashboard = await getAdminDashboard();

    return (
      <div className="grid gap-4">
        <PageHeader eyebrow="Partner admin" title="Setup verification" description="Review platform evidence and move checklists only through valid setup states." />
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
              <form action={reviewSetupAction} className="grid gap-3 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                <input type="hidden" name="checklistId" value={checklist.id} />
                <div className="grid gap-2"><Label htmlFor={`setup-status-${checklist.id}`}>Setup status</Label><NativeSelect id={`setup-status-${checklist.id}`} name="status" defaultValue={checklist.status}>
                  {legalSetupStatusTargets(checklist.status as SetupStatus).map((status) => (
                    <option key={status} value={status}>{setupStatusLabels[status]}</option>
                  ))}
                </NativeSelect></div>
                <div className="grid gap-2"><Label htmlFor={`setup-note-${checklist.id}`}>Review note</Label><Input id={`setup-note-${checklist.id}`} name="note" defaultValue={checklist.admin_review_note ?? ''} /></div>
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
