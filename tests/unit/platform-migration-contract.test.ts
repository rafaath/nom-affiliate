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
const simplifiedLeadMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260719090000_simplify_partner_lead_capture.sql'),
  'utf8'
);
const jsonEncodingRepairMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260720090000_repair_partner_jsonb_encoding.sql'),
  'utf8'
);
const serverBoundaryMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260721090000_harden_partner_server_write_boundary.sql'),
  'utf8'
);
const termsMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260721100000_add_partner_program_terms_acceptance.sql'),
  'utf8'
);
const profileLinksMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260721110000_add_partner_application_profile_links.sql'),
  'utf8'
);
const partnerAgreementMigration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260723120000_add_referral_partner_agreement_acceptances.sql'),
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

  it('allows restaurant type to be collected after initial lead submission', () => {
    expect(simplifiedLeadMigration).toContain('alter column restaurant_type drop not null');
  });

  it('repairs JSONB values that were stored as encoded strings', () => {
    expect(jsonEncodingRepairMigration).toContain('decode_partner_jsonb_string');
    expect(jsonEncodingRepairMigration).toContain('platform_match_evidence = pg_temp.decode_partner_jsonb_string');
    expect(jsonEncodingRepairMigration).toContain('verification_evidence = pg_temp.decode_partner_jsonb_string');
    expect(jsonEncodingRepairMigration).toContain('platform_eligibility_evidence = pg_temp.decode_partner_jsonb_string');
  });

  it('removes Data API mutation privileges and broad mutation policies', () => {
    expect(serverBoundaryMigration).toContain('from public, anon, authenticated');
    expect(serverBoundaryMigration).toContain('grant select on table');
    expect(serverBoundaryMigration).not.toMatch(/grant\s+(insert|update|delete|all privileges)[^;]*to authenticated/i);
    expect(serverBoundaryMigration).toContain('drop policy if exists partner_leads_owned');
    expect(serverBoundaryMigration).toContain('drop policy if exists partner_audit_events_insert_self_or_admin');
    expect(serverBoundaryMigration).toContain('partner_leads_owned_select');
  });

  it('keeps pending applications server-only and guardedly secures the external waitlist table', () => {
    const authenticatedSelectBlock = serverBoundaryMigration.match(/grant select on table([\s\S]*?)to authenticated;/i)?.[1] ?? '';
    expect(authenticatedSelectBlock).not.toContain('partner_pending_applications');
    expect(serverBoundaryMigration).toContain("to_regclass('public.partner_waitlist_entries')");
  });

  it('adds nullable all-or-none terms audit fields without fabricating legacy consent', () => {
    expect(termsMigration).toContain('program_terms_version text');
    expect(termsMigration).toContain('program_terms_accepted_at timestamptz');
    expect(termsMigration).toContain('program_contact_consent_at timestamptz');
    expect(termsMigration).toContain('terms_audit_all_or_none');
    expect(termsMigration).not.toMatch(/add column[^,;]*program_terms_(version|accepted_at)[^,;]*not null/i);
    expect(termsMigration).not.toMatch(/update\s+public\.partner_(pending_)?applications/i);
  });

  it('adds optional application profile links without fabricating legacy values', () => {
    expect(profileLinksMigration).toContain('linkedin_profile_url text');
    expect(profileLinksMigration).toContain('resume_drive_url text');
    expect(profileLinksMigration).toContain('partner_pending_applications_linkedin_profile_url_valid');
    expect(profileLinksMigration).toContain('partner_applications_resume_drive_url_valid');
    expect(profileLinksMigration).not.toMatch(/add column[^,;]*(linkedin_profile_url|resume_drive_url)[^,;]*not null/i);
    expect(profileLinksMigration).not.toMatch(/update\s+public\.partner_(pending_)?applications/i);
  });

  it('stores immutable agreement snapshots and keeps new legal records server-written', () => {
    expect(partnerAgreementMigration).toContain('create table public.partner_agreement_acceptances');
    expect(partnerAgreementMigration).toContain('agreement_sha256 text not null');
    expect(partnerAgreementMigration).toContain('agreement_text text not null');
    expect(partnerAgreementMigration).toContain('privacy_notice_version text');
    expect(partnerAgreementMigration).toContain('before update or delete');
    expect(partnerAgreementMigration).toContain('append-only');
    expect(partnerAgreementMigration).toContain('revoke all privileges on table public.partner_agreement_acceptances');
    expect(partnerAgreementMigration).not.toMatch(/grant\s+(insert|update|delete|all privileges)[^;]*to authenticated/i);
  });
});
