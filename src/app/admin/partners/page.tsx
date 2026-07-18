import { reviewApplicationAction } from '@/app/actions/admin';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getAdminDashboard } from '@/lib/partner-program/data';
import { partnerTypeLabels } from '@/lib/partner-program/labels';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminPartnersPage() {
  try {
    await requirePartnerAdmin('/admin/partners');
    const dashboard = await getAdminDashboard();

    return (
      <Card>
        <CardHeader>
          <CardTitle>Partner application review</CardTitle>
          <CardDescription>Approve, reject, request info, or schedule interview.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {dashboard.applications.map((application) => (
            <div key={application.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{application.full_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {application.city} · {partnerTypeLabels[application.requested_partner_type as keyof typeof partnerTypeLabels]}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{application.restaurant_experience}</p>
                </div>
                <StatusBadge status={application.status} />
              </div>
              <form action={reviewApplicationAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                <input type="hidden" name="applicationId" value={application.id} />
                <input type="hidden" name="partnerId" value={application.partner_id} />
                <select name="status" className="h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="approved_affiliate">
                  <option value="approved_affiliate">Approve affiliate</option>
                  <option value="approved_sales_partner">Approve sales partner</option>
                  <option value="approved_setup_pending_training">Setup pending training</option>
                  <option value="approved_full_service">Approve full-service</option>
                  <option value="needs_more_information">Request info</option>
                  <option value="interview_requested">Interview requested</option>
                  <option value="rejected">Reject</option>
                </select>
                <Input name="note" placeholder="Review note" />
                <Button type="submit">Save review</Button>
              </form>
            </div>
          ))}
          {dashboard.applications.length === 0 ? <EmptyState title="No applications" description="Partner applications appear here." /> : null}
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
