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
      name: /Tell us how you can help restaurants succeed/i,
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

test("there is no public waitlist route or copy", async ({ page }) => {
  const response = await page.goto("/waitlist");
  expect(response?.status()).toBe(404);
  await page.goto("/");
  await expect(page.locator("body")).not.toContainText(/waitlist/i);
});
