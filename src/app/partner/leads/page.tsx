import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { submitLeadAction } from '@/app/actions/partner';
import { ConfigRequired } from '@/components/program/config-required';
import { ApprovalStateNotice } from '@/components/program/approval-state-notice';
import { DeleteLeadControl } from '@/components/program/delete-lead-control';
import { EmptyState } from '@/components/program/empty-state';
import { ErrorBanner } from '@/components/program/error-banner';
import { NoticeBanner } from '@/components/program/notice-banner';
import { PageHeader } from '@/components/program/page-header';
import { PartnerLeadForm } from '@/components/program/partner-lead-form';
import { StatusBadge } from '@/components/program/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getPartnerPageData } from '@/lib/partner-program/data';
import { formatCurrency } from '@/lib/partner-program/format';
import { evaluatePartnerLeadAccess } from '@/lib/partner-program/lead-access';
import { canPartnerModifyLead } from '@/lib/partner-program/status-machine';
import { type LeadStatus, type PlatformLinkKind } from '@/lib/partner-program/types';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string; updated?: string; deleted?: string }>;
}) {
  try {
    const params = await searchParams;
    const user = await requireUser('/partner/leads');
    const dashboard = await getPartnerPageData(user.id, user.email, ['agreementAcceptance', 'leads']);
    if (!dashboard.profile) {
      return (
        <EmptyState
          title="Finish your partner application"
          description="Create your partner profile before submitting restaurant leads."
          actionHref="/apply"
          actionLabel="Finish application"
        />
      );
    }
    const leadAccess = evaluatePartnerLeadAccess(dashboard.profile, dashboard.agreementAcceptance);
    if (!leadAccess.allowed) {
      return (
        <div className="grid gap-7">
          <PageHeader eyebrow="Partner portal" title="Restaurant leads" description="Review your lead history and application access state." />
          <ApprovalStateNotice access={leadAccess} />
          <LeadHistory canModify={false} leads={dashboard.leads} />
        </div>
      );
    }
    const notice = params.deleted
      ? 'Lead deleted.'
      : params.updated
        ? 'Lead updated.'
        : params.submitted
          ? 'Lead submitted.'
          : null;
    return (
      <div>
        <PageHeader eyebrow="Partner portal" title="Restaurant leads" description="Register genuine restaurant opportunities and track Nom’s review." />
        <NoticeBanner message={notice} />
        <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Register a restaurant lead</CardTitle>
            <CardDescription>Submit restaurants where you have genuine context or contact.</CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={params.error} />
            <PartnerLeadForm action={submitLeadAction} submitLabel="Submit lead" />
          </CardContent>
        </Card>

        <LeadHistory canModify leads={dashboard.leads} />
        </div>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}

function LeadHistory({ canModify, leads }: { canModify: boolean; leads: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your leads</CardTitle>
        <CardDescription>Status updates are shown here as Nom reviews each restaurant.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {leads.map((lead) => (
          <div key={lead.id} className="record-panel">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{lead.restaurant_name}</div>
                <div className="text-sm text-muted-foreground">{lead.city} · {lead.locality}</div>
              </div>
              <StatusBadge status={lead.status} />
            </div>
            {lead.rejection_reason ? <p className="mt-3 text-sm text-destructive">{lead.rejection_reason}</p> : null}
            <div className="mt-3 grid gap-2 rounded-lg bg-muted/40 p-3 text-sm">
              {lead.requested_subscription_plans ? (
                <>
                  <div className="font-medium">{lead.requested_package_summary || lead.requested_subscription_plans.name}</div>
                  <div className="text-muted-foreground">
                    {formatBranchCount(lead.requested_branch_count ?? lead.outlet_count)} · Estimated commission{' '}
                    {formatCurrency(lead.requested_commission_preview_cents || 0, lead.requested_subscription_plans.currency_code)}
                  </div>
                </>
              ) : (
                <><div className="font-medium">Package to be confirmed</div><div className="text-muted-foreground">Nom will confirm the plan and commission during review.</div></>
              )}
              <div className="border-t pt-2 text-muted-foreground">{formatReviewStatus(lead.status)}</div>
              <div className="text-muted-foreground">{formatPlatformMatch(lead.platform_match_kind)}</div>
              {lead.affiliate_reported_platform_link_kind && lead.affiliate_reported_platform_link_kind !== 'new_restaurant' ? (
                <div className="text-muted-foreground">Submitted as {formatPlatformContext(lead.affiliate_reported_platform_link_kind)}</div>
              ) : null}
            </div>
            {canModify && canPartnerModifyLead(lead.status) ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/partner/leads/${lead.id}/edit`}>
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit
                  </Link>
                </Button>
                <DeleteLeadControl leadId={lead.id} restaurantName={lead.restaurant_name} />
                <span className="text-xs text-muted-foreground">Available until Nom starts reviewing.</span>
              </div>
            ) : null}
          </div>
        ))}
        {leads.length === 0 ? <EmptyState title="No leads submitted" description="Approved partners can submit their first restaurant here." /> : null}
      </CardContent>
    </Card>
  );
}

function formatBranchCount(count: number) {
  return `${count} ${count === 1 ? 'branch' : 'branches'}`;
}

function formatReviewStatus(status: LeadStatus) {
  const labels: Record<LeadStatus, string> = {
    submitted: 'Awaiting Nom review',
    under_review: 'Nom is reviewing this lead',
    accepted: 'Accepted by Nom',
    rejected: 'Not accepted by Nom',
    duplicate: 'Marked as a duplicate',
    already_in_pipeline: 'Already in Nom’s pipeline',
    needs_more_information: 'Nom needs more information',
  };

  return labels[status];
}

function formatPlatformMatch(kind?: PlatformLinkKind | null) {
  const labels: Record<PlatformLinkKind, string> = {
    new_restaurant: 'No existing Nom customer match found',
    existing_franchise: 'Possible match with an existing Nom franchise',
    existing_branch: 'Possible match with an existing Nom restaurant',
    existing_customer_addon: 'Possible match with an existing Nom customer',
  };

  return kind ? labels[kind] : 'Nom customer match pending';
}

function formatPlatformContext(kind: PlatformLinkKind) {
  const labels: Record<PlatformLinkKind, string> = {
    new_restaurant: 'a new restaurant',
    existing_franchise: 'an existing Nom franchise adding locations',
    existing_branch: 'an existing Nom restaurant adding a branch',
    existing_customer_addon: 'an existing Nom customer interested in more services',
  };

  return labels[kind];
}
