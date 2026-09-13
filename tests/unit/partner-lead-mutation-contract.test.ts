import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dataSource = readFileSync(join(process.cwd(), 'src/lib/partner-program/data.ts'), 'utf8');
const actionSource = readFileSync(join(process.cwd(), 'src/app/actions/partner.ts'), 'utf8');
const pageSource = readFileSync(join(process.cwd(), 'src/app/partner/leads/page.tsx'), 'utf8');

describe('partner lead mutation contract', () => {
  it('locks an owned lead before applying the submitted-status mutation rule', () => {
    const helperStart = dataSource.indexOf('async function getOwnedLeadForUpdate');
    const helperEnd = dataSource.indexOf('export async function getEditablePartnerLead', helperStart);
    const helper = dataSource.slice(helperStart, helperEnd);

    expect(helper).toContain('and partner_id = ${partnerId}');
    expect(helper).toContain('for update');
    expect(helper).toContain('assertSubmittedLeadMutation');
  });

  it('keeps status and ownership predicates on both update and delete writes', () => {
    expect(dataSource).toMatch(/update public\.partner_leads[\s\S]*and partner_id = \$\{profile\.id\}[\s\S]*and status = 'submitted'/);
    expect(dataSource).toMatch(/delete from public\.partner_leads[\s\S]*and partner_id = \$\{profile\.id\}[\s\S]*and status = 'submitted'/);
  });

  it('authenticates update and delete actions and exposes controls through the shared status rule', () => {
    expect(actionSource).toContain('export async function updateLeadAction');
    expect(actionSource).toContain('export async function deleteLeadAction');
    expect(actionSource.match(/const user = await getCurrentUser\(\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(pageSource).toContain('canModify && canPartnerModifyLead(lead.status)');
  });
});
