import { expect, test } from "@playwright/test";

test("public landing presents the approval-gated partner flow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Refer restaurants. Earn 25% with Nom." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Apply to partner/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Apply. Refer. Track./i }),
  ).toBeVisible();
  await expect(
    page.getByText(/Use your network or thoughtful outreach/i),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/waitlist/i);
  await expect(page.locator("body")).not.toContainText(/30%/i);
});

test("application requires Google verification before showing the application form", async ({
  page,
}) => {
  await page.goto("/apply");
  await expect(
    page.getByRole("heading", {
      name: /Your next introduction could pay off/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Sign in with Google to apply/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Create password")).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", {
      name: /accept the Partner Application Terms/i,
    }),
  ).toHaveCount(0);
});

test('Google sign-in is above the fold on a small mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/apply');
  const button = page.getByRole('button', { name: /Sign in with Google to apply/i });
  await expect(button).toBeVisible();
  const bounds = await button.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(640);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("there is no public waitlist route or copy", async ({ page }) => {
  const response = await page.goto("/waitlist");
  expect(response?.status()).toBe(404);
  await page.goto("/");
  await expect(page.locator("body")).not.toContainText(/waitlist/i);
});
