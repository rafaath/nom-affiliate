import { Clock3, ShieldAlert } from 'lucide-react';
import type { LeadAccessResult } from '@/lib/partner-program/lead-access';
import { StatusBadge } from './status-badge';

export function ApprovalStateNotice({ access }: { access: Exclude<LeadAccessResult, { allowed: true }> }) {
  const Icon = access.code === 'partner_suspended' ? ShieldAlert : Clock3;
  return (
    <div className="rounded-lg border border-plum/20 bg-lilac/45 p-5" role="status">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-plum text-paper">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-bold">Lead submission is not available</h2>
            {access.profile ? <StatusBadge status={access.profile.application_status} /> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-body">{access.message}</p>
          <p className="mt-1 text-sm text-ink-body">You can still review your existing leads, deals, commissions, and payout history.</p>
        </div>
      </div>
    </div>
  );
}
