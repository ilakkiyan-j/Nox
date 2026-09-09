import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      // In CI, run the pre-built API; locally use dev server
      command: isCI
        ? 'node ../../apps/api/dist/main.js'
        : 'npm run dev:api',
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: !isCI,
      cwd: isCI ? '.' : '../../',
      timeout: 120 * 1000,
      env: {
        PORT: '4000',
        NODE_ENV: 'test',
        DATABASE_URL: process.env.DATABASE_URL || 'postgresql://nox:nox@localhost:5432/noxdb?sslmode=disable',
      },
    },
    {
      // In CI, run the pre-built Next.js app; locally use dev server
      command: isCI
        ? 'npx next start -p 3000'
        : 'npm run dev:web',
      url: 'http://localhost:3000',
      reuseExistingServer: !isCI,
      cwd: isCI ? '.' : '../../',
      timeout: 120 * 1000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

