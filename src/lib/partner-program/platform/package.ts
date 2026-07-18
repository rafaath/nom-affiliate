import type { PartnerType } from '@/lib/partner-program/types';
import type { PlatformFeature, PlatformPlan } from './types';

export type PackageCommissionRule = {
  code?: string;
  partner_type: PartnerType | null;
  commission_type: string;
  fixed_amount_cents: number | null;
  percent_bps: number | null;
  currency_code: string;
  validation_days: number;
};

export type RequestedPackageSnapshot = {
  plan_id: string;
  plan_code: string;
  plan_name: string;
  currency_code: string;
  billing_period: string;
  branch_count: number;
  plan_price_cents: number;
  monthly_revenue_cents: number;
  feature_codes: string[];
  feature_labels: string[];
  summary: string;
  commission_preview_cents: number;
  commission_preview: {
    rule_code: string | null;
    commission_type: string | null;
    fixed_amount_cents: number | null;
    percent_bps: number | null;
    validation_days: number | null;
    explanation: string;
  };
};

function unique(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeBranchCount(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(500, Math.trunc(value)));
}

export function mergePlanAndRequestedFeatureCodes(plan: PlatformPlan, requestedFeatureCodes: readonly string[]) {
  return unique([...plan.feature_codes, ...requestedFeatureCodes]);
}

export function selectCommissionPreviewRule(
  rules: readonly PackageCommissionRule[],
  partnerType: PartnerType | string | null | undefined
) {
  const activeRules = rules.filter((rule) => ['referral', 'sales'].includes(rule.commission_type));
  const exact = activeRules.find((rule) => rule.partner_type === partnerType);
  if (exact) return exact;

  const affiliate = activeRules.find((rule) => rule.partner_type === 'affiliate');
  if (affiliate) return affiliate;

  return activeRules[0] ?? null;
}

export function estimateCommissionPreviewCents(rule: PackageCommissionRule | null, monthlyRevenueCents: number) {
  if (!rule) return 0;
  const fixed = rule.fixed_amount_cents ?? 0;
  const percent = rule.percent_bps ? Math.round((monthlyRevenueCents * rule.percent_bps) / 10_000) : 0;
  return Math.max(0, fixed + percent);
}

export function buildRequestedPackageSnapshot(input: {
  plan: PlatformPlan;
  selectedFeatureCodes: readonly string[];
  requestedBranchCount: number;
  features: readonly PlatformFeature[];
  commissionRules: readonly PackageCommissionRule[];
  partnerType: PartnerType | string | null | undefined;
}): RequestedPackageSnapshot {
  const branchCount = normalizeBranchCount(input.requestedBranchCount);
  const featureCodes = mergePlanAndRequestedFeatureCodes(input.plan, input.selectedFeatureCodes);
  const featureLabelsByCode = new Map(input.features.map((feature) => [feature.code, feature.label]));
  const featureLabels = featureCodes.map((code) => featureLabelsByCode.get(code) ?? code);
  const monthlyRevenueCents = input.plan.price_cents * branchCount;
  const rule = selectCommissionPreviewRule(input.commissionRules, input.partnerType);
  const commissionPreviewCents = estimateCommissionPreviewCents(rule, monthlyRevenueCents);

  return {
    plan_id: input.plan.id,
    plan_code: input.plan.code,
    plan_name: input.plan.name,
    currency_code: input.plan.currency_code,
    billing_period: input.plan.billing_period,
    branch_count: branchCount,
    plan_price_cents: input.plan.price_cents,
    monthly_revenue_cents: monthlyRevenueCents,
    feature_codes: featureCodes,
    feature_labels: featureLabels,
    summary: `${input.plan.name} · ${branchCount} ${branchCount === 1 ? 'branch' : 'branches'} · ${featureCodes.length} capabilities`,
    commission_preview_cents: commissionPreviewCents,
    commission_preview: {
      rule_code: rule?.code ?? null,
      commission_type: rule?.commission_type ?? null,
      fixed_amount_cents: rule?.fixed_amount_cents ?? null,
      percent_bps: rule?.percent_bps ?? null,
      validation_days: rule?.validation_days ?? null,
      explanation: rule
        ? 'Preview only. Final payout requires admin approval, payment validation, and platform eligibility.'
        : 'No active commission rule is configured for this partner type.',
    },
  };
}
