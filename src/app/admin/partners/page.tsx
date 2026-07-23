import { reviewApplicationAction } from '@/app/actions/admin';
import { AdminRecordDetails } from '@/components/program/admin-record-details';
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
import { partnerTypeLabels } from '@/lib/partner-program/labels';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function AdminPartnersPage() {
  try {
    await requirePartnerAdmin('/admin/partners');
    const dashboard = await getAdminDashboard();

    return (
      <div>
        <PageHeader eyebrow="Partner admin" title="Applications" description="Review applicant fit and verify application and partner-agreement records." />
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
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {application.program_terms_version && application.program_terms_accepted_at
                      ? `Terms ${application.program_terms_version} · accepted ${new Date(application.program_terms_accepted_at).toLocaleString('en-IN')}`
                      : 'Legacy submission'}
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </div>
              <AdminRecordDetails
                summary="View full application"
                items={[
                  { label: 'Full name', value: application.full_name },
                  { label: 'Email', value: application.email },
                  { label: 'Phone', value: application.phone },
                  { label: 'City', value: application.city },
                  { label: 'Areas covered', value: formatList(application.locality_areas) },
                  {
                    label: 'Requested partner type',
                    value: partnerTypeLabels[application.requested_partner_type as keyof typeof partnerTypeLabels],
                  },
                  { label: 'Applicant type', value: application.applicant_kind === 'company' ? 'Company / agency' : 'Individual' },
                  { label: 'Business / agency', value: application.business_name },
                  { label: 'Existing restaurant contacts', value: application.restaurant_network_size },
                  { label: 'Can visit restaurants', value: formatBoolean(application.can_visit_restaurants) },
                  { label: 'Can help with setup', value: formatBoolean(application.can_help_setup) },
                  { label: 'Preferred language', value: application.preferred_language },
                  { label: 'How they heard about Nom', value: application.heard_from },
                  {
                    label: 'LinkedIn profile',
                    value: application.linkedin_profile_url ? <ExternalLink href={application.linkedin_profile_url}>Open LinkedIn profile</ExternalLink> : null,
                  },
                  {
                    label: 'Resume',
                    value: application.resume_drive_url ? <ExternalLink href={application.resume_drive_url}>Open resume</ExternalLink> : null,
                  },
                  { label: 'Restaurant experience', value: application.restaurant_experience, wide: true },
                  { label: 'Current work / background', value: application.background, wide: true },
                  { label: 'Submitted', value: formatDate(application.submitted_at) },
                  { label: 'Terms version', value: application.program_terms_version ?? 'Legacy submission' },
                  { label: 'Terms accepted', value: formatDate(application.program_terms_accepted_at) },
                  { label: 'Privacy notice version', value: application.privacy_notice_version ?? 'Legacy submission' },
                  { label: 'Privacy notice acknowledged', value: formatDate(application.privacy_notice_acknowledged_at) },
                  { label: 'Operational contact acknowledged', value: formatDate(application.program_contact_consent_at) },
                  { label: 'Referral agreement version', value: application.current_agreement_version ?? 'Not accepted' },
                  { label: 'Referral agreement accepted', value: formatDate(application.current_agreement_accepted_at) },
                  { label: 'Agreement fingerprint', value: application.current_agreement_sha256, wide: true },
                ]}
              />
              <form action={reviewApplicationAction} className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                <input type="hidden" name="applicationId" value={application.id} />
                <input type="hidden" name="partnerId" value={application.partner_id} />
                <div className="grid gap-2"><Label htmlFor={`application-status-${application.id}`}>Application status</Label><NativeSelect id={`application-status-${application.id}`} name="status" defaultValue={application.status}>
                  <option value={application.status}>{application.status.replaceAll('_', ' ')}</option>
                  <option value="approved_affiliate">Approve affiliate</option>
                  <option value="approved_sales_partner">Approve sales partner</option>
                  <option value="approved_setup_pending_training">Setup pending training</option>
                  <option value="approved_full_service">Approve full-service</option>
                  <option value="needs_more_information">Request info</option>
                  <option value="interview_requested">Interview requested</option>
                  <option value="rejected">Reject</option>
                </NativeSelect></div>
                <div className="grid gap-2"><Label htmlFor={`application-note-${application.id}`}>Review note</Label><Input id={`application-note-${application.id}`} name="note" defaultValue={application.review_note ?? ''} /></div>
                <Button type="submit">Save review</Button>
              </form>
            </div>
          ))}
          {dashboard.applications.length === 0 ? <EmptyState title="No applications" description="Partner applications appear here." /> : null}
        </CardContent>
      </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a className="font-semibold text-primary underline underline-offset-4" href={href} rel="noreferrer" target="_blank">{children}</a>;
}

function formatBoolean(value: boolean | null | undefined) {
  return value ? 'Yes' : 'No';
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString('en-IN') : null;
}

function formatList(value: unknown) {
  return Array.isArray(value) && value.length > 0 ? value.join(', ') : null;
}
