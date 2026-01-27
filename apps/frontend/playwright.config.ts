import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright configuration for Freundebuch E2E tests
 *
 * Test categories:
 * - chromium: Default desktop Chrome tests
 * - firefox: Desktop Firefox tests (local only)
 * - webkit: Desktop Safari tests (local only)
 * - mobile-chrome: Mobile Chrome (Pixel 5 viewport, local only)
 * - mobile-safari: Mobile Safari (iPhone 12 viewport, local only)
 *
 * Run specific project: npx playwright test --project=chromium
 * Run all: npx playwright test
 *
 * In CI, only chromium and auth-tests run to reduce execution time.
 * Multi-browser testing can be done locally or in a dedicated workflow.
 */

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],

  // Global setup - runs once before all tests to create authenticated state
  globalSetup: path.join(__dirname, 'tests', 'global-setup.ts'),

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // Screenshot on failure for debugging
    screenshot: 'only-on-failure',
    // Video on failure for debugging (only in CI to save space)
    video: process.env.CI ? 'on-first-retry' : 'off',
    // Reasonable timeouts
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // Expect settings
  expect: {
    timeout: 10000,
  },

  projects: [
    // ========================================================================
    // Setup project - runs global setup
    // ========================================================================
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    // ========================================================================
    // Desktop browsers - authenticated tests
    // ========================================================================
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved auth state for authenticated tests
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    // Firefox and WebKit only run locally (not in CI) to reduce execution time
    ...(isCI
      ? []
      : [
          {
            name: 'firefox',
            use: {
              ...devices['Desktop Firefox'],
              storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
          },
          {
            name: 'webkit',
            use: {
              ...devices['Desktop Safari'],
              storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
          },
        ]),

    // ========================================================================
    // Mobile viewports - authenticated tests (local only)
    // ========================================================================
    ...(isCI
      ? []
      : [
          {
            name: 'mobile-chrome',
            use: {
              ...devices['Pixel 5'],
              storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
            // Only run mobile-specific tests
            testMatch: /mobile/,
          },
          {
            name: 'mobile-safari',
            use: {
              ...devices['iPhone 12'],
              storageState: 'tests/.auth/user.json',
            },
            dependencies: ['setup'],
            // Only run mobile-specific tests
            testMatch: /mobile/,
          },
        ]),

    // ========================================================================
    // Auth tests - run WITHOUT storage state (fresh browser)
    // ========================================================================
    {
      name: 'auth-tests',
      use: {
        ...devices['Desktop Chrome'],
        // No storage state - tests unauthenticated flows
      },
      testMatch: /auth\.spec\.ts/,
    },
  ],

  // Web server configuration
  // In CI, frontend is already built in a previous step, so just run preview
  // Locally, build first then preview
  webServer: {
    command: process.env.CI ? 'pnpm run preview' : 'pnpm run build && pnpm run preview',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
