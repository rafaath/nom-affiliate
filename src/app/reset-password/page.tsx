import Link from 'next/link';
import { updatePasswordAction } from '@/app/actions/auth';
import { ErrorBanner } from '@/components/program/error-banner';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCurrentUser } from '@/lib/supabase/auth';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, currentUser] = await Promise.all([searchParams, getCurrentUser()]);

  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader currentUser={currentUser} />
      <main className="marketing-container grid min-h-[calc(100vh-4.75rem)] items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
        <section>
          <p className="marketing-eyebrow text-success">Account recovery</p>
          <h1 className="marketing-title mt-6 max-w-[10ch]">Choose a new password.</h1>
          <p className="mt-6 max-w-lg leading-8 text-ink-body">
            Use a unique password with at least eight characters. After updating it, your saved partner application will be linked to this account.
          </p>
        </section>

        <Card className="w-full max-w-xl justify-self-end">
          <CardHeader>
            <CardTitle className="text-3xl">Set new password</CardTitle>
            <CardDescription>
              {currentUser
                ? `Updating the password for ${currentUser.email ?? 'your account'}.`
                : 'Open this page using the link in your password-reset email.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner
              message={
                params.error ??
                (currentUser ? null : 'This password-reset session is missing or expired. Request a new link.')
              }
            />
            {currentUser ? (
              <form action={updatePasswordAction} className="grid gap-5">
                <div className="grid gap-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="passwordConfirmation">Confirm new password</Label>
                  <Input
                    id="passwordConfirmation"
                    name="passwordConfirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
                <Button type="submit">Update password</Button>
              </form>
            ) : (
              <Button asChild>
                <Link href="/forgot-password">Request another reset link</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
      <MarketingFooter />
    </div>
  );
}
