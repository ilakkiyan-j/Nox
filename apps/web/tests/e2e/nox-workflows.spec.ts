import { test, expect } from '@playwright/test';

async function enterWorkstation(page: any) {
  await page.route('**/api/v1/**', async (route: any) => {
    const url = route.request().url();
    if (url.includes('/api/v1/auth/login')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            token: 'mock-e2e-valid-jwt-token',
            user: {
              id: 'e2e-user-id',
              email: 'user@nox.internal',
              name: 'Nox Architect',
              role: 'USER',
            },
          },
        }),
      });
      return;
    }

    if (url.includes('/api/v1/dashboard')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tasks: [],
            activeGoals: [],
            habits: [],
            upcomingEvents: [],
            recentNotes: [],
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [],
      }),
    });
  });

  await page.goto('/');

  const signInBtn = page.getByRole('button', { name: 'Sign In', exact: true });
  await signInBtn.click();

  await page.locator('input[type="email"]').fill('user@nox.internal');
  await page.locator('input[type="password"]').fill('user123password');

  const submitBtn = page.locator('form button[type="submit"]');
  await submitBtn.click();

  await expect(page.getByRole('button', { name: /Quick Capture/i })).toBeVisible({ timeout: 10000 });
}

test.describe('NOX Production Workflows & Theme Parity', () => {
  test('should prompt for sign in modal when clicking Open Workstation without session', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NOX/);

    const openBtn = page.getByRole('button', { name: /Open Workstation/i }).first();
    await openBtn.click();

    const authModalTitle = page.getByRole('heading', { name: /Sign In to NOX/i });
    await expect(authModalTitle).toBeVisible();

    const quickCaptureBtn = page.getByRole('button', { name: /Quick Capture/i });
    await expect(quickCaptureBtn).not.toBeVisible();
  });

  test('should load landing page and enter workstation via authentication', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NOX/);

    const heroHeading = page.locator('text=An External Representation');
    await expect(heroHeading).toBeVisible();

    await enterWorkstation(page);

    const brand = page.locator('h1:has-text("NOX")');
    await expect(brand.first()).toBeVisible();

    const quickCaptureBtn = page.getByRole('button', { name: /Quick Capture/i });
    await expect(quickCaptureBtn).toBeVisible();
  });

  test('should toggle interface theme between Light and Dark modes', async ({ page }) => {
    await enterWorkstation(page);

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
    await enterWorkstation(page);

    const tabs = ['Goals', 'Tasks', 'Learning', 'Events', 'Habits', 'Notes', 'Notifications', 'Time'];

    for (const tab of tabs) {
      const tabButton = page.getByRole('button', { name: tab }).first();
      await expect(tabButton).toBeVisible();
      await tabButton.click();
    }
  });

  test('should import JSON roadmap plan with live tree preview', async ({ page }) => {
    await enterWorkstation(page);

    // Navigate to Roadmaps
    const roadmapsTab = page.getByRole('button', { name: 'Roadmaps' }).first();
    await roadmapsTab.click();

    // Click New Roadmap button
    const newRoadmapBtn = page.getByRole('button', { name: /New Roadmap/i }).first();
    await expect(newRoadmapBtn).toBeVisible();
    await newRoadmapBtn.click();

    // Switch to Import JSON tab
    const jsonTabBtn = page.getByRole('button', { name: /Import JSON/i });
    await expect(jsonTabBtn).toBeVisible();
    await jsonTabBtn.click();

    // Click Load Example button
    const loadExampleBtn = page.getByRole('button', { name: /Load Example/i });
    await expect(loadExampleBtn).toBeVisible();
    await loadExampleBtn.click();

    // Verify visual tree preview renders milestone preview card
    const previewHeader = page.locator('text=Valid Plan Preview');
    await expect(previewHeader).toBeVisible();

    // Submit import
    const importSubmitBtn = page.getByRole('button', { name: /Import Roadmap/i });
    await expect(importSubmitBtn).toBeEnabled();
    await importSubmitBtn.click();
  });

  test('should verify health API endpoint is responsive', async ({ request }) => {
    const response = await request.get('http://localhost:4000/api/v1/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(['healthy', 'degraded']).toContain(body.data.status);
    expect(typeof body.data.database.connected).toBe('boolean');
  });
});
