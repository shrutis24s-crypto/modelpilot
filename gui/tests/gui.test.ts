/**
 * ModelPilot GUI Tests — Playwright
 * ========================================

 *
 * Covers the key GUI user journeys for Developer Mode and
 * Researcher Mode, and verifies API connectivity between
 * the frontend and backend.
 *
 * Prerequisites:
 *   - Frontend running: npm run dev (localhost:8080)
 *   - Backend running:  uvicorn backend.api.main:app --reload (localhost:8000)
 *   - At least one completed run in the system
 *
 * Run from modelpilot/frontend5/:
 *   npx playwright test --headed --config playwright.config.ts
 */

import { test, expect, Page } from "@playwright/test";

const BASE_URL = "http://localhost:8080";

// ── Helper ────────────────────────────────────────────────────

async function selectMode(page: Page, mode: "developer" | "researcher") {
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  if (mode === "developer") {
    await page.locator("text=Developer Mode").first().click();
  } else {
    await page.locator("text=Researcher Mode").first().click();
  }

  await page.waitForURL("**/dashboard");
  await page.waitForLoadState("networkidle");

  // Persist mode in localStorage so it survives navigation
  await page.evaluate((m) => {
    localStorage.setItem("modepilot_mode", m);
  }, mode);
}

// ══════════════════════════════════════════════════════════════
// MODE SELECTOR
// ══════════════════════════════════════════════════════════════

test.describe("Mode Selector", () => {
  test("loads with ModelPilot branding", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=ModelPilot").first()).toBeVisible();
  });

  test("shows both Developer and Researcher mode options", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=Developer Mode").first()).toBeVisible();
    await expect(page.locator("text=Researcher Mode").first()).toBeVisible();
  });

  test("Developer Mode navigates to dashboard", async ({ page }) => {
    await selectMode(page, "developer");
    await expect(page).toHaveURL(/dashboard/);
  });

  test("Researcher Mode navigates to dashboard", async ({ page }) => {
    await selectMode(page, "researcher");
    await expect(page).toHaveURL(/dashboard/);
  });
});

// ══════════════════════════════════════════════════════════════
// DEVELOPER MODE
// ══════════════════════════════════════════════════════════════

test.describe("Developer Mode", () => {
  test.beforeEach(async ({ page }) => {
    await selectMode(page, "developer");
  });

  test("dashboard shows ModelPilot title and sidebar", async ({ page }) => {
    await expect(page.locator("text=ModelPilot").first()).toBeVisible();
    const nav = page.locator("nav, aside, [role=navigation]").first();
    await expect(nav).toBeVisible();
  });

  test("build page loads and has content", async ({ page }) => {
    await page.goto(`${BASE_URL}/build`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("templates page loads and has content", async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("past results page loads without error", async ({ page }) => {
    await page.goto(`${BASE_URL}/past-results`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await expect(page.locator("text=500")).not.toBeVisible();
    await expect(page.locator("text=Something went wrong")).not.toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// RESEARCHER MODE
// ══════════════════════════════════════════════════════════════

test.describe("Researcher Mode", () => {
  test.beforeEach(async ({ page }) => {
    await selectMode(page, "researcher");
  });

  test("dashboard loads correctly", async ({ page }) => {
    await expect(page.locator("text=ModelPilot").first()).toBeVisible();
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("templates page loads and has content", async ({ page }) => {
    await page.goto(`${BASE_URL}/templates`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("past results page loads without error", async ({ page }) => {
    await page.goto(`${BASE_URL}/past-results`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    await expect(page.locator("text=500")).not.toBeVisible();
    await expect(page.locator("text=Something went wrong")).not.toBeVisible();
  });
});

// ══════════════════════════════════════════════════════════════
// API CONNECTIVITY
// Verifies the GUI successfully calls the backend API
// ══════════════════════════════════════════════════════════════

test.describe("API Connectivity", () => {
  test("frontend makes successful API calls on load", async ({ page }) => {
    const apiCalls: number[] = [];
    page.on("response", (response) => {
      if (response.url().includes("localhost:8000")) {
        apiCalls.push(response.status());
      }
    });
    await selectMode(page, "developer");
    await page.waitForTimeout(3000);
    const successCalls = apiCalls.filter((s) => s === 200);
    expect(successCalls.length).toBeGreaterThan(0);
  });

  test("models page loads and shows content", async ({ page }) => {
    await selectMode(page, "developer");
    await page.goto(`${BASE_URL}/models`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("templates page loads and shows content", async ({ page }) => {
    await selectMode(page, "developer");
    await page.goto(`${BASE_URL}/templates`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test("past results page loads and shows content", async ({ page }) => {
    await selectMode(page, "developer");
    await page.goto(`${BASE_URL}/past-results`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });
});