import { defineConfig, devices } from '@playwright/test';

const isCi = process.env.CI !== undefined && process.env.CI !== '';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi === true ? 2 : 0,
  workers: isCi === true ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'aube run build && aube run preview',
    port: 5173,
    reuseExistingServer: isCi === false,
  },
});
