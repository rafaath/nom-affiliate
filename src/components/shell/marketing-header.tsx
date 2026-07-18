import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            N
          </span>
          Nom Partner Program
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          <Link href="/#earn">How you earn</Link>
          <Link href="/#workflow">Workflow</Link>
          <Link href="/#trust">Trust</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/apply">Apply</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
