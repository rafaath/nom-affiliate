import { describe, expect, it } from 'vitest';
import { featureCodesForProductInterests, PRODUCT_INTEREST_FEATURE_CODES } from '@/lib/partner-program/platform/catalog';

describe('platform catalog mapping', () => {
  it('maps QR menu interest to the real RMS feature code', () => {
    expect(PRODUCT_INTEREST_FEATURE_CODES.qr_menu).toContain('qr');
    expect(PRODUCT_INTEREST_FEATURE_CODES.qr_menu).not.toContain('qr_menu');
  });

  it('deduplicates feature codes across broad product interests', () => {
    const featureCodes = featureCodesForProductInterests(['qr_menu', 'qr_ordering', 'full_restaurant_setup']);

    expect(featureCodes).toContain('qr');
    expect(featureCodes).toContain('menu');
    expect(featureCodes).toContain('tableOrders');
    expect(new Set(featureCodes).size).toBe(featureCodes.length);
  });
});
