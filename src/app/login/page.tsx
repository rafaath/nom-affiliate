import Link from 'next/link';
import { signInAction } from '@/app/actions/auth';
import { ErrorBanner } from '@/components/program/error-banner';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto flex max-w-lg flex-col px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Partner login</CardTitle>
            <CardDescription>
              New partner? <Link href="/apply" className="text-primary underline">Apply here</Link>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={params.error ? decodeURIComponent(params.error) : null} />
            <form action={signInAction} className="grid gap-5">
              <input type="hidden" name="returnTo" value={params.returnTo || '/partner'} />
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <Button type="submit">Login</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
