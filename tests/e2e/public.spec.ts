import { expect, test } from '@playwright/test';

test('public landing presents the approval-gated partner flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Find restaurants/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Apply to partner/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Apply. Refer. Track./i })).toBeVisible();
  await expect(page.getByText(/Once approved, introduce restaurants/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/waitlist/i);
  await expect(page.locator('body')).not.toContainText(/30%/i);
});

test('application records the current program terms acceptance', async ({ page }) => {
  await page.goto('/apply');
  await expect(page.getByRole('heading', { name: /Tell us how you can help restaurants succeed/i })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /accept the Nom Partner Program Terms/i })).toBeVisible();
  const termsLink = page.getByRole('link', { name: /Nom Partner Program Terms/i });
  await expect(termsLink).toHaveAttribute('href', '/#partner-terms');
  await expect(termsLink).toHaveAttribute('target', '_blank');
});

test('there is no public waitlist route or copy', async ({ page }) => {
  const response = await page.goto('/waitlist');
  expect(response?.status()).toBe(404);
  await page.goto('/');
  await expect(page.locator('body')).not.toContainText(/waitlist/i);
});
