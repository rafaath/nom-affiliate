import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartnerDashboard } from '@/lib/partner-program/data';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerNotificationsPage() {
  try {
    const user = await requireUser('/partner/notifications');
    const dashboard = await getPartnerDashboard(user.id, user.email);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Lead, deal, setup, commission, payout, and certification updates.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {dashboard.notifications.map((notification) => (
            <div key={notification.id} className="rounded-xl border p-4">
              <div className="font-semibold">{notification.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
            </div>
          ))}
          {dashboard.notifications.length === 0 ? (
            <EmptyState title="No notifications yet" description="Important partner-program updates will appear here." />
          ) : null}
        </CardContent>
      </Card>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}
