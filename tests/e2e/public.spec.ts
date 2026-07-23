import { expect, test } from '@playwright/test';

test('public landing presents the approval-gated partner flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Find restaurants/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Apply to partner/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Apply. Refer. Track./i })).toBeVisible();
  await expect(page.getByText(/Use your network or thoughtful outreach/i)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/waitlist/i);
  await expect(page.locator('body')).not.toContainText(/30%/i);
});

test('application records the current application terms and privacy acknowledgement', async ({ page }) => {
  await page.goto('/apply');
  await expect(page.getByRole('heading', { name: /Tell us how you can help restaurants succeed/i })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /accept the Partner Application Terms/i })).toBeVisible();
  const termsLink = page.getByRole('link', { name: /Partner Application Terms/i });
  await expect(termsLink).toHaveAttribute('href', '/application-terms');
  await expect(termsLink).toHaveAttribute('target', '_blank');
  const privacyLink = page.getByRole('link', { name: /Partner Program Privacy Notice/i });
  await expect(privacyLink).toHaveAttribute('href', '/privacy');
  await expect(privacyLink).toHaveAttribute('target', '_blank');
});

test('there is no public waitlist route or copy', async ({ page }) => {
  const response = await page.goto('/waitlist');
  expect(response?.status()).toBe(404);
  await page.goto('/');
  await expect(page.locator('body')).not.toContainText(/waitlist/i);
});
