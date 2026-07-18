import Link from 'next/link';
import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Handshake,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const sellableModules = [
  'POS',
  'Inventory',
  'QR menu',
  'QR ordering',
  'Basic staff setup',
  'Menu setup',
  'Restaurant onboarding',
];

const partnerTypes = [
  'Affiliate',
  'Sales Partner',
  'Implementation Partner',
  'Full-Service Partner',
  'Agency / Reseller',
];

const workflow = [
  'Apply and get your referral code',
  'Learn the pitch and commission rules',
  'Register restaurant leads',
  'Nom reviews and accepts valid opportunities',
  'Help close, set up, and train',
  'Track commission through payout',
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <section className="grain relative overflow-hidden border-b">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:py-32">
          <div className="relative z-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm">
              <Handshake className="size-4 text-primary" />
              Nom Affiliate & Implementation Partner Program
            </div>
            <h1 className="max-w-4xl text-balance text-5xl font-black tracking-[-0.04em] md:text-7xl">
              Sell Nom to restaurants. Help them go live. Earn from real success.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Built for local sellers, freelancers, consultants, POS hardware providers, agencies,
              and restaurant insiders who can bring restaurants onto Nom and help them adopt it.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/apply">
                  Become a partner
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Partner login</Link>
              </Button>
            </div>
          </div>
          <Card className="relative z-10 overflow-hidden border-primary/20 bg-card/90 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">The v1 partner engine</CardTitle>
              <CardDescription>
                A serious acquisition and onboarding workflow, not a cheap referral gimmick.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {[
                ['Lead ownership', 'Registered leads are reviewed, accepted, and tracked.'],
                ['Setup value', 'Certified partners can earn for implementation work.'],
                ['Transparent money', 'Every commission has a status, condition, and payout path.'],
                ['Admin control', 'Nom approves partners, leads, setup, commissions, and payouts.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-xl border bg-background/70 p-4">
                  <div className="flex items-center gap-3 font-semibold">
                    <CheckCircle2 className="size-5 text-primary" />
                    {title}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="earn" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          <ValueCard
            icon={<Building2 />}
            title="What you sell"
            items={sellableModules}
          />
          <ValueCard
            icon={<TrendingUp />}
            title="Who you sell to"
            items={['Restaurants', 'Cafes', 'Cloud kitchens', 'Food courts', 'Multi-outlet brands']}
          />
          <ValueCard
            icon={<BadgeIndianRupee />}
            title="How you earn"
            items={['Referral commission', 'Sales commission', 'Setup commission', 'Add-on commission', 'Bonuses']}
          />
        </div>
      </section>

      <section className="border-y bg-card/60">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Partner types</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Start simple. Grow into certification.</h2>
            <p className="mt-4 text-muted-foreground">
              Someone can start with one warm restaurant contact and grow into a full-service locality partner.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {partnerTypes.map((type) => (
              <div key={type} className="rounded-xl border bg-background p-4 font-semibold">
                {type}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Workflow</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">The loop from lead to payout</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map((step, index) => (
            <Card key={step}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {index + 1}
                  </span>
                  {step}
                </CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section id="trust" className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-20 md:grid-cols-3">
          <div className="md:col-span-2">
            <ShieldCheck className="mb-6 size-12" />
            <h2 className="text-4xl font-black tracking-tight">Trust is the product.</h2>
            <p className="mt-4 max-w-2xl text-primary-foreground/80">
              Partners earn only when restaurants are real, accepted, paying, properly onboarded,
              and protected from bad promises. The system rewards durable adoption.
            </p>
          </div>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/apply">
              Apply now
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardCheck className="size-4 text-primary" />
            {item}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
