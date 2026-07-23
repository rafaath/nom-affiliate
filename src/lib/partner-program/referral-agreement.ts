import { NOM_COMPANY } from '@/lib/company';

export const REFERRAL_PARTNER_AGREEMENT_VERSION = '2026-07-23-v1' as const;
export const REFERRAL_PARTNER_AGREEMENT_EFFECTIVE_DATE = '23 July 2026';
export const REFERRAL_PARTNER_AGREEMENT_TITLE = 'Nom Referral Partner Agreement';

export const referralPartnerAgreementSections = [
  {
    title: '1. Parties and effective date',
    paragraphs: [
      `This Referral Partner Agreement (“Agreement”) is between ${NOM_COMPANY.legalName}, LLPIN ${NOM_COMPANY.llpin}, with its registered office at ${NOM_COMPANY.registeredOffice} (“Nom”), and the individual or organisation identified in the approved partner account (“Partner”).`,
      'The Agreement becomes effective when an approved Partner accepts the current version through the partner portal. The person accepting for an organisation represents that they have authority to bind it.',
    ],
  },
  {
    title: '2. Appointment and limited scope',
    paragraphs: [
      'Nom appoints Partner on a non-exclusive, revocable basis to identify genuine restaurant opportunities and introduce them to Nom. Partner may perform sales, setup, implementation, support, collection, or reseller work only under a separate written offer or addendum that expressly permits that work.',
      'Partner is an independent contractor. Nothing creates employment, agency, franchise, fiduciary duty, joint venture, or exclusivity. Partner cannot quote binding terms, collect customer money, make warranties for Nom, sign for Nom, or otherwise bind Nom.',
    ],
  },
  {
    title: '3. Qualified leads and permission',
    paragraphs: [
      'A “Lead” is a genuine restaurant business opportunity submitted through the partner portal with accurate and reasonably complete information. The restaurant contact must have agreed to be contacted or have a reasonable business expectation of follow-up.',
      'Scraped, purchased, fabricated, misleading, self-referred, unauthorised, duplicate, existing-customer, existing-pipeline, or incomplete submissions may be rejected. Partner must comply with applicable privacy, marketing, anti-spam, and telecommunications requirements when finding or contacting prospects.',
    ],
  },
  {
    title: '4. Review, acceptance, and attribution',
    paragraphs: [
      'A submission is not accepted merely because it appears in the portal. Nom may verify the information and classify it as accepted, rejected, duplicate, already in pipeline, or needing more information. The portal record is the authoritative operational record of that decision.',
      'The commission rule or written offer attached to the Lead identifies any attribution conditions, protection period, expiry, covered restaurant group, and required Partner involvement. Unless that record says otherwise, a Lead has no protected attribution before Nom accepts it.',
    ],
  },
  {
    title: '5. Commission rules',
    paragraphs: [
      'A “Commission Rule” is the active rule displayed or attached in the portal, or a written offer issued by Nom and accepted by Partner. It defines the commission type, amount or calculation, currency, validation requirements, exclusions, and payout conditions for the applicable opportunity.',
      'A referral, introduction, demo, proposal, sale, setup task, or customer payment does not by itself create an earned commission. A commission is earned only when the portal marks it approved after all applicable conditions are satisfied.',
      'Nom will not retroactively reduce a commission already marked approved, except to correct a manifest error, duplicate payment, fraud, refund, chargeback, reversal, or a written adjustment agreed with Partner.',
    ],
  },
  {
    title: '6. Validation and payment',
    paragraphs: [
      'Validation may require accepted attribution, cleared and retained customer payment, expiry of any refund or validation period, completed setup, restaurant confirmation, accurate payout details, a valid invoice where required, and required tax documentation.',
      'Nom will pay an approved commission according to the payout date or cycle shown in the portal or applicable Commission Rule. If a payment is delayed because required Partner information is missing or inaccurate, the obligation resumes after the information is corrected.',
      'Amounts are stated in the currency shown in the portal. Nom may deduct or withhold taxes required by law and will provide available withholding documentation. GST is payable in addition only where the applicable Commission Rule expressly states that it is exclusive of GST and Partner supplies a valid tax invoice.',
    ],
  },
  {
    title: '7. Refunds, reversals, and overpayments',
    paragraphs: [
      'If an underlying customer payment is refunded, reversed, charged back, fraudulent, or not retained, the related commission may be held, rejected, or reversed as provided by the applicable Commission Rule. Nom may offset a documented overpayment against future commissions after giving Partner the reason and calculation.',
      'Partner may raise a documented dispute through the portal within 60 days after the relevant commission decision. Nom will review the record in good faith and explain the final operational decision.',
    ],
  },
  {
    title: '8. Partner conduct',
    bullets: [
      'Describe Nom, its services, pricing, and eligibility accurately using current approved material.',
      'Do not use spam, harassment, deception, bribery, unlawful discrimination, fake reviews, impersonation, or misleading earnings or product claims.',
      'Do not make commitments about discounts, implementation, support, performance, integrations, or delivery dates without written authority.',
      'Protect portal credentials, confidential information, restaurant data, and Nom materials from unauthorised use.',
      'Promptly disclose conflicts, suspected duplicate submissions, complaints, security incidents, and information that may make a Lead ineligible.',
      'Maintain records reasonably sufficient to support consent, attribution, and claimed work, without collecting disproportionate personal data.',
    ],
  },
  {
    title: '9. Brand and intellectual property',
    paragraphs: [
      'During the Agreement, Nom grants Partner a limited, non-exclusive, non-transferable, revocable licence to use current Nom-approved names, marks, and materials solely to perform authorised referral activity. Partner must follow brand guidance and approval requests and must not register, alter, sublicense, or claim ownership of Nom intellectual property.',
      'Nom retains all rights in its software, services, materials, portal, and marks. Partner retains rights in its pre-existing materials. Feedback may be used by Nom without restriction or payment, provided Nom does not identify Partner publicly without permission.',
    ],
  },
  {
    title: '10. Confidentiality and data protection',
    paragraphs: [
      '“Confidential Information” means non-public commercial, technical, customer, pricing, security, product, and program information disclosed for the relationship. It excludes information Partner can document was already lawfully known, independently developed, publicly available without breach, or lawfully received without confidentiality duty.',
      'Each party will use the other’s Confidential Information only for this relationship, protect it with reasonable care, and disclose it only to personnel or advisers who need it and are bound to protect it. Required legal disclosures are permitted after notice where lawful. On request or termination, Confidential Information must be returned or securely destroyed unless retention is legally required.',
      'Partner is responsible for lawfully collecting and sharing restaurant contact information and for honouring objections before submission. Nom is responsible for its subsequent use as described in the Partner Program Privacy Notice. Confidentiality duties continue for three years after termination, and trade-secret and personal-data duties continue while protected by applicable law.',
    ],
  },
  {
    title: '11. Records, verification, and fraud',
    paragraphs: [
      'Nom may request reasonable evidence supporting a Lead, claimed work, customer permission, invoice, or payout detail. On reasonable notice, Partner will provide relevant records without disclosing unrelated personal or confidential information.',
      'Nom may hold review or payment while investigating credible fraud, sanctions, security, duplicate-attribution, or legal concerns. Nom will limit a hold to what is reasonably necessary and communicate the reason unless prohibited by law or doing so would compromise the investigation.',
    ],
  },
  {
    title: '12. Suspension and termination',
    paragraphs: [
      'Either party may end the Agreement by written notice. Nom may suspend lead submission or terminate immediately for material breach, fraud, unlawful conduct, security risk, misuse of data or brand, repeated low-quality submissions, non-cooperation with a reasonable investigation, or risk to restaurants or Nom.',
      'On termination, Partner must stop representing itself as associated with Nom and stop using Nom materials and marks. Existing portal history remains available as Nom permits. Accepted Leads and approved commissions are handled under the Commission Rule attached to them; unaccepted Leads do not survive termination unless Nom confirms otherwise in writing.',
    ],
  },
  {
    title: '13. Warranties and disclaimers',
    paragraphs: [
      'Each party represents that it has authority to enter this Agreement. Partner additionally represents that its information and supporting records are accurate and that its activities will comply with applicable law and third-party rights.',
      'Except for express obligations in this Agreement, the program, portal, materials, and opportunities are provided as available. Nom does not guarantee approval of any Lead, customer conversion, sales volume, uninterrupted portal access, earnings, or any particular business outcome.',
    ],
  },
  {
    title: '14. Indemnity and liability',
    paragraphs: [
      'Partner will defend and indemnify Nom and its personnel against third-party claims, penalties, and reasonable costs arising from Partner’s unlawful outreach, unauthorised promises, breach of restaurant-contact permission, infringement, fraud, or material breach of this Agreement. Nom will promptly notify Partner and allow reasonable control of the defence, while retaining the right to participate.',
      'Neither party is liable for indirect, incidental, special, exemplary, or consequential loss, or lost profit or opportunity, arising from this Agreement. Except for unpaid approved commissions, fraud, wilful misconduct, confidentiality or data-protection breach, infringement, indemnity obligations, or liability that cannot legally be limited, each party’s aggregate liability is limited to commissions paid or payable to Partner during the 12 months before the event giving rise to the claim.',
    ],
  },
  {
    title: '15. Changes to the program or agreement',
    paragraphs: [
      'Nom may change or pause the program prospectively. Material Agreement changes require a new version and Partner acceptance before further Lead submissions. A change does not reduce an already approved commission except as expressly allowed by this Agreement.',
      'Commission Rules may change for future opportunities. The rule attached to an accepted Lead continues for that Lead unless the rule itself permits a change, the parties agree in writing, or a correction is required for fraud or manifest error.',
    ],
  },
  {
    title: '16. General terms',
    paragraphs: [
      `Operational notices may be sent through the portal or to the account email. Formal legal notices to Nom must also be sent to ${NOM_COMPANY.contactEmail} and ${NOM_COMPANY.registeredOffice}. Partner notices go to the latest contact details in the portal.`,
      'Neither party is responsible for delay caused by events beyond reasonable control, except payment obligations already due. Partner may not assign this Agreement without Nom’s written consent; Nom may assign it with its business or relevant program after notice.',
      'This Agreement, incorporated Commission Rules, the Privacy Notice, and any signed addendum are the entire agreement for the referral relationship. A specific signed addendum controls over this Agreement for its subject; this Agreement controls over general portal copy; and the Commission Rule controls commission economics for its Lead. Invalid provisions are narrowed or severed, and failure to enforce is not a waiver.',
      'The Agreement is governed by the laws of India. The parties will first try in good faith for 30 days to resolve a dispute through written escalation. If unresolved, courts of competent jurisdiction in Bengaluru, Karnataka will have exclusive jurisdiction.',
    ],
  },
] as const;

export function buildReferralPartnerAgreementSnapshot() {
  const header = [
    REFERRAL_PARTNER_AGREEMENT_TITLE,
    `Version: ${REFERRAL_PARTNER_AGREEMENT_VERSION}`,
    `Effective: ${REFERRAL_PARTNER_AGREEMENT_EFFECTIVE_DATE}`,
  ].join('\n');

  const body = referralPartnerAgreementSections
    .map((section) => {
      const paragraphs = 'paragraphs' in section ? section.paragraphs : [];
      const bullets = 'bullets' in section ? section.bullets.map((bullet) => `- ${bullet}`) : [];
      return [section.title, ...paragraphs, ...bullets].join('\n');
    })
    .join('\n\n');

  return `${header}\n\n${body}`;
}

