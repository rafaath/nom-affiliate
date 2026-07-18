import { describe, expect, it } from 'vitest';
import {
  buildRequestedPackageSnapshot,
  mergePlanAndRequestedFeatureCodes,
  selectCommissionPreviewRule,
} from '@/lib/partner-program/platform/package';
import type { PlatformFeature, PlatformPlan } from '@/lib/partner-program/platform/types';

const features: PlatformFeature[] = [
  { id: 'feature-qr', code: 'qr', label: 'QR Menu', description: null, is_core: true, is_active: true },
  { id: 'feature-menu', code: 'menu', label: 'Menu', description: null, is_core: true, is_active: true },
  { id: 'feature-inventory', code: 'inventory', label: 'Inventory', description: null, is_core: false, is_active: true },
];

const plan: PlatformPlan = {
  id: '00000000-0000-0000-0000-000000000001',
  code: 'GROWTH',
  name: 'Growth',
  description: null,
  price_cents: 500000,
  currency_code: 'INR',
  billing_period: 'monthly',
  is_active: true,
  features: features.slice(0, 2),
  feature_codes: ['qr', 'menu'],
};

describe('affiliate requested package snapshot', () => {
  it('keeps plan capabilities even when affiliate selects add-ons', () => {
    expect(mergePlanAndRequestedFeatureCodes(plan, ['inventory', 'qr'])).toEqual(['qr', 'menu', 'inventory']);
  });

  it('prefers the partner-specific commission rule over affiliate fallback', () => {
    const rule = selectCommissionPreviewRule(
      [
        {
          code: 'affiliate',
          partner_type: 'affiliate',
          commission_type: 'referral',
          fixed_amount_cents: 200000,
          percent_bps: null,
          currency_code: 'INR',
          validation_days: 30,
        },
        {
          code: 'sales',
          partner_type: 'sales_partner',
          commission_type: 'sales',
          fixed_amount_cents: 350000,
          percent_bps: null,
          currency_code: 'INR',
          validation_days: 30,
        },
      ],
      'sales_partner'
    );

    expect(rule?.code).toBe('sales');
  });

  it('builds revenue and commission preview from selected plan and branch count', () => {
    const snapshot = buildRequestedPackageSnapshot({
      plan,
      selectedFeatureCodes: ['inventory'],
      requestedBranchCount: 3,
      features,
      partnerType: 'affiliate',
      commissionRules: [
        {
          code: 'affiliate_fixed',
          partner_type: 'affiliate',
          commission_type: 'referral',
          fixed_amount_cents: 200000,
          percent_bps: null,
          currency_code: 'INR',
          validation_days: 30,
        },
      ],
    });

    expect(snapshot.monthly_revenue_cents).toBe(1500000);
    expect(snapshot.commission_preview_cents).toBe(200000);
    expect(snapshot.feature_codes).toEqual(['qr', 'menu', 'inventory']);
    expect(snapshot.summary).toBe('Growth · 3 branches · 3 capabilities');
  });
});
