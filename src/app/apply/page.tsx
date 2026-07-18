import Link from 'next/link';
import { redirect } from 'next/navigation';
import { submitApplicationAction } from '@/app/actions/partner';
import { ErrorBanner } from '@/components/program/error-banner';
import { FormDraftPersistence } from '@/components/program/form-draft-persistence';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { partnerTypeLabels } from '@/lib/partner-program/labels';
import { PARTNER_TYPES } from '@/lib/partner-program/types';
import { getCurrentUser } from '@/lib/supabase/auth';
import { claimPendingPartnerApplication } from '@/lib/partner-program/data';
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
      const recoveredProfile = await claimPendingPartnerApplication(currentUser.id, currentUser.email);
      if (recoveredProfile) redirect('/partner?application=recovered');
    } catch (error) {
      if (isSupabaseConfigError(error)) errorMessage = error.message;
      else throw error;
    }
  }

  const isFinishingApplication = Boolean(currentUser);

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Partner application</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Tell us how you can help restaurants grow.</h1>
          <p className="mt-4 text-muted-foreground">
            You get basic access immediately after applying. Nom reviews approval level, setup
            eligibility, commissions, and payout readiness.
          </p>
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>After applying</CardTitle>
              <CardDescription>What unlocks first.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <p>• Referral code and beginner training</p>
              <p>• Restaurant lead submission</p>
              <p>• Commission and payout status tracking</p>
              <p>• Admin review for higher partner tiers</p>
            </CardContent>
          </Card>
        </section>

        <Card>
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
                <select
                  id="partnerType"
                  name="partnerType"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="affiliate"
                >
                  {PARTNER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {partnerTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Number of restaurant contacts you know" name="restaurantNetworkSize" type="number" min={0} defaultValue={0} required />
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
                <select
                  id="applicantKind"
                  name="applicantKind"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="individual"
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company / agency</option>
                </select>
              </div>
              <Field label="Business / agency name" name="businessName" />
              <TextField label="Experience with restaurants" name="restaurantExperience" required />
              <TextField label="Current work / background" name="background" required />
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Preferred language" name="preferredLanguage" required />
                <Field label="How did you hear about this?" name="heardFrom" required />
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
