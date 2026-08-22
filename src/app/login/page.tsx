import Link from 'next/link';
import { signInAction } from '@/app/actions/auth';
import { ErrorBanner } from '@/components/program/error-banner';
import { NoticeBanner } from '@/components/program/notice-banner';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ACCOUNT_ACCESS_NOTICE } from '@/lib/supabase/auth-flow';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const noticeMessage = params.notice === 'application-saved' ? ACCOUNT_ACCESS_NOTICE : null;
  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader />
      <main className="marketing-container grid min-h-[calc(100vh-4.75rem)] items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
        <section>
          <p className="marketing-eyebrow text-success">Partner access</p>
          <h1 className="marketing-title mt-6 max-w-[9ch]">Pick up where your application left off.</h1>
          <p className="mt-6 max-w-lg leading-8 text-ink-body">Log in to view your review state, existing restaurant history, deals, setup work, commissions, and payouts.</p>
        </section>
        <Card className="w-full max-w-xl justify-self-end">
          <CardHeader>
            <CardTitle className="text-3xl">Partner login</CardTitle>
            <CardDescription>
              New partner? <Link href="/apply" className="text-primary underline">Apply here</Link>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={params.error ?? null} />
            <NoticeBanner message={noticeMessage} />
            <form action={signInAction} className="grid gap-5">
              <input type="hidden" name="returnTo" value={params.returnTo || '/partner'} />
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-primary underline">Forgot password?</Link>
                </div>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <Button type="submit">Login</Button>
            </form>
          </CardContent>
        </Card>
      </main>
      <MarketingFooter />
    </div>
  );
}
