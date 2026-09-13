import Link from "next/link";
import { ErrorBanner } from "@/components/program/error-banner";
import { GoogleSignInButton } from "@/components/program/google-sign-in-button";
import { NoticeBanner } from "@/components/program/notice-banner";
import { MarketingHeader } from "@/components/shell/marketing-header";
import { MarketingFooter } from "@/components/shell/marketing-footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACCOUNT_ACCESS_NOTICE, GOOGLE_ONLY_NOTICE } from "@/lib/supabase/auth-flow";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const noticeMessage =
    params.notice === "application-saved" ? ACCOUNT_ACCESS_NOTICE :
    params.notice === "google-only" ? GOOGLE_ONLY_NOTICE : null;
  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader />
      <main className="marketing-container grid min-h-[calc(100vh-4.75rem)] items-center gap-10 py-12 lg:grid-cols-2 lg:py-20">
        <section>
          <p className="marketing-eyebrow text-success">Partner access</p>
          <h1 className="marketing-title mt-6 max-w-[9ch]">
            Pick up where your application left off.
          </h1>
          <p className="mt-6 max-w-lg leading-8 text-ink-body">
            Log in to view your review state, existing restaurant history,
            deals, setup work, commissions, and payouts.
          </p>
        </section>
        <Card className="w-full max-w-xl justify-self-end">
          <CardHeader>
            <CardTitle className="text-3xl">Partner login</CardTitle>
            <CardDescription>
              New partner?{" "}
              <Link href="/apply" className="text-primary underline">
                Apply here
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBanner message={params.error ?? null} />
            <NoticeBanner message={noticeMessage} />
            <GoogleSignInButton returnTo={params.returnTo || "/partner"} />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Use the Google account with the same email as your Nom partner
              account. Password and email-link sign-in are not available here.
            </p>
          </CardContent>
        </Card>
      </main>
      <MarketingFooter />
    </div>
  );
}
