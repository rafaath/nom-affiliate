import { z } from 'zod';
import {
  PAIN_POINTS,
  PARTNER_TYPES,
  PRODUCT_INTERESTS,
  type PainPoint,
  type PartnerType,
  type ProductInterest,
} from './types';
import { PARTNER_PROGRAM_TERMS_VERSION } from './terms';

const requiredText = z.string().trim().min(1, 'Required');

function optionalProfileUrl(hostnames: readonly string[], message: string, allowSubdomains = false) {
  return z
    .string()
    .trim()
    .url(message)
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && hostnames.some((hostname) =>
          url.hostname === hostname || (allowSubdomains && url.hostname.endsWith(`.${hostname}`))
        );
      } catch {
        return false;
      }
    }, message)
    .optional();
}

export const partnerApplicationSchema = z.object({
  fullName: requiredText.max(120),
  phone: requiredText.max(40),
  email: z.string().trim().email(),
  city: requiredText.max(80),
  localityAreas: z.array(z.string().trim().min(1)).min(1),
  partnerType: z.enum(PARTNER_TYPES),
  restaurantExperience: requiredText.max(1200),
  restaurantNetworkSize: z.coerce.number().int().min(0).max(100_000),
  canVisitRestaurants: z.coerce.boolean(),
  canHelpSetup: z.coerce.boolean(),
  applicantKind: z.enum(['individual', 'company']),
  businessName: z.string().trim().max(160).optional(),
  linkedinProfileUrl: optionalProfileUrl(['linkedin.com'], 'Enter a valid LinkedIn profile URL.', true),
  resumeDriveUrl: optionalProfileUrl(['drive.google.com', 'docs.google.com'], 'Enter a valid Google Drive or Google Docs URL.'),
  background: requiredText.max(1200),
  preferredLanguage: requiredText.max(80),
  heardFrom: requiredText.max(160),
  programTermsVersion: z.literal(PARTNER_PROGRAM_TERMS_VERSION, {
    error: 'Refresh this page and accept the current partner program terms.',
  }),
  programTermsAccepted: z.coerce.boolean().refine(Boolean, 'Accept the partner program terms to continue.'),
});

export const partnerLeadSchema = z.object({
  restaurantName: requiredText.max(160),
  legalBusinessName: z.string().trim().max(200).optional(),
  ownerName: requiredText.max(120),
  phone: requiredText.max(40),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  city: requiredText.max(80),
  locality: requiredText.max(120),
  branchAddress: z.string().trim().max(240).optional(),
  state: z.string().trim().max(120).optional(),
  country: requiredText.max(120).default('India'),
  postalCode: z.string().trim().max(40).optional(),
  timezone: requiredText.max(80).default('Asia/Kolkata'),
  gstRegistrationType: z.string().trim().max(80).optional(),
  restaurantType: z.string().trim().max(80).optional(),
  outletCount: z.coerce.number().int().min(1).max(500).default(1),
  requestedPlanId: z.string().trim().uuid('Select a valid RMS subscription plan.').optional(),
  requestedFeatureCodes: z.array(z.string().trim().min(1)).default([]),
  requestedBranchCount: z.coerce.number().int().min(1).max(500).default(1),
  affiliateReportedPlatformLinkKind: z
    .enum(['new_restaurant', 'existing_franchise', 'existing_branch', 'existing_customer_addon'])
    .optional(),
  affiliateReportedExistingCustomerNotes: z.string().trim().max(1000).optional(),
  currentSystem: z.string().trim().max(160).optional(),
  productsInterested: z.array(z.enum(PRODUCT_INTERESTS)).default([]),
  painPoints: z.array(z.enum(PAIN_POINTS)).default([]),
  relationshipContext: requiredText.max(120),
  consentToContact: z.coerce.boolean().refine(Boolean, 'Restaurant must agree to be contacted.'),
  preferredContactTime: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const payoutMethodSchema = z.object({
  payoutName: requiredText.max(160),
  payoutType: z.enum(['upi', 'bank_reference']),
  upiId: z.string().trim().max(120).optional(),
  bankName: z.string().trim().max(120).optional(),
  bankAccountLast4: z.string().trim().regex(/^\d{4}$/).optional(),
  bankAccountReference: z.string().trim().max(160).optional(),
  taxId: z.string().trim().max(80).optional(),
  gstNumber: z.string().trim().max(80).optional(),
});

export function parseCsvList(value: FormDataEntryValue | null) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parsePartnerType(value: FormDataEntryValue | null): PartnerType {
  const parsed = z.enum(PARTNER_TYPES).safeParse(value);
  return parsed.success ? parsed.data : 'unsure';
}

export function parseProductInterests(value: FormDataEntryValue | null): ProductInterest[] {
  return parseCsvList(value).filter((item): item is ProductInterest =>
    PRODUCT_INTERESTS.includes(item as ProductInterest)
  );
}

export function parsePainPoints(value: FormDataEntryValue | null): PainPoint[] {
  return parseCsvList(value).filter((item): item is PainPoint => PAIN_POINTS.includes(item as PainPoint));
}

export function parseRequestedFeatureCodes(values: FormDataEntryValue[]) {
  return [
    ...new Set(
      values
        .flatMap((value) => String(value || '').split(','))
        .map((value) => value.trim())
        .filter(Boolean)
    ),
  ];
}
