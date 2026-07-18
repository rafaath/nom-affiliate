import { PortalShell } from '@/components/shell/portal-shell';

const adminNav = [
  { href: '/admin', label: 'Metrics' },
  { href: '/admin/partners', label: 'Partners' },
  { href: '/admin/leads', label: 'Leads' },
  { href: '/admin/deals', label: 'Deals' },
  { href: '/admin/onboarding', label: 'Onboarding' },
  { href: '/admin/setup', label: 'Setup' },
  { href: '/admin/commissions', label: 'Commissions' },
  { href: '/admin/payouts', label: 'Payouts' },
  { href: '/admin/disputes', label: 'Disputes' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell title="Partner Admin" eyebrow="Nom Internal" navItems={adminNav} variant="admin">
      {children}
    </PortalShell>
  );
}
