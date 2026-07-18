export type PartnerResource = {
  title: string;
  category: string;
  description: string;
  content: string;
};

export const defaultPartnerResources: PartnerResource[] = [
  {
    title: 'What Nom Does',
    category: 'Product',
    description: 'Simple explanation partners can use with owners.',
    content:
      'Nom helps restaurants manage POS, inventory, QR menus, ordering, staff workflows, customer data, online ordering, loyalty, and campaigns from one operating system.',
  },
  {
    title: 'WhatsApp Pitch',
    category: 'Sales Script',
    description: 'Warm introduction message for restaurant owners.',
    content:
      "Hi, I’m working with Nom, a restaurant management system for POS, inventory, QR menu, and ordering. I thought it could help your restaurant simplify operations and manage things better. Would you be open to a quick demo?",
  },
  {
    title: 'Restaurant Visit Opening',
    category: 'Sales Script',
    description: 'In-person opener for local visits.',
    content:
      'Hi, I work with Nom. We help restaurants manage billing, inventory, QR menus, and ordering from one system. I wanted to understand how you currently manage these and see if Nom can help.',
  },
  {
    title: 'Objection: We already have a POS',
    category: 'Objection Handling',
    description: 'Use when the restaurant has an existing system.',
    content:
      'That’s good. Many restaurants already have a POS. Nom may still help if you want better inventory, QR menu, ordering, customer data, or a more connected system.',
  },
  {
    title: 'Setup Checklist',
    category: 'Implementation',
    description: 'What must be complete before go-live.',
    content:
      'Confirm business profile, menu, pricing, taxes, POS, QR menu, QR ordering, inventory basics, staff access, owner training, cashier/waiter training, test order, test bill, and final go-live confirmation.',
  },
  {
    title: 'Partner Rules',
    category: 'Trust',
    description: 'Non-negotiable behavior rules.',
    content:
      'Do not lie about pricing, promise unavailable features, claim to be a Nom employee unless approved, collect money personally without authorization, spam restaurants, submit fake leads, or misuse Nom branding.',
  },
];
