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

export async function reviewApplicationAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const applicationId = String(formData.get('applicationId') || '');
  const partnerId = String(formData.get('partnerId') || '');
  const status = String(formData.get('status') || '');
  const note = String(formData.get('note') || '').trim();

  if (!applicationId || !partnerId || !status) redirect('/admin/partners?error=missing-review-fields');

  try {
    await reviewApplication({ actorAuthUserId: user.id, applicationId, partnerId, status, note });
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
  const status = String(formData.get('status') || '');
  const note = String(formData.get('note') || '').trim();
  const platformLinkKind = formText(formData, 'platformLinkKind') as any;
  const existingFranchiseId = formText(formData, 'existingFranchiseId');
  const existingBranchId = formText(formData, 'existingBranchId');
  const requestedPlanId = formText(formData, 'requestedPlanId');
  const requestedFeatureCodes = formTextList(formData, 'requestedFeatureCodes');
  const requestedBranchCount = formPositiveInteger(formData, 'requestedBranchCount');

  if (!leadId || !partnerId || !status) redirect('/admin/leads?error=missing-lead-review-fields');

  try {
    await reviewLead({
      actorAuthUserId: user.id,
      leadId,
      partnerId,
      status,
      note,
      platformLinkKind,
      existingFranchiseId,
      existingBranchId,
      requestedPlanId,
      requestedFeatureCodes,
      requestedBranchCount,
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
  const stage = String(formData.get('stage') || '');
  const note = String(formData.get('note') || '').trim();
  const expectedCommissionCents = Number(formData.get('expectedCommissionCents') || 0);
  const requestedPlanId = formText(formData, 'requestedPlanId');
  const requestedFeatureCodes = formTextList(formData, 'requestedFeatureCodes');
  const requestedBranchCount = formPositiveInteger(formData, 'requestedBranchCount');

  if (!dealId || !stage) redirect('/admin/deals?error=missing-deal-fields');

  try {
    await updateDealStage({
      actorAuthUserId: user.id,
      dealId,
      stage,
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
  const status = String(formData.get('status') || '');
  const note = String(formData.get('note') || '').trim();

  if (!checklistId || !status) redirect('/admin/setup?error=missing-setup-fields');

  try {
    await reviewSetup({ actorAuthUserId: user.id, checklistId, status, note });
  } catch (error) {
    redirect(`/admin/setup?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin/setup');
  redirect('/admin/setup?reviewed=1');
}

export async function reviewCommissionAction(formData: FormData) {
  const user = await requirePartnerAdmin('/admin');
  const commissionId = String(formData.get('commissionId') || '');
  const status = String(formData.get('status') || '');
  const amountCents = Number(formData.get('amountCents') || 0);
  const note = String(formData.get('note') || '').trim();

  if (!commissionId || !status) redirect('/admin/commissions?error=missing-commission-fields');

  try {
    await reviewCommission({ actorAuthUserId: user.id, commissionId, status, amountCents, note });
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
  const status = String(formData.get('status') || '');
  const decision = String(formData.get('decision') || '').trim();

  if (!disputeId || !status || !decision) redirect('/admin/disputes?error=missing-dispute-fields');

  try {
    await resolveDispute({ actorAuthUserId: user.id, disputeId, status, decision });
  } catch (error) {
    redirect(`/admin/disputes?error=${encodeURIComponent(errorMessage(error))}`);
  }

  revalidatePath('/admin/disputes');
  redirect('/admin/disputes?resolved=1');
}
