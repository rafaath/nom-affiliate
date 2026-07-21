import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(join(process.cwd(), 'src/lib/partner-program/admin-data.ts'), 'utf8');

describe('admin workflow write contract', () => {
  it('locks workflow records before transition checks', () => {
    expect(source.match(/for update/g)?.length).toBeGreaterThanOrEqual(5);
  });

  it('guards downstream deal side effects behind an actual stage change', () => {
    expect(source).toContain("if (stageChanged && input.stage === 'won')");
    expect(source).toContain("if (stageChanged && input.stage === 'live')");
    expect(source).toContain('if (stageChanged) {');
  });

  it('records both sides of deal stage events', () => {
    expect(source).toContain('event_type, from_stage, to_stage, note');
    expect(source).toContain('${previousDeal.stage}, ${input.stage}');
  });

  it('re-reads verifier-derived setup status before validating the requested transition', () => {
    const verificationIndex = source.indexOf('verifySetupChecklist(input.checklistId, tx)');
    const currentReadIndex = source.indexOf('const currentRows = await tx', verificationIndex);
    const transitionIndex = source.indexOf('canTransitionSetup(currentStatus, input.status)', currentReadIndex);
    expect(verificationIndex).toBeGreaterThan(-1);
    expect(currentReadIndex).toBeGreaterThan(verificationIndex);
    expect(transitionIndex).toBeGreaterThan(currentReadIndex);
  });
});
