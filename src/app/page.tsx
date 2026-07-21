import Image from 'next/image';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown,
  ArrowRight,
  BadgeIndianRupee,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  HandCoins,
  Headphones,
  LineChart,
  Presentation,
  ReceiptIndianRupee,
  Store,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { MarketingFooter } from '@/components/shell/marketing-footer';
import { MarketingHeader } from '@/components/shell/marketing-header';
import { AnchoredDetails } from '@/components/program/anchored-details';
import { Button } from '@/components/ui/button';
import {
  PARTNER_PROGRAM_TERMS_EFFECTIVE_DATE,
  PARTNER_PROGRAM_TERMS_VERSION,
  partnerProgramTerms,
} from '@/lib/partner-program/terms';
import { getCurrentUser } from '@/lib/supabase/auth';

const audiences: Array<{ title: string; description: string; Icon: LucideIcon }> = [
  {
    title: 'Independent prospectors',
    description: 'Use LinkedIn, directories, or local research.',
    Icon: BriefcaseBusiness,
  },
  {
    title: 'Restaurant connectors',
    description: 'Start with people you already know.',
    Icon: Store,
  },
  {
    title: 'Consultants & agencies',
    description: 'Help restaurants through your existing work.',
    Icon: Building2,
  },
  {
    title: 'POS & hospitality pros',
    description: 'Build on your industry experience.',
    Icon: ReceiptIndianRupee,
  },
];

const workflow = [
  {
    number: '01',
    title: 'Apply',
    description: 'Tell us about yourself, confirm your email, and wait for approval.',
  },
  {
    number: '02',
    title: 'Refer',
    description: 'Use your network or thoughtful outreach. Submit only after a restaurant agrees to be contacted.',
  },
  {
    number: '03',
    title: 'Track & earn',
    description: 'Follow each referral and see when your reward becomes eligible.',
  },
];

const support: Array<{ title: string; description: string; Icon: LucideIcon }> = [
  {
    title: 'Simple training',
    description: 'Learn who Nom is right for and how to introduce it.',
    Icon: Presentation,
  },
  {
    title: 'Help when you need it',
    description: 'Nom supports demos, questions, and restaurant onboarding.',
    Icon: Headphones,
  },
  {
    title: 'Clear tracking',
    description: 'Follow your referrals and rewards from one portal.',
    Icon: LineChart,
  },
];

const earningPaths: Array<{ label: string; title: string; description: string; Icon: LucideIcon }> = [
  {
    label: 'Referral',
    title: 'Find an interested restaurant',
    description: 'Bring a genuine opportunity to Nom.',
    Icon: UsersRound,
  },
  {
    label: 'Sales',
    title: 'Help close the deal',
    description: 'Approved sales partners can stay involved.',
    Icon: HandCoins,
  },
  {
    label: 'Setup',
    title: 'Support the setup',
    description: 'Help an approved restaurant get started.',
    Icon: Wrench,
  },
  {
    label: 'Custom',
    title: 'Build a bigger partnership',
    description: 'Explore custom work through a written offer.',
    Icon: BadgeIndianRupee,
  },
];

const faqs = [
  {
    question: 'Who can apply?',
    answer: 'Anyone willing to learn and do thoughtful outreach can apply. You do not need an existing restaurant network.',
  },
  {
    question: 'When can I refer a restaurant?',
    answer: 'After Nom approves your application. The restaurant must also agree to be contacted.',
  },
  {
    question: 'How do I earn?',
    answer: 'Your portal shows the current reward and what must happen before each opportunity earns it.',
  },
];

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  const primaryAction = currentUser
    ? { href: '/partner', label: 'Open partner portal' }
    : { href: '/apply', label: 'Apply to partner' };

  return (
    <div className="min-h-screen bg-paper">
      <MarketingHeader currentUser={currentUser} />
      <main className="overflow-x-clip">
        <section className="bg-plum text-paper">
          <div className="marketing-container grid gap-12 py-16 lg:grid-cols-12 lg:items-center lg:py-24">
            <div className="lg:col-span-6">
              <p className="marketing-eyebrow text-lime">Nom partner program</p>
              <h1 className="marketing-display mt-7 max-w-[10ch] text-lilac">
                Find restaurants. Earn with Nom.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-paper/75">
                Use LinkedIn, local research, or your own network to find interested restaurants. Refer them to Nom and earn when eligible referrals succeed.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button className="bg-lime text-plum hover:bg-gold" size="lg" asChild>
                  <Link href={primaryAction.href}>{primaryAction.label} <ArrowRight className="size-4" aria-hidden="true" /></Link>
                </Button>
                <Button className="border-paper/40 text-paper hover:bg-white/10 hover:text-white" size="lg" variant="outline" asChild>
                  <Link href="#workflow">See how it works <ArrowDown className="size-4" aria-hidden="true" /></Link>
                </Button>
              </div>
            </div>

            <div className="relative min-h-[30rem] overflow-hidden rounded-lg border border-white/15 lg:col-span-6 lg:min-h-[38rem]">
              <Image
                alt="Restaurant operator reviewing Nom with a technology advisor"
                className="object-cover"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                src="/partner-restaurant-hero.png"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-plum via-plum/10 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 rounded-lg bg-lime p-5 text-plum sm:inset-x-7 sm:bottom-7 sm:p-6">
                <p className="marketing-eyebrow">Three simple steps</p>
                <p className="mt-3 font-display text-3xl font-bold leading-none sm:text-4xl">Apply → refer → earn</p>
              </div>
            </div>
          </div>
        </section>

        <section id="who" className="marketing-section scroll-mt-20">
          <div className="marketing-container">
            <SectionHeading eyebrow="Open to beginners" title="Start with contacts—or create new ones." />
            <div className="mt-12 grid border-y border-plum/20 sm:grid-cols-2 lg:grid-cols-4">
              {audiences.map(({ title, description, Icon }, index) => (
                <article className={`py-7 sm:p-7 ${index > 0 ? 'border-t border-plum/20 sm:border-t-0' : ''} ${index % 2 ? 'sm:border-l sm:border-plum/20' : ''} ${index > 1 ? 'sm:border-t lg:border-t-0' : ''} ${index > 0 ? 'lg:border-l' : ''}`} key={title}>
                  <Icon className="size-6 text-success" aria-hidden="true" />
                  <h2 className="mt-8 font-display text-2xl font-bold leading-none">{title}</h2>
                  <p className="mt-4 text-sm leading-7 text-ink-body">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="marketing-section scroll-mt-20 bg-lilac">
          <div className="marketing-container">
            <SectionHeading eyebrow="How it works" title="Apply. Refer. Track." />
            <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-plum/20 bg-plum/20 lg:grid-cols-3">
              {workflow.map((step) => (
                <article className="min-h-64 bg-lilac p-6 sm:p-7" key={step.number}>
                  <p className="font-mono text-sm font-bold text-ink-body">{step.number}</p>
                  <h2 className="mt-14 max-w-[11ch] font-display text-3xl font-bold leading-none">{step.title}</h2>
                  <p className="mt-5 text-sm leading-7 text-ink-body">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-section bg-white">
          <div className="marketing-container grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="marketing-eyebrow text-success">Partner support</p>
              <h2 className="marketing-title mt-6 max-w-[9ch]">You make the introduction. We help from there.</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:col-span-8">
              {support.map(({ title, description, Icon }) => (
                <article className="min-h-48 rounded-lg border bg-paper p-6" key={title}>
                  <Icon className="size-5 text-success" aria-hidden="true" />
                  <h3 className="mt-8 font-display text-2xl font-bold leading-none">{title}</h3>
                  <p className="mt-4 text-sm leading-7 text-ink-body">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="earn" className="marketing-section scroll-mt-20 bg-lime">
          <div className="marketing-container">
            <SectionHeading eyebrow="How you earn" title="Referral, sales, setup, or a custom path." description="Your portal shows the current reward for each eligible opportunity." />
            <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-plum/20 bg-plum/20 md:grid-cols-2 xl:grid-cols-4">
              {earningPaths.map(({ label, title, description, Icon }) => (
                <article className="bg-lime p-6" key={label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="marketing-eyebrow">{label}</p>
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <h2 className="mt-12 font-display text-3xl font-bold leading-none">{title}</h2>
                  <p className="mt-5 text-sm leading-7 text-plum/70">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="marketing-section bg-green text-paper">
          <div className="marketing-container grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8">
              <p className="marketing-eyebrow text-lime">Ready to earn?</p>
              <h2 className="marketing-title mt-6 max-w-[12ch] text-lime">Help restaurants grow—and earn with Nom.</h2>
            </div>
            <div className="lg:col-span-4 lg:text-right">
              <Button className="bg-lime text-plum hover:bg-gold" size="lg" asChild><Link href={primaryAction.href}>{currentUser ? 'Open your portal' : 'Start your application'} <ArrowRight className="size-4" /></Link></Button>
            </div>
          </div>
        </section>

        <section id="partner-terms" className="marketing-section scroll-mt-20">
          <div className="marketing-container max-w-5xl">
            <div>
              <p className="marketing-eyebrow text-success">Program terms</p>
              <h2 className="marketing-title mt-6">The important details.</h2>
            </div>
            <AnchoredDetails anchorId="partner-terms" className="group mt-9 rounded-lg border border-plum/20 bg-white px-5 sm:px-7">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-6 font-display text-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Read the program terms
                <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="border-t border-plum/15 py-5 text-sm text-ink-body">
                Version {PARTNER_PROGRAM_TERMS_VERSION} · Effective {PARTNER_PROGRAM_TERMS_EFFECTIVE_DATE}
              </p>
              <div>
                {partnerProgramTerms.map((term, index) => (
                  <article className="grid gap-3 border-t border-plum/15 py-5 sm:grid-cols-[3rem_1fr]" key={term.title}>
                    <span className="font-mono text-xs font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                    <div><h3 className="font-display text-xl font-bold">{term.title}</h3><p className="mt-2 text-sm leading-7 text-ink-body">{term.body}</p></div>
                  </article>
                ))}
              </div>
            </AnchoredDetails>
          </div>
        </section>

        <section id="faq" className="marketing-section scroll-mt-20 bg-white">
          <div className="marketing-container grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4"><SectionHeading eyebrow="FAQ" title="Good to know." /></div>
            <div className="divide-y divide-plum/20 border-y border-plum/20 lg:col-span-8">
              {faqs.map((faq) => (
                <details className="group py-1" key={faq.question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-display text-xl font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {faq.question}<ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="max-w-2xl pb-6 text-sm leading-7 text-ink-body">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter isSignedIn={Boolean(currentUser)} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <header>
      <p className="marketing-eyebrow text-success">{eyebrow}</p>
      <h2 className="marketing-title mt-6 max-w-[13ch]">{title}</h2>
      {description ? <p className="mt-6 max-w-3xl text-base leading-8 text-ink-body">{description}</p> : null}
    </header>
  );
}
