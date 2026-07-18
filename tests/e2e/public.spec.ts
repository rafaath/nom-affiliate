import { expect, test } from '@playwright/test';

test('public landing page exposes partner program CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Sell Nom to restaurants/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Become a partner/i }).first()).toBeVisible();
  await expect(page.getByText(/The loop from lead to payout/i)).toBeVisible();
});
