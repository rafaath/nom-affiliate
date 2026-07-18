import { getDatabase, type SqlExecutor } from '@/lib/db/client';
import {
  buildLeadIdentity,
  isLikelyDuplicate,
  normalizeEmail,
  normalizePhone,
  normalizeText,
  scoreDuplicateLead,
  type LeadIdentityInput,
} from '@/lib/partner-program/duplicate-detection';
import type {
  LeadReconciliationInput,
  LeadReconciliationResult,
  PlatformLinkKind,
  ReconciliationEvidence,
} from './types';

type PartnerLeadCandidate = LeadIdentityInput & {
  id: string;
  status: string;
  partner_id: string;
};

type FranchiseCandidate = LeadIdentityInput & {
  id: string;
  status: string | null;
};

type BranchCandidate = LeadIdentityInput & {
  id: string;
  franchise_id: string;
  branch_name: string;
  status: string | null;
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function highestEvidence(evidence: ReconciliationEvidence[], source?: ReconciliationEvidence['source']) {
  return evidence
    .filter((item) => !source || item.source === source)
    .sort((left, right) => right.score - left.score)[0];
}

function evidenceForCandidate(
  source: ReconciliationEvidence['source'],
  id: string,
  label: string,
  candidate: LeadIdentityInput,
  input: LeadReconciliationInput,
  metadata: Record<string, unknown>
): ReconciliationEvidence | null {
  const scored = scoreDuplicateLead(
    {
      restaurantName: input.restaurantName,
      phone: input.phone,
      email: input.email,
      city: input.city,
      locality: input.locality,
    },
    candidate
  );
  const score = clampScore(scored.score);

  if (score === 0) return null;

  return {
    source,
    id,
    label,
    score,
    signals: scored.signals,
    metadata,
  };
}

async function getPartnerLeadCandidates(input: LeadReconciliationInput, sql: SqlExecutor) {
  const identity = buildLeadIdentity(input);
  const rows = await sql`
    select id, partner_id, restaurant_name, phone, email, city, locality, status
    from public.partner_leads
    where (${input.leadId ?? null}::uuid is null or id <> ${input.leadId ?? null}::uuid)
      and (
        (${identity.phone} <> '' and normalized_phone = ${identity.phone})
        or (${identity.email} <> '' and normalized_email = ${identity.email})
        or (
          normalized_restaurant_name = ${identity.restaurantName}
          and lower(city) = lower(${input.city || ''})
        )
      )
    order by created_at desc
    limit 25
  `;

  return rows.map((row: any): PartnerLeadCandidate => ({
    id: row.id,
    partner_id: row.partner_id,
    status: row.status,
    restaurantName: row.restaurant_name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    locality: row.locality,
  }));
}

async function getPlatformFranchiseCandidates(input: LeadReconciliationInput, sql: SqlExecutor) {
  const identity = buildLeadIdentity(input);
  const rows = await sql`
    select id, name, owner_name, contact_email, contact_phone, status
    from public.franchises
    where (
      (${identity.phone} <> '' and right(regexp_replace(coalesce(contact_phone, ''), '\\D', '', 'g'), 10) = ${identity.phone})
      or (${identity.email} <> '' and lower(coalesce(contact_email, '')) = ${identity.email})
      or lower(regexp_replace(btrim(name), '[^a-zA-Z0-9]+', ' ', 'g')) = ${identity.restaurantName}
    )
    order by created_at desc nulls last
    limit 25
  `;

  return rows.map((row: any): FranchiseCandidate => ({
    id: row.id,
    status: row.status,
    restaurantName: row.name,
    phone: row.contact_phone,
    email: row.contact_email,
    city: input.city,
    locality: input.locality,
  }));
}

async function getPlatformBranchCandidates(input: LeadReconciliationInput, sql: SqlExecutor) {
  const identity = buildLeadIdentity(input);
  const rows = await sql`
    select
      b.id,
      b.franchise_id,
      b.name,
      b.display_name,
      b.city,
      b.address,
      b.status,
      f.name as franchise_name,
      f.contact_email,
      f.contact_phone
    from public.branches b
    join public.franchises f on f.id = b.franchise_id
    where (
      (${identity.phone} <> '' and right(regexp_replace(coalesce(f.contact_phone, ''), '\\D', '', 'g'), 10) = ${identity.phone})
      or (${identity.email} <> '' and lower(coalesce(f.contact_email, '')) = ${identity.email})
      or lower(regexp_replace(btrim(coalesce(b.display_name, b.name)), '[^a-zA-Z0-9]+', ' ', 'g')) = ${identity.restaurantName}
      or lower(regexp_replace(btrim(f.name), '[^a-zA-Z0-9]+', ' ', 'g')) = ${identity.restaurantName}
    )
    order by b.created_at desc nulls last
    limit 25
  `;

  return rows.map((row: any): BranchCandidate => ({
    id: row.id,
    franchise_id: row.franchise_id,
    branch_name: row.display_name || row.name,
    status: row.status,
    restaurantName: row.display_name || row.name || row.franchise_name,
    phone: row.contact_phone,
    email: row.contact_email,
    city: row.city,
    locality: row.address,
  }));
}

export async function reconcileLeadAgainstPlatform(
  input: LeadReconciliationInput,
  sql: SqlExecutor = getDatabase()
): Promise<LeadReconciliationResult> {
  const partnerLeadCandidates = await getPartnerLeadCandidates(input, sql);
  const franchiseCandidates = await getPlatformFranchiseCandidates(input, sql);
  const branchCandidates = await getPlatformBranchCandidates(input, sql);

  const evidence = [
    ...partnerLeadCandidates
      .map((candidate) =>
        evidenceForCandidate('partner_lead', candidate.id, candidate.restaurantName, candidate, input, {
          status: candidate.status,
          partner_id: candidate.partner_id,
        })
      )
      .filter(Boolean),
    ...franchiseCandidates
      .map((candidate) =>
        evidenceForCandidate('franchise', candidate.id, candidate.restaurantName, candidate, input, {
          status: candidate.status,
        })
      )
      .filter(Boolean),
    ...branchCandidates
      .map((candidate) =>
        evidenceForCandidate('branch', candidate.id, candidate.branch_name, candidate, input, {
          franchise_id: candidate.franchise_id,
          status: candidate.status,
        })
      )
      .filter(Boolean),
  ] as ReconciliationEvidence[];

  evidence.sort((left, right) => right.score - left.score);

  const duplicateLead = highestEvidence(evidence, 'partner_lead');
  const branch = highestEvidence(evidence, 'branch');
  const franchise = highestEvidence(evidence, 'franchise');
  const best = highestEvidence(evidence);
  const branchCandidate = branch
    ? branchCandidates.find((candidate) => candidate.id === branch.id)
    : null;

  let matchKind: PlatformLinkKind = 'new_restaurant';
  let reviewDecision: LeadReconciliationResult['reviewDecision'] = 'new_restaurant';
  let duplicateLeadId: string | null = null;
  let existingFranchiseId: string | null = null;
  let existingBranchId: string | null = null;

  if (duplicateLead && isLikelyDuplicate(duplicateLead.score)) {
    duplicateLeadId = duplicateLead.id;
    const duplicateStatus = String(duplicateLead.metadata.status || '');
    reviewDecision = ['accepted', 'under_review', 'submitted', 'needs_more_information'].includes(duplicateStatus)
      ? 'already_in_pipeline'
      : 'duplicate';
  }

  if (branch && isLikelyDuplicate(branch.score)) {
    matchKind = 'existing_branch';
    reviewDecision = duplicateLeadId ? reviewDecision : 'link_existing';
    existingBranchId = branch.id;
    existingFranchiseId = branchCandidate?.franchise_id ?? (String(branch.metadata.franchise_id || '') || null);
  } else if (franchise && isLikelyDuplicate(franchise.score)) {
    matchKind = 'existing_franchise';
    reviewDecision = duplicateLeadId ? reviewDecision : 'link_existing';
    existingFranchiseId = franchise.id;
  }

  return {
    matchKind,
    confidence: clampScore(best?.score ?? 0),
    evidence: evidence.slice(0, 10),
    duplicateLeadId,
    existingFranchiseId,
    existingBranchId,
    reviewDecision,
  };
}

export async function persistLeadReconciliation(
  leadId: string,
  result: LeadReconciliationResult,
  sql: SqlExecutor = getDatabase()
) {
  await sql`
    update public.partner_leads
    set
      platform_match_kind = ${result.matchKind},
      platform_match_confidence = ${result.confidence},
      platform_match_evidence = ${JSON.stringify(result.evidence)}::jsonb,
      platform_review_decision = ${result.reviewDecision},
      duplicate_of_lead_id = ${result.duplicateLeadId},
      existing_franchise_id = ${result.existingFranchiseId},
      existing_branch_id = ${result.existingBranchId},
      updated_at = now()
    where id = ${leadId}
  `;
}

export async function loadLeadReconciliationInput(leadId: string, sql: SqlExecutor = getDatabase()) {
  const rows = await sql`
    select id, restaurant_name, owner_name, phone, email, city, locality
    from public.partner_leads
    where id = ${leadId}
    limit 1
  `;
  const row = rows[0] as any;
  if (!row) throw new Error('Lead not found.');

  return {
    leadId: row.id,
    restaurantName: row.restaurant_name,
    ownerName: row.owner_name,
    phone: row.phone,
    email: row.email,
    city: row.city,
    locality: row.locality,
  } satisfies LeadReconciliationInput;
}

export async function reconcileAndPersistLead(leadId: string, sql: SqlExecutor = getDatabase()) {
  const input = await loadLeadReconciliationInput(leadId, sql);
  const result = await reconcileLeadAgainstPlatform(input, sql);
  await persistLeadReconciliation(leadId, result, sql);
  return result;
}

export function normalizePlatformSearchTerm(value?: string | null) {
  return normalizeText(value);
}

export function normalizePlatformEmail(value?: string | null) {
  return normalizeEmail(value);
}

export function normalizePlatformPhone(value?: string | null) {
  return normalizePhone(value);
}
