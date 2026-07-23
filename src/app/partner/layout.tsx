import { PortalShell } from '@/components/shell/portal-shell';

const partnerNav = [
  { href: '/partner', label: 'Dashboard' },
  { href: '/partner/agreement', label: 'Agreement' },
  { href: '/partner/leads', label: 'Leads' },
  { href: '/partner/deals', label: 'Deals' },
  { href: '/partner/setup', label: 'Setup' },
  { href: '/partner/commissions', label: 'Commissions' },
  { href: '/partner/payouts', label: 'Payouts' },
  { href: '/partner/resources', label: 'Resources' },
  { href: '/partner/notifications', label: 'Notifications' },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell title="Partner Portal" eyebrow="Nom Growth" navItems={partnerNav}>
      {children}
    </PortalShell>
  );
}
