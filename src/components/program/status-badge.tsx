import { Badge } from '@/components/ui/badge';
import {
  applicationStatusLabels,
  commissionStatusLabels,
  dealStageLabels,
  leadStatusLabels,
  payoutStatusLabels,
  setupStatusLabels,
} from '@/lib/partner-program/labels';

const successStatuses = new Set(['accepted', 'approved', 'paid', 'live', 'won']);
const warningStatuses = new Set(['submitted', 'under_review', 'pending', 'scheduled_for_payout', 'follow_up_needed']);
const destructiveStatuses = new Set(['rejected', 'failed', 'lost', 'held', 'reversed', 'duplicate']);

export function StatusBadge({ status }: { status: string }) {
  const label =
    (leadStatusLabels as Record<string, string>)[status] ||
    (dealStageLabels as Record<string, string>)[status] ||
    (setupStatusLabels as Record<string, string>)[status] ||
    (commissionStatusLabels as Record<string, string>)[status] ||
    (payoutStatusLabels as Record<string, string>)[status] ||
    (applicationStatusLabels as Record<string, string>)[status] ||
    status.replaceAll('_', ' ');

  const variant = successStatuses.has(status)
    ? 'success'
    : warningStatuses.has(status)
      ? 'warning'
      : destructiveStatuses.has(status)
        ? 'destructive'
        : 'secondary';

  return <Badge variant={variant}>{label}</Badge>;
}
