import Image from 'next/image';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { getCurrentUser, type CurrentUser } from '@/lib/supabase/auth';

export async function MarketingHeader({ currentUser: providedUser }: { currentUser?: CurrentUser | null } = {}) {
  const currentUser = providedUser === undefined ? await getCurrentUser() : providedUser;

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-[70] border-b border-white/10 bg-plum text-paper">
        <div className="marketing-container flex h-[4.75rem] items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3 font-display text-xl font-bold tracking-tight">
            <Image className="size-10 shrink-0" src="/nomnom-mark.svg" alt="" width={40} height={40} priority />
            <span className="hidden sm:inline">Nom Partner Program</span>
            <span className="sm:hidden">Nom Partners</span>
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-6 text-sm font-bold text-paper/70 lg:flex">
            <Link className="hover:text-white" href="/#who">Who it’s for</Link>
            <Link className="hover:text-white" href="/#workflow">How it works</Link>
            <Link className="hover:text-white" href="/#earn">Ways to earn</Link>
            <Link className="hover:text-white" href="/#faq">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <Button
                  aria-label="Open partner portal"
                  className="rounded-full border-paper/35 text-paper hover:bg-white/10 hover:text-white"
                  size="icon"
                  title="Open partner portal"
                  variant="outline"
                  asChild
                >
                  <Link href="/partner"><UserRound className="size-5" aria-hidden="true" /></Link>
                </Button>
                <form action={signOutAction}>
                  <Button className="border-paper/35 text-paper hover:bg-white/10 hover:text-white" type="submit" variant="outline">
                    Sign out
                  </Button>
                </form>
              </>
            ) : (
              <>
                <Button className="border-paper/35 text-paper hover:bg-white/10 hover:text-white" variant="outline" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button className="hidden bg-lime text-plum hover:bg-gold sm:inline-flex" asChild>
                  <Link href="/apply">Apply</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <div aria-hidden="true" className="h-[4.75rem]" />
    </>
  );
}
