import { z } from 'zod';
import {
  PAIN_POINTS,
  PARTNER_TYPES,
  PRODUCT_INTERESTS,
  type PainPoint,
  type PartnerType,
  type ProductInterest,
} from './types';

const requiredText = z.string().trim().min(1, 'Required');

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
  background: requiredText.max(1200),
  preferredLanguage: requiredText.max(80),
  heardFrom: requiredText.max(160),
});

export const partnerLeadSchema = z.object({
  restaurantName: requiredText.max(160),
  legalBusinessName: requiredText.max(200),
  ownerName: requiredText.max(120),
  phone: requiredText.max(40),
  email: z.string().trim().email(),
  city: requiredText.max(80),
  locality: requiredText.max(120),
  branchAddress: requiredText.max(240),
  state: requiredText.max(120),
  country: requiredText.max(120).default('India'),
  postalCode: z.string().trim().max(40).optional(),
  timezone: requiredText.max(80).default('Asia/Kolkata'),
  gstRegistrationType: z.string().trim().max(80).optional(),
  restaurantType: requiredText.max(80),
  outletCount: z.coerce.number().int().min(1).max(500),
  requestedPlanId: z.string().trim().uuid('Select a valid RMS subscription plan.'),
  requestedFeatureCodes: z.array(z.string().trim().min(1)).min(1, 'Select at least one RMS capability.'),
  requestedBranchCount: z.coerce.number().int().min(1).max(500),
  affiliateReportedPlatformLinkKind: z
    .enum(['new_restaurant', 'existing_franchise', 'existing_branch', 'existing_customer_addon'])
    .optional(),
  affiliateReportedExistingCustomerNotes: z.string().trim().max(1000).optional(),
  currentSystem: z.string().trim().max(160).optional(),
  productsInterested: z.array(z.enum(PRODUCT_INTERESTS)).min(1),
  painPoints: z.array(z.enum(PAIN_POINTS)).min(1),
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
