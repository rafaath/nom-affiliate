import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { updateLeadAction } from '@/app/actions/partner';
import { ConfigRequired } from '@/components/program/config-required';
import { EmptyState } from '@/components/program/empty-state';
import { ErrorBanner } from '@/components/program/error-banner';
import { PageHeader } from '@/components/program/page-header';
import { PartnerLeadForm } from '@/components/program/partner-lead-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEditablePartnerLead } from '@/lib/partner-program/data';
import { partnerLeadIdSchema } from '@/lib/partner-program/schemas';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function EditPartnerLeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { leadId: rawLeadId } = await params;
  const leadId = partnerLeadIdSchema.safeParse(rawLeadId);
  if (!leadId.success) {
    return (
      <EmptyState
        actionHref="/partner/leads"
        actionLabel="Back to leads"
        description="The requested lead could not be found."
        title="Lead unavailable"
      />
    );
  }

  try {
    const [query, user] = await Promise.all([
      searchParams,
      requireUser(`/partner/leads/${leadId.data}/edit`),
    ]);
    const lead = await getEditablePartnerLead(user.id, leadId.data);

    return (
      <div className="grid gap-7">
        <div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/partner/leads">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to leads
            </Link>
          </Button>
        </div>
        <PageHeader
          description="You can change this lead while it is awaiting Nom’s review."
          eyebrow="Partner portal"
          title={`Edit ${lead.restaurant_name}`}
        />
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>Lead details</CardTitle>
            <CardDescription>
              Saving is blocked automatically if Nom starts reviewing the lead while this page is open.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={query.error} />
            <PartnerLeadForm action={updateLeadAction} lead={lead} submitLabel="Save changes" />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    return (
      <EmptyState
        actionHref="/partner/leads"
        actionLabel="Back to leads"
        description={error instanceof Error ? error.message : 'This lead cannot be edited.'}
        title="Lead cannot be edited"
      />
    );
  }
}
