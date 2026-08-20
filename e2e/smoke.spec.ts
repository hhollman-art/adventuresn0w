import { test, expect } from "@playwright/test";

test.describe("Command Center smoke", () => {
  test("home loads the DM Command Center chrome", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /D&D EASY/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Prep Mode/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Live Session/i })).toBeVisible();
  });

  test("campaigns workplace opens the Homebrew Campaign Builder", async ({ page }) => {
    await page.goto("/campaigns");
    await expect(page.getByRole("heading", { name: /campaign/i }).first()).toBeVisible();
    // Empty state or existing campaign list — either proves the route rendered.
    await expect(
      page.getByText(/No campaigns yet|New campaign|Homebrew Campaign Builder/i).first(),
    ).toBeVisible();
  });

  test("library route stays reachable", async ({ page }) => {
    await page.goto("/library");
    await expect(page.getByRole("link", { name: /D&D EASY/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/Library|The Library|Creation File|CF/i);
  });

  test("legal page still ships SRD attribution", async ({ page }) => {
    await page.goto("/legal");
    await expect(page.getByRole("heading", { name: /legal|attribution|license/i }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText(/SRD|CC BY/i);
  });
});
