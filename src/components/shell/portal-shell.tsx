import Link from 'next/link';
import { ReactNode } from 'react';
import { signOutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
};

export function PortalShell({
  title,
  eyebrow,
  navItems,
  children,
  variant = 'partner',
}: {
  title: string;
  eyebrow: string;
  navItems: NavItem[];
  children: ReactNode;
  variant?: 'partner' | 'admin';
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r bg-card p-5 lg:block">
        <Link href={variant === 'admin' ? '/admin' : '/partner'} className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            N
          </span>
          <span>
            <span className="block text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</span>
            <span className="font-bold">{title}</span>
          </span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href as never}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={signOutAction} className="absolute bottom-5 left-5 right-5">
          <Button type="submit" variant="outline" className="w-full">
            Sign out
          </Button>
        </form>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b bg-background/90 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
              <h1 className="text-xl font-bold">{title}</h1>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <Button key={item.href} variant="secondary" size="sm" asChild>
                <Link href={item.href as never}>{item.label}</Link>
              </Button>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
