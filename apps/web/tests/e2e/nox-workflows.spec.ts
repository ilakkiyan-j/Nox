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
  await page.waitForLoadState('networkidle');

  const signInBtn = page.getByRole('button', { name: 'Sign In', exact: true });
  await expect(signInBtn).toBeVisible({ timeout: 10000 });
  await signInBtn.click();

  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 5000 });
  await emailInput.fill('user@nox.internal');
  await page.locator('input[type="password"]').fill('user123password');

  const submitBtn = page.locator('form button[type="submit"]');
  await submitBtn.click();

  const quickCaptureBtn = page.getByRole('button', { name: /Quick Capture/i });
  await expect(quickCaptureBtn).toBeVisible({ timeout: 15000 });
}

test.describe('NOX Production Workflows & Theme Parity', () => {
  test('should prompt for sign in modal when clicking Open Workstation without session', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/NOX/);

    const openBtn = page.getByRole('button', { name: /Open Workstation/i }).first();
    await openBtn.click();

    const authModalTitle = page.getByRole('heading', { name: /Sign In to NOX/i });
    await expect(authModalTitle).toBeVisible();

    const quickCaptureBtn = page.getByRole('button', { name: /Quick Capture/i });
    await expect(quickCaptureBtn).not.toBeVisible();
  });

  test('should keep the landing page within the viewport on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
  });

  test('should load landing page and enter workstation via authentication', async ({ page }) => {
    await enterWorkstation(page);

    await expect(page.getByRole('heading', { name: 'Personal Command Center' })).toBeVisible({
      timeout: 15000,
    });

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

    const tabs = [
      'Dashboard',
      'Council',
      'Goals',
      'Roadmaps',
      'Learning',
      'Events',
      'Habits',
      'Tasks',
      'Messages',
      'Notes',
      'Reminders',
      'Notifications',
      'Time',
    ];

    for (const tab of tabs) {
      const tabButton = page.locator(`aside nav button:has-text("${tab}")`).first();
      await expect(tabButton).toBeVisible();
      await tabButton.click({ force: true });
      await page.waitForTimeout(150);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const mobilePrimaryTabs = ['Dashboard', 'Tasks', 'Goals', 'Council', 'Notes'];
    for (const tab of tabs) {
      if (mobilePrimaryTabs.includes(tab)) {
        await page.getByRole('navigation', { name: 'Primary mobile navigation' }).getByRole('button', { name: tab }).click();
      } else {
        await page.getByRole('button', { name: /Open more sections/ }).click();
        await page.getByRole('navigation', { name: 'More sections' }).getByRole('button', { name: tab }).click();
      }
      await page.waitForTimeout(100);
      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));
      expect(dimensions.documentWidth, `${tab} view overflows the mobile viewport`).toBeLessThanOrEqual(
        dimensions.viewportWidth,
      );
    }
  });

  test('should manage focus and active state in the mobile sections sheet', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterWorkstation(page);

    const moreButton = page.getByRole('button', { name: 'Open more sections' });
    await moreButton.click();

    const moreSections = page.getByRole('navigation', { name: 'More sections' });
    const roadmapsButton = moreSections.getByRole('button', { name: 'Roadmaps' });
    await expect(moreSections).toBeVisible();
    await expect(roadmapsButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(moreSections).not.toBeVisible();
    await expect(moreButton).toBeFocused();

    await moreButton.click();
    await roadmapsButton.click();
    await expect(moreSections).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open more sections, current section: Roadmaps' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Open more sections, current section: Roadmaps' }).click();
    await expect(moreSections.getByRole('button', { name: 'Roadmaps' })).toBeFocused();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(moreSections).not.toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(moreSections).not.toBeVisible();
  });

  test('should show and recover from a failed Time feed request', async ({ page }) => {
    await enterWorkstation(page);
    let attempts = 0;
    let failTimeFeed = true;
    await page.route('**/api/v1/time**', async (route) => {
      attempts += 1;
      if (failTimeFeed) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { message: 'Time feed unavailable' } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { now: [], next: [], upcoming: [] }         }),
      });
    });
    await page.locator('aside nav button:has-text("Time")').click({ force: true });

    const failure = page.locator('[role="alert"]').filter({ hasText: 'Time feed unavailable' });
    await expect(failure).toContainText('Time feed unavailable');
    failTimeFeed = false;
    await failure.getByRole('button', { name: 'Retry' }).click();
    await expect(failure).not.toBeVisible();
    expect(attempts).toBeGreaterThanOrEqual(2);
  });

  test('should keep a task form open and show an API error when task creation fails', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/tasks', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Task title is invalid' } }),
      });
    });
    await page.locator('aside nav button:has-text("Tasks")').click({ force: true });
    await page.getByRole('button', { name: 'New Task' }).click();

    const taskTitle = 'Preserve task form on failure';
    await page.getByPlaceholder(/Task Title/i).fill(taskTitle);
    await page.getByRole('button', { name: 'Save Task' }).click();

    await expect(page.getByRole('alert').filter({ hasText: /^Task title is invalid$/ })).toBeVisible();
    await expect(page.getByPlaceholder(/Task Title/i)).toHaveValue(taskTitle);
    await expect(page.getByRole('button', { name: 'Save Task' })).toBeVisible();
  });

  test('should keep a goal form open and show an API error when goal creation fails', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/goals', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Goal title is invalid' } }),
      });
    });
    await page.locator('aside nav button:has-text("Goals")').click({ force: true });
    await page.getByRole('button', { name: 'New Goal' }).first().click();

    const goalTitle = 'Preserve goal form on failure';
    await page.getByPlaceholder(/Become a Senior Forward Deployed Engineer/i).fill(goalTitle);
    await page.getByRole('button', { name: 'Save Goal' }).click();

    await expect(page.getByRole('alert').filter({ hasText: /^Goal title is invalid$/ })).toBeVisible();
    await expect(page.getByPlaceholder(/Become a Senior Forward Deployed Engineer/i)).toHaveValue(goalTitle);
    await expect(page.getByRole('button', { name: 'Save Goal' })).toBeVisible();
  });

  test('should keep quick capture content and show an API error when saving fails', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/notes', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { message: 'Note service unavailable' } }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });
    await page.getByRole('button', { name: /Quick Capture/i }).click();

    const capturedText = 'Keep this capture when saving fails';
    await page.getByPlaceholder(/Paste text, job description/i).fill(capturedText);
    await page.getByRole('button', { name: 'Save Capture' }).click();

    await expect(page.locator('[role="alert"]').filter({ hasText: 'Note service unavailable' })).toBeVisible();
    await expect(page.getByPlaceholder(/Paste text, job description/i)).toHaveValue(capturedText);
  });

  test('should not optimistically star a message when the update fails', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/messages**', async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { message: 'Message service unavailable' } }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{
            id: 'e2e-message-id',
            userId: 'e2e-user-id',
            source: 'WHATSAPP',
            sender: 'E2E sender',
            content: 'Message whose star action fails',
            metadata: '{}',
            isArchived: false,
            isStarred: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        }),
      });
    });
    await page.locator('aside nav button:has-text("Messages")').click({ force: true });
    const starButton = page.getByTitle('Star message');
    await expect(starButton).toBeVisible();
    await starButton.click();

    await expect(page.getByRole('alert').filter({ hasText: /^Message service unavailable$/ })).toBeVisible();
    await expect(page.getByTitle('Star message')).toBeVisible();
  });

  test('should offer in-app navigation after converting a message to a task', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/messages**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [{
              id: 'convertible-message',
              userId: 'e2e-user-id',
              source: 'WHATSAPP',
              sender: 'E2E sender',
              content: 'Prepare release checklist',
              metadata: '{}',
              isArchived: false,
              isStarred: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }],
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { createdEntity: { id: 'created-task' } } }),
      });
    });

    await page.locator('aside nav button:has-text("Messages")').click({ force: true });
    await page.getByTitle('Create an actionable task from this message').click();

    await expect(page.getByRole('status').filter({ hasText: 'Message converted to a task.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View tasks' })).toBeVisible();
    await expect(page.getByText('Converted to TASK')).toBeVisible();
  });

  test('should report command palette search errors', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/search**', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Search service unavailable' } }),
      });
    });
    await page.getByRole('button', { name: /Search NOX/i }).click();
    const searchInput = page.getByPlaceholder(/Search goals, tasks, events/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('roadmap query');

    await expect(page.getByRole('alert').filter({ hasText: /^Search service unavailable$/ })).toBeVisible();
  });

  test('should not report profile save success when the API rejects the update', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await enterWorkstation(page);
    await page.route('**/api/v1/auth/profile', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Profile service unavailable' } }),
      });
    });
    await page.locator('button[title="User Control Center & Settings"]').click();
    await page.getByRole('button', { name: 'Profile & Identity' }).click();
    await page.getByPlaceholder('Enter display name').fill('Uncommitted profile name');
    await page.getByRole('button', { name: 'Save Profile Changes' }).click();

    await expect(page.getByRole('alert').filter({ hasText: /^Profile service unavailable$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Profile Changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: '✓ Saved Profile' })).not.toBeVisible();
  });

  test('should show Council bot mutation failures in the workspace', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/council/bots', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [{ id: 'bot-1', name: 'Test Bot', role: 'Assistant', avatar: '🤖' }],
        }),
      });
    });
    await page.route('**/api/v1/council/bots/bot-1/duplicate', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Bot service unavailable' } }),
      });
    });

    await page.locator('aside nav button:has-text("Council")').first().click({ force: true });
    await page.getByRole('button', { name: /My Bots/i }).click();
    await page.getByTitle('Duplicate Bot').click();

    await expect(page.getByRole('alert').filter({ hasText: /^Bot service unavailable$/ })).toBeVisible();
  });

  test('should keep Council loading errors visible outside Chat Studio', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/council/bots', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: { message: 'Council bots unavailable' } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.locator('aside nav button:has-text("Council")').first().click({ force: true });
    await page.getByRole('button', { name: /My Bots/i }).click();

    await expect(page.getByRole('alert').filter({ hasText: /Council bots unavailable/ })).toBeVisible();
  });

  test('should use an accessible confirmation before deleting a Council bot', async ({ page }) => {
    let deleteRequested = false;
    await enterWorkstation(page);
    await page.route('**/api/v1/council/bots', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [{ id: 'bot-1', name: 'Custom Test Bot', role: 'Assistant', avatar: '🤖', isDefault: false }],
          }),
        });
        return;
      }
      await route.continue();
    });
    await page.route('**/api/v1/council/bots/bot-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteRequested = true;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'deleted' }),
      });
    });

    await page.locator('aside nav button:has-text("Council")').first().click({ force: true });
    await page.getByRole('button', { name: /My Bots/i }).click();
    await page.getByTitle('Delete Bot').click();

    const confirmation = page.getByRole('dialog', { name: 'Delete Custom Test Bot?' });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmation).not.toBeVisible();
    expect(deleteRequested).toBe(false);
  });

  test('should preserve a manual roadmap form when the atomic create request fails', async ({ page }) => {
    await enterWorkstation(page);
    await page.route('**/api/v1/roadmaps/import', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: { message: 'Roadmap plan is invalid' } }),
      });
    });
    await page.locator('aside nav button:has-text("Roadmaps")').first().click({ force: true });
    await page.getByRole('button', { name: /New Roadmap/i }).first().click();
    await page.getByPlaceholder(/FDE Foundation & Agent Systems/i).fill('Atomic roadmap creation');
    await page.getByPlaceholder(/Phase 1 title/i).fill('Core foundations');
    await page.getByRole('button', { name: 'Create Roadmap' }).click();

    await expect(page.getByText('Roadmap plan is invalid', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/FDE Foundation & Agent Systems/i)).toHaveValue('Atomic roadmap creation');
    await expect(page.getByPlaceholder(/Phase 1 title/i)).toHaveValue('Core foundations');
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
