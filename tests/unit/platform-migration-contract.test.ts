import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260524090000_partner_platform_integration.sql'),
  'utf8'
);
const requestedPackageMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260524100000_affiliate_requested_package_flow.sql'),
  'utf8'
);

describe('partner platform migration contract', () => {
  it('models onboarding requests, feature selections, attributions, and verification rules', () => {
    expect(migration).toContain('create table public.partner_platform_onboarding_requests');
    expect(migration).toContain('create table public.partner_deal_feature_selections');
    expect(migration).toContain('create table public.partner_platform_attributions');
    expect(migration).toContain('create table public.partner_setup_verification_rules');
  });

  it('adds platform verification and commission eligibility columns', () => {
    expect(migration).toContain('verification_status');
    expect(migration).toContain('platform_eligibility_status');
    expect(migration).toContain('platform_match_evidence');
    expect(migration).toContain('platform_link_kind');
  });

  it('uses real RMS feature codes in default verification metadata', () => {
    expect(migration).toContain("'qr'");
    expect(migration).toContain("'tableOrders'");
    expect(migration).toContain("'registers'");
    expect(migration).not.toMatch(/feature_code\s*=\s*'qr_menu'/);
  });

  it('separates affiliate requested package from admin approved package', () => {
    expect(requestedPackageMigration).toContain('requested_plan_id uuid references public.subscription_plans');
    expect(requestedPackageMigration).toContain('requested_feature_codes text[] not null default');
    expect(requestedPackageMigration).toContain('affiliate_package_snapshot jsonb not null default');
    expect(requestedPackageMigration).toContain('approval_package_snapshot jsonb not null default');
    expect(requestedPackageMigration).toContain('affiliate_requested_plan_id uuid references public.subscription_plans');
    expect(requestedPackageMigration).toContain('affiliate_reported_platform_link_kind public.partner_platform_link_kind');
  });

  it('captures RMS provisioning handoff fields from affiliate submission', () => {
    expect(requestedPackageMigration).toContain('legal_business_name text');
    expect(requestedPackageMigration).toContain('branch_address text');
    expect(requestedPackageMigration).toContain('gst_registration_type text');
    expect(requestedPackageMigration).toContain('requested_commission_preview_cents integer');
  });
});
