import Link from 'next/link';
import { redirect } from 'next/navigation';
import { saveApplicationDetailsAction } from '@/app/actions/partner';
import { ConfigRequired } from '@/components/program/config-required';
import { ErrorBanner } from '@/components/program/error-banner';
import { FormDraftPersistence } from '@/components/program/form-draft-persistence';
import { PageHeader } from '@/components/program/page-header';
import { SubmitButton } from '@/components/program/submit-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { getPartnerApplicationDetails } from '@/lib/partner-program/data';
import { partnerTypeLabels } from '@/lib/partner-program/labels';
import { PARTNER_TYPES } from '@/lib/partner-program/types';
import { requireUser } from '@/lib/supabase/auth';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function PartnerProfilePage({ searchParams }: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  try {
    const user = await requireUser('/partner/profile');
    const [params, application] = await Promise.all([searchParams, getPartnerApplicationDetails(user.id)]);
    if (!application) redirect('/apply');

    return (
      <div className="grid max-w-3xl gap-6">
        <PageHeader eyebrow="Partner portal" title="Profile details" description="Your application is already submitted. These details are optional—you can skip any question or come back later." />
        <ErrorBanner message={params.error} />
        {params.saved === '1' && !params.error ? <p role="status" className="text-sm font-medium text-success">Your profile details have been saved.</p> : null}
        <Card>
          <CardContent className="pt-6">
            <form id="partner-profile-details-form" action={saveApplicationDetailsAction} className="grid gap-8">
              <fieldset className="grid min-w-0 gap-5">
                <legend className="mb-4 font-display text-xl font-bold">How you’d like to work with Nom</legend>
                <Field label="Locality / areas covered" name="localityAreasCsv" placeholder="Koramangala, Indiranagar" defaultValue={application.locality_areas.join(', ')} />
                <div className="grid gap-2">
                  <Label htmlFor="partnerType">Interested in</Label>
                  <NativeSelect id="partnerType" name="partnerType" defaultValue={application.requested_partner_type}>
                    {PARTNER_TYPES.map((type) => <option key={type} value={type}>{partnerTypeLabels[type]}</option>)}
                  </NativeSelect>
                  <p className="text-xs text-muted-foreground">A preference, not a change to your approved partner level.</p>
                </div>
                <Field label="Restaurant contacts you’d like to introduce" name="restaurantNetworkSize" type="number" min={0} max={100000} defaultValue={application.restaurant_network_size || ''} placeholder="0 is okay" />
                <div className="grid gap-3">
                  <label className="flex items-start gap-3 text-sm"><input name="canVisitRestaurants" type="checkbox" className="mt-0.5 size-4 shrink-0 accent-plum" defaultChecked={application.can_visit_restaurants} />I can visit restaurants in person.</label>
                  <label className="flex items-start gap-3 text-sm"><input name="canHelpSetup" type="checkbox" className="mt-0.5 size-4 shrink-0 accent-plum" defaultChecked={application.can_help_setup} />I can help restaurants with setup / onboarding.</label>
                </div>
                <TextField label="Restaurant experience" name="restaurantExperience" defaultValue={application.restaurant_experience} placeholder="New to this? That’s okay." />
              </fieldset>

              <fieldset className="grid min-w-0 gap-5 border-t pt-5">
                <legend className="pr-3 font-display text-xl font-bold">A little about you</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="applicantKind">Applying as</Label>
                    <NativeSelect id="applicantKind" name="applicantKind" defaultValue={application.applicant_kind}>
                      <option value="individual">Individual</option><option value="company">Company / agency</option>
                    </NativeSelect>
                  </div>
                  <Field label="Business / agency name" name="businessName" maxLength={160} defaultValue={application.business_name ?? ''} />
                </div>
                <TextField label="Current work / background" name="background" defaultValue={application.background} />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Preferred language" name="preferredLanguage" maxLength={80} defaultValue={application.preferred_language} />
                  <Field label="How did you hear about Nom?" name="heardFrom" maxLength={160} defaultValue={application.heard_from} />
                </div>
                <Field label="LinkedIn profile" name="linkedinProfileUrl" type="url" maxLength={2048} defaultValue={application.linkedin_profile_url ?? ''} placeholder="https://www.linkedin.com/in/your-name" />
                <Field label="Google Drive resume link" name="resumeDriveUrl" type="url" maxLength={2048} defaultValue={application.resume_drive_url ?? ''} placeholder="Google Drive or Google Docs link" />
                <p className="-mt-2 text-xs text-muted-foreground">If you share a resume, make sure anyone with the link can view it.</p>
              </fieldset>

              <div className="grid gap-3 border-t pt-5 sm:flex">
                <SubmitButton pendingLabel="Saving details…">Save details</SubmitButton>
                <Button variant="outline" asChild><Link href="/partner">Back to dashboard</Link></Button>
              </div>
              <p className="-mt-4 text-xs text-muted-foreground">Saving details doesn’t change your application’s approval status.</p>
            </form>
            <FormDraftPersistence formId="partner-profile-details-form" storageKey={`nom-partner-profile-draft:${user.id}`} hasError={Boolean(params.error)} clearOnSuccess={params.saved === '1'} />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    if (isSupabaseConfigError(error)) return <ConfigRequired message={error.message} />;
    throw error;
  }
}

function Field({ label, name, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} {...props} /></div>;
}

function TextField({ label, name, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Textarea id={name} name={name} maxLength={1200} {...props} /></div>;
}
