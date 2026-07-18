'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertPartnerSchemaReady, toPartnerDatabaseError } from '@/lib/db/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import {
  completeTrainingStep,
  createPartnerLead,
  getPartnerProfileByAuthUser,
  savePendingPartnerApplication,
  savePartnerPayoutMethod,
  upsertPartnerApplication,
} from '@/lib/partner-program/data';
import {
  parsePainPoints,
  parsePartnerType,
  parseProductInterests,
  parseRequestedFeatureCodes,
  partnerApplicationSchema,
  partnerLeadSchema,
  payoutMethodSchema,
} from '@/lib/partner-program/schemas';

function booleanFromForm(value: FormDataEntryValue | null) {
  return value === 'on' || value === 'true' || value === 'yes' || value === '1';
}

function stringListFromForm(formData: FormData, key: string) {
  const direct = formData.getAll(key).map(String).filter(Boolean);
  if (direct.length > 0) return direct;
  const csv = formData.get(`${key}Csv`);
  if (typeof csv !== 'string') return [];
  return csv
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function applicationErrorRedirect(message: string): never {
  redirect(`/apply?error=${encodeURIComponent(message)}`);
}

function logApplicationIssue(message: string, details: Record<string, unknown>) {
  console.error('[partner-application]', message, details);
}

export async function submitApplicationAction(formData: FormData) {
  const submittedEmail = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const supabase = await createSupabaseServerClient();
  let currentUser = await getCurrentUser();
  const email = String(currentUser?.email ?? submittedEmail).trim();

  if (!currentUser && (!email || password.length < 8)) {
    applicationErrorRedirect('Enter an email and a password with at least 8 characters.');
  }

  const parsed = partnerApplicationSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    email,
    city: formData.get('city'),
    localityAreas: stringListFromForm(formData, 'localityAreas'),
    partnerType: parsePartnerType(formData.get('partnerType')),
    restaurantExperience: formData.get('restaurantExperience'),
    restaurantNetworkSize: formData.get('restaurantNetworkSize'),
    canVisitRestaurants: booleanFromForm(formData.get('canVisitRestaurants')),
    canHelpSetup: booleanFromForm(formData.get('canHelpSetup')),
    applicantKind: formData.get('applicantKind'),
    businessName: String(formData.get('businessName') || '').trim() || undefined,
    background: formData.get('background'),
    preferredLanguage: formData.get('preferredLanguage'),
    heardFrom: formData.get('heardFrom'),
  });

  if (!parsed.success) {
    applicationErrorRedirect(parsed.error.issues[0]?.message || 'Invalid application');
  }

  try {
    await assertPartnerSchemaReady();
  } catch (error) {
    const databaseError = toPartnerDatabaseError(error);
    logApplicationIssue('Partner schema readiness check failed', {
      email,
      message: databaseError instanceof Error ? databaseError.message : String(databaseError),
    });
    applicationErrorRedirect(databaseError instanceof Error ? databaseError.message : String(databaseError));
  }

  if (!currentUser) {
    await savePendingPartnerApplication(parsed.data);

    const fullName = String(formData.get('fullName') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3021'}/auth/callback`,
        data: {
          full_name: fullName,
          phone,
          source: 'nom_partner_program',
        },
      },
    });

    if (error) {
      logApplicationIssue('Supabase Auth signup failed', {
        email,
        message: error.message,
        name: error.name,
        status: 'status' in error ? error.status : undefined,
        code: 'code' in error ? error.code : undefined,
      });
      applicationErrorRedirect(error.message);
    }

    if (!data.user) {
      logApplicationIssue('Supabase Auth signup returned no user and no error', {
        email,
        hasSession: Boolean(data.session),
      });
      applicationErrorRedirect(
        'Confirmation email sent. Confirm your email, log in, and your partner application will be linked automatically.'
      );
    }

    if (data.user.identities?.length === 0) {
      logApplicationIssue('Supabase Auth signup reported an existing email identity', {
        email,
        authUserId: data.user.id,
      });
      applicationErrorRedirect('Application saved. An account already exists for this email, so log in and it will be linked automatically.');
    }

    currentUser = { id: data.user.id, email: data.user.email ?? email };
  }

  try {
    await upsertPartnerApplication(currentUser.id, parsed.data);
  } catch (error) {
    logApplicationIssue('Application database save failed', {
      email,
      authUserId: currentUser.id,
      message: error instanceof Error ? error.message : String(error),
    });
    applicationErrorRedirect(
      'Your account was created, but the application could not be saved. Make sure the partner database migration is applied, then log in and submit again.'
    );
  }

  revalidatePath('/partner');
  redirect('/partner?applied=1');
}

export async function submitLeadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner/leads');

  const parsed = partnerLeadSchema.safeParse({
    restaurantName: formData.get('restaurantName'),
    legalBusinessName: formData.get('legalBusinessName'),
    ownerName: formData.get('ownerName'),
    phone: formData.get('phone'),
    email: String(formData.get('email') || '').trim(),
    city: formData.get('city'),
    locality: formData.get('locality'),
    branchAddress: formData.get('branchAddress'),
    state: formData.get('state'),
    country: String(formData.get('country') || 'India').trim(),
    postalCode: String(formData.get('postalCode') || '').trim(),
    timezone: String(formData.get('timezone') || 'Asia/Kolkata').trim(),
    gstRegistrationType: String(formData.get('gstRegistrationType') || '').trim(),
    restaurantType: formData.get('restaurantType'),
    outletCount: formData.get('outletCount'),
    requestedPlanId: formData.get('requestedPlanId'),
    requestedFeatureCodes: parseRequestedFeatureCodes(formData.getAll('requestedFeatureCodes')),
    requestedBranchCount: formData.get('requestedBranchCount'),
    affiliateReportedPlatformLinkKind: String(formData.get('affiliateReportedPlatformLinkKind') || '').trim() || undefined,
    affiliateReportedExistingCustomerNotes: String(formData.get('affiliateReportedExistingCustomerNotes') || '').trim(),
    currentSystem: String(formData.get('currentSystem') || '').trim(),
    productsInterested: parseProductInterests(formData.get('productsInterestedCsv')),
    painPoints: parsePainPoints(formData.get('painPointsCsv')),
    relationshipContext: formData.get('relationshipContext'),
    consentToContact: booleanFromForm(formData.get('consentToContact')),
    preferredContactTime: String(formData.get('preferredContactTime') || '').trim(),
    notes: String(formData.get('notes') || '').trim(),
  });

  if (!parsed.success) {
    redirect(`/partner/leads?error=${encodeURIComponent(parsed.error.issues[0]?.message || 'Invalid lead')}`);
  }

  await createPartnerLead(user.id, {
    restaurant_name: parsed.data.restaurantName,
    legal_business_name: parsed.data.legalBusinessName,
    owner_name: parsed.data.ownerName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    city: parsed.data.city,
    locality: parsed.data.locality,
    branch_address: parsed.data.branchAddress,
    state: parsed.data.state,
    country: parsed.data.country,
    postal_code: parsed.data.postalCode || null,
    timezone: parsed.data.timezone,
    gst_registration_type: parsed.data.gstRegistrationType || null,
    restaurant_type: parsed.data.restaurantType,
    outlet_count: parsed.data.outletCount,
    requested_plan_id: parsed.data.requestedPlanId,
    requested_feature_codes: parsed.data.requestedFeatureCodes,
    requested_branch_count: parsed.data.requestedBranchCount,
    affiliate_reported_platform_link_kind: parsed.data.affiliateReportedPlatformLinkKind || null,
    affiliate_reported_existing_customer_notes: parsed.data.affiliateReportedExistingCustomerNotes || null,
    current_system: parsed.data.currentSystem || null,
    products_interested: parsed.data.productsInterested,
    pain_points: parsed.data.painPoints,
    relationship_context: parsed.data.relationshipContext,
    consent_to_contact: parsed.data.consentToContact,
    preferred_contact_time: parsed.data.preferredContactTime || null,
    notes: parsed.data.notes || null,
  });

  revalidatePath('/partner');
  revalidatePath('/partner/leads');
  redirect('/partner/leads?submitted=1');
}

export async function savePayoutMethodAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner/payouts');

  const parsed = payoutMethodSchema.safeParse({
    payoutName: formData.get('payoutName'),
    payoutType: formData.get('payoutType'),
    upiId: String(formData.get('upiId') || '').trim(),
    bankName: String(formData.get('bankName') || '').trim(),
    bankAccountLast4: String(formData.get('bankAccountLast4') || '').trim() || undefined,
    bankAccountReference: String(formData.get('bankAccountReference') || '').trim(),
    taxId: String(formData.get('taxId') || '').trim(),
    gstNumber: String(formData.get('gstNumber') || '').trim(),
  });

  if (!parsed.success) {
    redirect(`/partner/payouts?error=${encodeURIComponent(parsed.error.issues[0]?.message || 'Invalid payout method')}`);
  }

  const profile = await getPartnerProfileByAuthUser(user.id);
  if (!profile) redirect('/apply?error=profile-required');

  await savePartnerPayoutMethod(user.id, parsed.data);

  revalidatePath('/partner/payouts');
  redirect('/partner/payouts?saved=1');
}

export async function completeTrainingStepAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect('/login?returnTo=/partner');

  const moduleKey = String(formData.get('moduleKey') || '').trim();
  if (!moduleKey) redirect('/partner?error=missing-module');

  const profile = await getPartnerProfileByAuthUser(user.id);
  if (!profile) redirect('/apply?error=profile-required');

  await completeTrainingStep(user.id, moduleKey);
  revalidatePath('/partner');
  redirect('/partner?training=updated');
}
