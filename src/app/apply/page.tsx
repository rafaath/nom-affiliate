import Link from 'next/link';
import { redirect } from 'next/navigation';
import { submitApplicationAction } from '@/app/actions/partner';
import { ErrorBanner } from '@/components/program/error-banner';
import { FormDraftPersistence } from '@/components/program/form-draft-persistence';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { partnerTypeLabels } from '@/lib/partner-program/labels';
import { PARTNER_TYPES } from '@/lib/partner-program/types';
import { getCurrentUser } from '@/lib/supabase/auth';
import { claimPendingPartnerApplication, getPartnerProfileByAuthUser } from '@/lib/partner-program/data';
import { APPLICATION_TERMS_VERSION } from '@/lib/partner-program/terms';
import { PARTNER_PRIVACY_NOTICE_VERSION } from '@/lib/partner-program/privacy-notice';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const currentUser = await getCurrentUser();
  let errorMessage = params.error ?? null;

  if (currentUser?.email) {
    try {
      const existingProfile = await getPartnerProfileByAuthUser(currentUser.id);
      if (existingProfile) redirect('/partner?application=already-exists');
      const recoveredProfile = await claimPendingPartnerApplication(currentUser.id, currentUser.email);
      if (recoveredProfile) redirect('/partner?application=recovered');
    } catch (error) {
      if (isSupabaseConfigError(error)) errorMessage = error.message;
      else throw error;
    }
  }

  const isFinishingApplication = Boolean(currentUser);

  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader currentUser={currentUser} />
      <main className="marketing-container grid gap-10 py-12 lg:grid-cols-12 lg:py-20">
        <section className="lg:col-span-5">
          <p className="marketing-eyebrow text-success">Partner application</p>
          <h1 className="marketing-title mt-6 max-w-[10ch]">Tell us how you can help restaurants succeed.</h1>
          <p className="mt-6 max-w-lg leading-8 text-ink-body">
            No existing network is required. Tell us how you plan to find interested restaurants, then follow the review in your portal.
          </p>
          <Card className="mt-9 bg-lilac">
            <CardHeader>
              <CardTitle>After applying</CardTitle>
              <CardDescription>Your account and application stay separate from approval.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-ink-body">
              <p>01 · Confirm your email and account</p>
              <p>02 · Nom reviews the application</p>
              <p>03 · Lead submission unlocks only after approval</p>
              <p>04 · Existing portal history stays visible if access changes</p>
            </CardContent>
          </Card>
        </section>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>{isFinishingApplication ? 'Finish your Nom Partner application' : 'Apply to become a Nom Partner'}</CardTitle>
            <CardDescription>
              {isFinishingApplication ? (
                <>You are logged in as {currentUser?.email}. Submit this form to create your partner profile.</>
              ) : (
                <>Already have an account? <Link className="text-primary underline" href="/login">Log in</Link>.</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={errorMessage} />
            <form id="partner-application-form" action={submitApplicationAction} className="grid gap-5">
              <Field label="Full name" name="fullName" required />
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Phone" name="phone" required />
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  defaultValue={currentUser?.email ?? ''}
                  readOnly={Boolean(currentUser?.email)}
                  required
                />
              </div>
              {isFinishingApplication ? null : (
                <Field label="Create password" name="password" type="password" minLength={8} required />
              )}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="City" name="city" required />
                <Field label="Locality / areas covered" name="localityAreasCsv" placeholder="Koramangala, Indiranagar" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partnerType">How do you want to work with Nom?</Label>
                <NativeSelect
                  id="partnerType"
                  name="partnerType"
                  defaultValue="affiliate"
                >
                  {PARTNER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {partnerTypeLabels[type]}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <Field label="Restaurant contacts you already have (0 is okay)" name="restaurantNetworkSize" type="number" min={0} defaultValue={0} required />
              <div className="grid gap-3 rounded-xl border p-4">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input name="canVisitRestaurants" type="checkbox" className="size-4" />
                  I can visit restaurants physically.
                </label>
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input name="canHelpSetup" type="checkbox" className="size-4" />
                  I can help restaurants with setup/onboarding.
                </label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="applicantKind">Applicant type</Label>
                <NativeSelect
                  id="applicantKind"
                  name="applicantKind"
                  defaultValue="individual"
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company / agency</option>
                </NativeSelect>
              </div>
              <Field label="Business / agency name" name="businessName" />
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="LinkedIn profile (optional)"
                  name="linkedinProfileUrl"
                  type="url"
                  placeholder="https://www.linkedin.com/in/your-name"
                />
                <Field
                  label="Google Drive resume link (optional)"
                  name="resumeDriveUrl"
                  type="url"
                  placeholder="Google Drive or Google Docs link"
                />
              </div>
              <p className="-mt-2 text-sm text-muted-foreground">If you share a resume, make sure anyone with the link can view it.</p>
              <TextField label="Restaurant experience (write ‘none’ if you’re new)" name="restaurantExperience" required />
              <TextField label="Current work / background" name="background" required />
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Preferred language" name="preferredLanguage" required />
                <Field label="How did you hear about this?" name="heardFrom" required />
              </div>
              <div className="rounded-lg border border-plum/15 bg-lilac/45 p-4">
                <input type="hidden" name="applicationTermsVersion" value={APPLICATION_TERMS_VERSION} />
                <label className="flex items-start gap-3 text-sm leading-6" htmlFor="applicationTermsAccepted">
                  <input
                    className="mt-1 size-4 shrink-0 accent-plum"
                    id="applicationTermsAccepted"
                    name="applicationTermsAccepted"
                    type="checkbox"
                    required
                  />
                  <span>
                    I confirm that I am at least 18 and that the information above is accurate. I accept the{' '}
                    <Link
                      className="font-bold text-plum underline underline-offset-4"
                      href="/application-terms"
                      rel="noreferrer"
                      target="_blank"
                    >
                      Partner Application Terms
                    </Link>{' '}
                    and acknowledge the{' '}
                    <Link
                      className="font-bold text-plum underline underline-offset-4"
                      href="/privacy"
                      rel="noreferrer"
                      target="_blank"
                    >
                      Partner Program Privacy Notice
                    </Link>
                    . Terms version {APPLICATION_TERMS_VERSION}; privacy version {PARTNER_PRIVACY_NOTICE_VERSION}.
                  </span>
                </label>
              </div>
              <Button type="submit" size="lg">
                {isFinishingApplication ? 'Finish application' : 'Submit application'}
              </Button>
            </form>
            <FormDraftPersistence
              formId="partner-application-form"
              hasError={Boolean(errorMessage)}
              storageKey="nom-partner-application-draft"
            />
          </CardContent>
        </Card>
      </main>
      <MarketingFooter isSignedIn={Boolean(currentUser)} />
    </div>
  );
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  const { label, name, ...inputProps } = props;
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...inputProps} />
    </div>
  );
}

function TextField({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} required={required} />
    </div>
  );
}
