import { test, expect } from '@playwright/test';

async function enterWorkstation(page: any) {
  await page.route('**/api/v1/**', async (route: any) => {
    const url = route.request().url();
    if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/me')) {
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
            id: 'e2e-user-id',
            email: 'user@nox.internal',
            name: 'Nox Architect',
            role: 'USER',
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
  await page.evaluate(() => {
    localStorage.setItem('nox_token', 'mock-e2e-valid-jwt-token');
    localStorage.setItem(
      'nox_user',
      JSON.stringify({
        id: 'e2e-user-id',
        email: 'user@nox.internal',
        name: 'Nox Architect',
        role: 'USER',
      })
    );
  });
  await page.goto('/');

  const quickCaptureBtn = page.getByRole('button', { name: /Quick Capture/i });
  await expect(quickCaptureBtn).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(600);
}

test.describe('NOX Production Workflows & Theme Parity', () => {
  test('should prompt for sign in modal when clicking Open Workstation without session', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
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
    await page.route('**/api/v1/**', async (route: any) => {
      const url = route.request().url();
      if (url.includes('/api/v1/auth/login') || url.includes('/api/v1/auth/me')) {
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
              id: 'e2e-user-id',
              email: 'user@nox.internal',
              name: 'Nox Architect',
              role: 'USER',
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
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');

    const heroHeading = page.locator('text=An External Representation');
    await expect(heroHeading).toBeVisible();

    const signInBtn = page.getByRole('button', { name: 'Sign In', exact: true });
    await expect(signInBtn).toBeVisible();
    await signInBtn.click();

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('user@nox.internal');
    await page.locator('input[type="password"]').fill('user123password');

    const submitBtn = page.locator('form button[type="submit"]');
    await submitBtn.click();

    const brand = page.locator('h1:has-text("NOX")');
    await expect(brand.first()).toBeVisible({ timeout: 15000 });

    const quickCaptureBtn = page.getByRole('button', { name: /Quick Capture/i });
    await expect(quickCaptureBtn).toBeVisible();
  });

  test('should toggle interface theme between Light and Dark modes', async ({ page }) => {
    await enterWorkstation(page);

    const htmlElem = page.locator('html');
    const isDarkInitially = await htmlElem.evaluate((el) => el.classList.contains('dark'));

    const toggleBtn = page.locator('button[title*="Switch to"]').first();
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click({ force: true });

    await page.waitForTimeout(400);

    if (isDarkInitially) {
      await expect(htmlElem).not.toHaveClass(/dark/);
    } else {
      await expect(htmlElem).toHaveClass(/dark/);
    }
  });

  test('should navigate across primary workstation tabs', async ({ page }) => {
    await enterWorkstation(page);

    const tabs = ['Goals', 'Roadmaps', 'Learning', 'Events', 'Habits', 'Tasks', 'Messages', 'Notes', 'Reminders', 'Notifications', 'Time'];

    for (const tab of tabs) {
      const tabButton = page.locator(`aside nav button:has-text("${tab}")`).first();
      await expect(tabButton).toBeVisible();
      await tabButton.click({ force: true });
      await page.waitForTimeout(150);
    }
  });

  test('should import JSON roadmap plan with live tree preview', async ({ page }) => {
    await enterWorkstation(page);

    // Navigate to Roadmaps using specific sidebar selector
    const roadmapsTab = page.locator('aside nav button:has-text("Roadmaps")').first();
    await expect(roadmapsTab).toBeVisible();
    await roadmapsTab.click({ force: true });

    // Click New Roadmap button
    const newRoadmapBtn = page.getByRole('button', { name: /New Roadmap/i }).first();
    await expect(newRoadmapBtn).toBeVisible();
    await newRoadmapBtn.click({ force: true });

    // Switch to Import JSON tab
    const jsonTabBtn = page.getByRole('button', { name: /Import JSON/i });
    await expect(jsonTabBtn).toBeVisible();
    await jsonTabBtn.click({ force: true });

    // Click Load Example button
    const loadExampleBtn = page.getByRole('button', { name: /Load Example/i });
    await expect(loadExampleBtn).toBeVisible();
    await loadExampleBtn.click({ force: true });

    // Verify visual tree preview renders milestone preview card
    const previewHeader = page.locator('text=Valid Plan Preview');
    await expect(previewHeader).toBeVisible();

    // Submit import
    const importSubmitBtn = page.getByRole('button', { name: /Import Roadmap/i });
    await expect(importSubmitBtn).toBeEnabled();
    await importSubmitBtn.click({ force: true });
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

