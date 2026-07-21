'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePartnerAdmin } from '@/lib/supabase/auth';
import {
  createPayoutBatch,
  resolveDispute,
  reviewApplication,
  reviewCommission,
  reviewLead,
  reviewSetup,
  updateDealStage,
} from '@/lib/partner-program/admin-data';
import {
  APPLICATION_STATUSES,
  COMMISSION_STATUSES,
  DEAL_STAGES,
  DISPUTE_STATUSES,
  LEAD_STATUSES,
  PLATFORM_LINK_KINDS,
  SETUP_STATUSES,
} from '@/lib/partner-program/types';
import { z } from 'zod';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected database error';
}

function formText(formData: FormData, key: string) {
  const value = String(formData.get(key) || '').trim();
  return value.length > 0 ? value : null;
}

function formTextList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .flatMap((value) => String(value || '').split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

function formPositiveInteger(formData: FormData, key: string) {
  const raw = String(formData.get(key) || '').trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : undefined;
}

function formNonNegativeInteger(formData: FormData, key: string) {
  const raw = String(formData.get(key) || '').trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.trunc(value) : undefined;
}

function formEnum<const T extends readonly [string, ...string[]]>(
  formData: FormData,
  key: string,
  values: T
) {
  return z.enum(values).safeParse(formData.get(key));
}

export async function reviewApplicationAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const applicationId = String(formData.get('applicationId') || '');
  const partnerId = String(formData.get('partnerId') || '');
  const status = formEnum(formData, 'status', APPLICATION_STATUSES);
  const note = String(formData.get('note') || '').trim();

  if (!applicationId || !partnerId || !status.success) redirect('/admin/partners?error=invalid-review-fields');

  try {
    await reviewApplication({ actorAuthUserId: user.id, applicationId, partnerId, status: status.data, note });
  } catch (error) {
    redirect(`/admin/partners?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/partners');
  redirect('/admin/partners?reviewed=1');
}

export async function reviewLeadAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const leadId = String(formData.get('leadId') || '');
  const partnerId = String(formData.get('partnerId') || '');
  const status = formEnum(formData, 'status', LEAD_STATUSES);
  const note = String(formData.get('note') || '').trim();
  const platformLinkKind = formEnum(formData, 'platformLinkKind', PLATFORM_LINK_KINDS);
  const existingFranchiseId = formText(formData, 'existingFranchiseId');
  const existingBranchId = formText(formData, 'existingBranchId');
  const requestedPlanId = formText(formData, 'requestedPlanId');
  const requestedFeatureCodes = formTextList(formData, 'requestedFeatureCodes');
  const requestedBranchCount = formPositiveInteger(formData, 'requestedBranchCount');
  const ownerEmail = formText(formData, 'ownerEmail');

  if (!leadId || !partnerId || !status.success) redirect('/admin/leads?error=invalid-lead-review-fields');

  try {
    await reviewLead({
      actorAuthUserId: user.id,
      leadId,
      partnerId,
      status: status.data,
      note,
      platformLinkKind: platformLinkKind.success ? platformLinkKind.data : undefined,
      existingFranchiseId,
      existingBranchId,
      requestedPlanId,
      requestedFeatureCodes,
      requestedBranchCount,
      ownerEmail,
    });
  } catch (error) {
    redirect(`/admin/leads?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/leads');
  redirect('/admin/leads?reviewed=1');
}

export async function updateDealStageAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const dealId = String(formData.get('dealId') || '');
  const stage = formEnum(formData, 'stage', DEAL_STAGES);
  const note = String(formData.get('note') || '').trim();
  const expectedCommissionCents = formNonNegativeInteger(formData, 'expectedCommissionCents');
  const requestedPlanId = formText(formData, 'requestedPlanId');
  const requestedFeatureCodes = formTextList(formData, 'requestedFeatureCodes');
  const requestedBranchCount = formPositiveInteger(formData, 'requestedBranchCount');

  if (!dealId || !stage.success) redirect('/admin/deals?error=invalid-deal-fields');

  try {
    await updateDealStage({
      actorAuthUserId: user.id,
      dealId,
      stage: stage.data,
      note,
      expectedCommissionCents,
      requestedPlanId,
      requestedFeatureCodes,
      requestedBranchCount,
    });
  } catch (error) {
    redirect(`/admin/deals?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin');
  revalidatePath('/admin/deals');
  redirect('/admin/deals?updated=1');
}

export async function reviewSetupAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const checklistId = String(formData.get('checklistId') || '');
  const status = formEnum(formData, 'status', SETUP_STATUSES);
  const note = String(formData.get('note') || '').trim();

  if (!checklistId || !status.success) redirect('/admin/setup?error=invalid-setup-fields');

  try {
    await reviewSetup({ actorAuthUserId: user.id, checklistId, status: status.data, note });
  } catch (error) {
    redirect(`/admin/setup?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin/setup');
  redirect('/admin/setup?reviewed=1');
}

export async function reviewCommissionAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const commissionId = String(formData.get('commissionId') || '');
  const status = formEnum(formData, 'status', COMMISSION_STATUSES);
  const amountCents = formNonNegativeInteger(formData, 'amountCents');
  const note = String(formData.get('note') || '').trim();

  if (!commissionId || !status.success) redirect('/admin/commissions?error=invalid-commission-fields');

  try {
    await reviewCommission({ actorAuthUserId: user.id, commissionId, status: status.data, amountCents, note });
  } catch (error) {
    redirect(`/admin/commissions?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin/commissions');
  redirect('/admin/commissions?reviewed=1');
}

export async function createPayoutBatchAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const label = String(formData.get('label') || `Partner payout ${new Date().toISOString().slice(0, 10)}`);

  try {
    await createPayoutBatch({ actorAuthUserId: user.id, label });
  } catch (error) {
    redirect(`/admin/payouts?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin/payouts');
  redirect('/admin/payouts?batch=created');
}

export async function resolveDisputeAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const disputeId = String(formData.get('disputeId') || '');
  const status = formEnum(formData, 'status', DISPUTE_STATUSES);
  const decision = String(formData.get('decision') || '').trim();

  if (!disputeId || !status.success || !decision) redirect('/admin/disputes?error=invalid-dispute-fields');

  try {
    await resolveDispute({ actorAuthUserId: user.id, disputeId, status: status.data, decision });
  } catch (error) {
    redirect(`/admin/disputes?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin/disputes');
  redirect('/admin/disputes?resolved=1');
}
