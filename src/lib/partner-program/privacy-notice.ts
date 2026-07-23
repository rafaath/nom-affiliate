import { NOM_COMPANY } from '@/lib/company';

export const PARTNER_PRIVACY_NOTICE_VERSION = '2026-07-23-v1' as const;
export const PARTNER_PRIVACY_NOTICE_EFFECTIVE_DATE = '23 July 2026';

export const partnerPrivacyNoticeSections = [
  {
    title: 'Who is responsible',
    paragraphs: [
      `${NOM_COMPANY.legalName} (“Nom”, “we”, “us”) is responsible for personal information handled through the Nom Partner Program.`,
      `Privacy questions, correction or deletion requests, consent withdrawals, and grievances can be sent to the Privacy and Grievance Officer at ${NOM_COMPANY.contactEmail}.`,
    ],
  },
  {
    title: 'Information we collect',
    bullets: [
      'Application and profile information, including name, email, phone, city, work background, preferred language, partner interests, business details, LinkedIn URL, and an optional resume link.',
      'Account and security information, including account identifiers, email-verification state, sign-in records, and security logs.',
      'Program activity, including approval status, training, referral codes, restaurant leads, deal activity, setup work, communications, disputes, and support requests.',
      'Commission, payout, tax, and invoice information needed to review and pay eligible commissions.',
      'Restaurant contact information supplied with a lead, including the contact’s name, business details, phone, email, and the partner’s relationship context.',
      'Technical information generated when the site is used, such as timestamps, pages requested, browser or device information, and network or security logs.',
    ],
  },
  {
    title: 'Why we use it',
    bullets: [
      'To verify accounts, review applications, approve and administer partners, and provide the portal.',
      'To review referrals, detect duplicates or fraud, manage restaurant follow-up, validate commissions, and process payouts.',
      'To communicate about applications, program operations, security, support, legal changes, and records.',
      'To maintain accurate business, tax, security, compliance, and dispute records and to protect Nom, restaurants, and partners.',
      'To improve the reliability and usability of the partner program using aggregated or appropriately protected information.',
    ],
  },
  {
    title: 'Restaurant contacts',
    paragraphs: [
      'Partners must submit only genuine business contacts who have agreed to be contacted or have a reasonable business expectation of follow-up. Partners must not upload scraped, purchased, fabricated, or unlawfully obtained contact lists.',
      'Nom uses restaurant contact information to check existing relationships, assess the opportunity, contact the restaurant, provide requested information, and maintain sales and compliance records.',
    ],
  },
  {
    title: 'Who receives information',
    paragraphs: [
      'We disclose information only as reasonably needed to operate the program: to hosting, authentication, database, email, communications, analytics, security, payment, accounting, tax, and professional-adviser providers; to authorised Nom personnel; to restaurants where a partner introduction requires it; or where disclosure is required by law.',
      'Supabase provides account authentication and parts of the application data infrastructure. Other providers may process information on Nom’s instructions under appropriate contractual and security controls. Nom does not sell partner or restaurant contact information.',
    ],
  },
  {
    title: 'Location and transfers',
    paragraphs: [
      'Nom and its providers may process information in India and other countries where infrastructure or support teams operate. Where information is processed outside India, Nom will use reasonable contractual, organisational, and technical safeguards and comply with applicable transfer restrictions.',
    ],
  },
  {
    title: 'Retention',
    bullets: [
      'Unconfirmed applications: normally deleted or de-identified within 30 days after the confirmation period ends.',
      'Declined, withdrawn, or incomplete applications: normally retained for up to 24 months to manage reapplications, disputes, and fraud prevention.',
      'Approved partner, lead, commission, payout, tax, and agreement records: retained during the relationship and normally for seven years afterwards where needed for contracts, tax, accounting, fraud prevention, or legal claims.',
      'Optional resume links and review material: normally removed within 12 months after the application decision unless needed for an active relationship or legal matter.',
      'Security logs and backups: kept for the provider’s normal security and backup cycles, then deleted or overwritten.',
    ],
  },
  {
    title: 'Your choices and rights',
    paragraphs: [
      `You may ask Nom to describe the information held about you, correct inaccurate information, delete information that is no longer required, or withdraw consent where processing depends on consent. Email ${NOM_COMPANY.contactEmail} from your registered address where possible.`,
      'Some information may need to be retained for account security, contractual performance, tax, fraud prevention, disputes, or other legal obligations. Withdrawing from promotional messages does not stop essential application, security, contractual, or payout communications.',
    ],
  },
  {
    title: 'Security and incidents',
    paragraphs: [
      'Nom uses access controls, server-side write boundaries, encrypted network connections, account authentication, logging, and provider security controls designed to protect program information. No online system is completely secure.',
      `If you believe partner-program information or an account has been compromised, contact ${NOM_COMPANY.contactEmail} promptly. Nom will investigate and provide notices required by applicable law.`,
    ],
  },
  {
    title: 'Changes',
    paragraphs: [
      'Nom may update this notice when the program, providers, or law changes. The current version and effective date will remain available on this page, and material changes will be communicated where required.',
    ],
  },
] as const;

