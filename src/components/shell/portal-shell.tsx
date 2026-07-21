'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  BadgeIndianRupee,
  Bell,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardCheck,
  FileQuestion,
  HandCoins,
  House,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  ReceiptText,
  Settings2,
  UserRoundCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { signOutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string };

const iconByHref = {
  '/partner': House,
  '/partner/leads': UsersRound,
  '/partner/deals': BriefcaseBusiness,
  '/partner/setup': ClipboardCheck,
  '/partner/commissions': CircleDollarSign,
  '/partner/payouts': HandCoins,
  '/partner/resources': Library,
  '/partner/notifications': Bell,
  '/admin': LayoutDashboard,
  '/admin/partners': UserRoundCheck,
  '/admin/leads': UsersRound,
  '/admin/deals': BriefcaseBusiness,
  '/admin/onboarding': Settings2,
  '/admin/setup': ClipboardCheck,
  '/admin/commissions': BadgeIndianRupee,
  '/admin/payouts': ReceiptText,
  '/admin/disputes': FileQuestion,
} as const;

function isActiveRoute(pathname: string, href: string) {
  if (href === '/partner' || href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function PortalNavigation({ navItems, pathname }: { navItems: NavItem[]; pathname: string }) {
  return (
    <nav aria-label="Portal navigation" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = iconByHref[item.href as keyof typeof iconByHref] ?? LayoutDashboard;
        const active = isActiveRoute(pathname, item.href);
        return (
          <Link
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-bold text-paper/70 transition-colors hover:bg-white/10 hover:text-white',
              active && 'bg-lilac text-plum hover:bg-lilac hover:text-plum'
            )}
            href={item.href as never}
            key={item.href}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ eyebrow, title, homeHref }: { eyebrow: string; title: string; homeHref: string }) {
  return (
    <Link href={homeHref as never} className="flex min-w-0 items-center gap-3 text-white">
      <Image className="size-10 shrink-0" src="/nomnom-mark.svg" alt="" width={40} height={40} />
      <span className="min-w-0">
        <span className="block truncate font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-paper/60">{eyebrow}</span>
        <span className="block truncate font-display text-xl font-bold leading-none">{title}</span>
      </span>
    </Link>
  );
}

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
  const pathname = usePathname();
  const homeHref = variant === 'admin' ? '/admin' : '/partner';

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-72 flex-col bg-plum p-5 lg:flex">
        <Brand eyebrow={eyebrow} title={title} homeHref={homeHref} />
        <div className="mt-9 min-h-0 flex-1 overflow-y-auto">
          <PortalNavigation navItems={navItems} pathname={pathname} />
        </div>
      </aside>

      <div className="lg:ps-72">
        <header className="sticky top-0 z-20 border-b border-plum/10 bg-paper/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <Button aria-label="Open portal navigation" size="icon" variant="outline" className="shrink-0 lg:hidden">
                    <Menu className="size-5" />
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 z-40 bg-plum/60 data-[state=closed]:animate-out data-[state=open]:animate-in" />
                  <Dialog.Content className="fixed inset-y-0 start-0 z-50 w-[min(22rem,88vw)] bg-plum p-5 text-white shadow-2xl focus:outline-none">
                    <Dialog.Title className="sr-only">Portal navigation</Dialog.Title>
                    <Dialog.Description className="sr-only">Navigate between portal sections.</Dialog.Description>
                    <div className="flex items-start justify-between gap-3">
                      <Brand eyebrow={eyebrow} title={title} homeHref={homeHref} />
                      <Dialog.Close asChild>
                        <Button aria-label="Close portal navigation" size="icon" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                          <X className="size-5" />
                        </Button>
                      </Dialog.Close>
                    </div>
                    <div className="mt-9 overflow-y-auto">
                      <PortalNavigation navItems={navItems} pathname={pathname} />
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              <div className="min-w-0 lg:hidden">
                <p className="truncate font-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
                <p className="truncate font-display text-xl font-bold leading-none">{title}</p>
              </div>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                <LogOut className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-[90rem] overflow-hidden px-4 py-7 sm:px-6 sm:py-9">{children}</main>
      </div>
    </div>
  );
}
