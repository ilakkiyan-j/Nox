import { test, expect } from '@playwright/test';

test.describe('NOX Production Workflows & Theme Parity', () => {
  test('should load landing page and enter workstation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NOX/);

    const heroHeading = page.locator('text=An External Representation');
    await expect(heroHeading).toBeVisible();

    const openBtn = page.getByRole('button', { name: /Open Workstation/i }).first();
    await openBtn.click();

    const brand = page.locator('h1:has-text("NOX")');
    await expect(brand.first()).toBeVisible();

    const quickCaptureBtn = page.getByRole('button', { name: /Quick Capture/i });
    await expect(quickCaptureBtn).toBeVisible();
  });

  test('should toggle interface theme between Light and Dark modes', async ({ page }) => {
    await page.goto('/');

    const openBtn = page.getByRole('button', { name: /Open Workstation/i }).first();
    await openBtn.click();

    // Default theme is Dark Mode ('Switch to Light Mode' title displayed)
    const themeToggleBtn = page.getByTitle(/Switch to Light Mode/i).first();
    await expect(themeToggleBtn).toBeVisible();

    // Toggle to Light Mode
    await themeToggleBtn.click();
    const htmlElem = page.locator('html');
    await expect(htmlElem).not.toHaveClass(/dark/);

    // Toggle back to Dark Mode
    const darkToggleBtn = page.getByTitle(/Switch to Dark Mode/i).first();
    await expect(darkToggleBtn).toBeVisible();
    await darkToggleBtn.click();
    await expect(htmlElem).toHaveClass(/dark/);
  });

  test('should navigate across primary workstation tabs', async ({ page }) => {
    await page.goto('/');

    const openBtn = page.getByRole('button', { name: /Open Workstation/i }).first();
    await openBtn.click();

    const tabs = ['Goals', 'Tasks', 'Learning', 'Events', 'Habits', 'Notes', 'Notifications', 'Time'];

    for (const tab of tabs) {
      const tabButton = page.getByRole('button', { name: tab }).first();
      await expect(tabButton).toBeVisible();
      await tabButton.click();
    }
  });

  test('should import JSON roadmap plan with live tree preview', async ({ page }) => {
    await page.goto('/');

    const openBtn = page.getByRole('button', { name: /Open Workstation/i }).first();
    await openBtn.click();

    // Navigate to Goals & Roadmaps
    const goalsTab = page.getByRole('button', { name: 'Goals' }).first();
    await goalsTab.click();

    // Click New Roadmap button
    const newRoadmapBtn = page.getByRole('button', { name: /New Roadmap/i });
    await expect(newRoadmapBtn).toBeVisible();
    await newRoadmapBtn.click();

    // Switch to Import JSON tab
    const jsonTabBtn = page.getByRole('button', { name: /Import JSON /i });
    await expect(jsonTabBtn).toBeVisible();
    await jsonTabBtn.click();

    // Click Load Example Plan button
    const loadExampleBtn = page.getByRole('button', { name: /Load Example Plan/i });
    await expect(loadExampleBtn).toBeVisible();
    await loadExampleBtn.click();

    // Verify visual tree preview renders milestone preview card
    const previewHeader = page.locator('text=Valid Plan Preview');
    await expect(previewHeader).toBeVisible();

    // Submit import
    const importSubmitBtn = page.getByRole('button', { name: /Import Roadmap Plan/i });
    await expect(importSubmitBtn).toBeEnabled();
    await importSubmitBtn.click();
  });

  test('should verify health API endpoint is responsive', async ({ request }) => {
    const response = await request.get('http://localhost:4000/api/v1/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('healthy');
    expect(body.data.database.connected).toBe(true);
  });
});
