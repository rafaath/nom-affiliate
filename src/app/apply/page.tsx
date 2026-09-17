import Link from 'next/link';
import { redirect } from 'next/navigation';
import { submitApplicationAction } from '@/app/actions/partner';
import { ErrorBanner } from '@/components/program/error-banner';
import { FormDraftPersistence } from '@/components/program/form-draft-persistence';
import { GoogleSignInButton } from '@/components/program/google-sign-in-button';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { SubmitButton } from '@/components/program/submit-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/supabase/auth';
import { claimPendingPartnerApplication, getPartnerProfileByAuthUser } from '@/lib/partner-program/data';
import { APPLICATION_TERMS_VERSION } from '@/lib/partner-program/terms';
import { isSupabaseConfigError } from '@/lib/supabase/env';

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
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

  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader currentUser={currentUser} />
      <main className="marketing-container grid items-start gap-7 py-8 lg:grid-cols-2 lg:gap-x-16 lg:py-16">
        <section>
          <p className="marketing-eyebrow text-success">Nom Partner Program</p>
          <h1 className="mt-4 max-w-[14ch] font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Your next introduction could pay off.
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-ink-body">
            Earn ₹1,000–₹4,000 per eligible converted restaurant branch.*
            No existing restaurant network needed.
          </p>
        </section>

        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle>{currentUser ? 'A few details, and you’re done.' : 'Become a Nom partner'}</CardTitle>
            <CardDescription>
              {currentUser ? (
                <span className="break-words">Signed in as {currentUser.email}</span>
              ) : 'Continue with Google, then add your name, phone, and city.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={errorMessage} />
            {!currentUser ? (
              <div className="grid gap-4">
                <GoogleSignInButton returnTo="/apply" label="Sign in with Google to apply" />
                <Link className="justify-self-center rounded-sm text-sm font-medium text-plum underline underline-offset-4 hover:text-ink-body focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" href="/#workflow">
                  Learn how it works
                </Link>
                <p className="text-sm leading-6 text-muted-foreground">
                  No password to create. Already applied? Use the same Google account to open your portal.
                </p>
              </div>
            ) : (
              <>
                <form id="partner-application-form" action={submitApplicationAction} className="grid gap-5">
                  <Field label="Full name" name="fullName" autoComplete="name" maxLength={120} defaultValue={currentUser.fullName ?? ''} required />
                  <Field label="Phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={40} required />
                  <Field label="City" name="city" autoComplete="address-level2" maxLength={80} placeholder="e.g. Bengaluru" required />
                  <div className="rounded-lg border border-plum/15 bg-lilac/45 p-4">
                    <input type="hidden" name="applicationTermsVersion" value={APPLICATION_TERMS_VERSION} />
                    <label className="flex items-start gap-3 text-sm leading-6" htmlFor="applicationTermsAccepted">
                      <input className="mt-1 size-4 shrink-0 accent-plum" id="applicationTermsAccepted" name="applicationTermsAccepted" type="checkbox" required />
                      <span>
                        I confirm that I am at least 18 and that the information above is accurate. I accept the{' '}
                        <Link className="font-bold text-plum underline underline-offset-4" href="/application-terms" rel="noreferrer" target="_blank">
                          Partner Application Terms
                        </Link>{' '}
                        and acknowledge the{' '}
                        <Link className="font-bold text-plum underline underline-offset-4" href="/privacy" rel="noreferrer" target="_blank">
                          Partner Program Privacy Notice
                        </Link>.
                      </span>
                    </label>
                  </div>
                  <SubmitButton size="lg" pendingLabel="Submitting application…">Submit application</SubmitButton>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Nom reviews each application. You can add optional profile details in your portal after submitting.
                  </p>
                </form>
                <FormDraftPersistence formId="partner-application-form" hasError={Boolean(errorMessage)} storageKey={`nom-partner-application-draft:${currentUser.id}`} />
              </>
            )}
          </CardContent>
        </Card>

        <section aria-labelledby="after-applying-heading" className="max-w-lg text-sm leading-6 text-ink-body">
          <h2 id="after-applying-heading" className="font-display text-xl font-bold text-plum">What happens next?</h2>
          <p className="mt-2">Nom reviews your application. Once approved, accept the partner agreement and start referring restaurants.</p>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            *25% of the first paid annual subscription invoice, paid once per eligible converted branch.
            ₹1,000–₹4,000 is based on annual plans priced ₹4,000–₹16,000. Not monthly or on renewals.{' '}
            <Link className="underline underline-offset-4" href="/referral-partner-agreement">Terms apply</Link>.
          </p>
        </section>
      </main>
      <MarketingFooter isSignedIn={Boolean(currentUser)} />
    </div>
  );
}

function Field({ label, name, ...inputProps }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...inputProps} />
    </div>
  );
}
