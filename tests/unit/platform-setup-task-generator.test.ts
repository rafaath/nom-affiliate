import { describe, expect, it } from 'vitest';
import { buildSetupTaskTemplates } from '@/lib/partner-program/platform/setup-task-generator';

describe('platform setup task generator', () => {
  it('always includes core platform identity and subscription checks', () => {
    const tasks = buildSetupTaskTemplates(['qr']);
    const ruleCodes = tasks.map((task) => task.verificationRuleCode);

    expect(ruleCodes).toEqual(expect.arrayContaining([
      'franchise.exists',
      'branch.exists',
      'owner_staff_auth.exists',
      'subscription.active',
    ]));
  });

  it('expands QR ordering dependencies into menu, QR, table, register, and payment checks', () => {
    const tasks = buildSetupTaskTemplates(['qr', 'tableOrders']);
    const taskKeys = tasks.map((task) => task.key);

    expect(taskKeys).toEqual(expect.arrayContaining([
      'menu_catalog',
      'qr_runtime',
      'pos_tables',
      'pos_registers',
      'payments_ready',
    ]));
  });

  it('does not add inventory checks unless inventory is selected', () => {
    const qrOnly = buildSetupTaskTemplates(['qr']);
    const inventory = buildSetupTaskTemplates(['inventory']);

    expect(qrOnly.map((task) => task.key)).not.toContain('inventory_foundation');
    expect(inventory.map((task) => task.key)).toContain('inventory_foundation');
  });
});
