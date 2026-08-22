import Link from 'next/link';
import { requestPasswordResetAction } from '@/app/actions/auth';
import { ErrorBanner } from '@/components/program/error-banner';
import { NoticeBanner } from '@/components/program/notice-banner';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  const sentMessage =
    params.sent === '1'
      ? 'If an account exists for that email, a password-reset link is on its way. Check your inbox and spam folder.'
      : null;

  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader />
      <main className="marketing-container grid min-h-[calc(100vh-4.75rem)] items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
        <section>
          <p className="marketing-eyebrow text-success">Account recovery</p>
          <h1 className="marketing-title mt-6 max-w-[10ch]">Reset your partner password.</h1>
          <p className="mt-6 max-w-lg leading-8 text-ink-body">
            Enter the email used for your Nom account. We will send a secure link that lets you choose a new password.
          </p>
        </section>

        <Card className="w-full max-w-xl justify-self-end">
          <CardHeader>
            <CardTitle className="text-3xl">Forgot password</CardTitle>
            <CardDescription>
              Remembered it? <Link href="/login" className="text-primary underline">Return to login</Link>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={params.error ?? null} />
            <NoticeBanner message={sentMessage} />
            <form action={requestPasswordResetAction} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <Button type="submit">Send reset link</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <MarketingFooter />
    </div>
  );
}
