/**
 * Global setup for Playwright tests
 *
 * This script runs once before all tests to:
 * 1. Log in as the test user
 * 2. Reset language to English for consistent test behavior
 * 3. Save the authenticated state to a file
 *
 * Authenticated tests then reuse this state for faster execution.
 */

import { chromium, type FullConfig } from '@playwright/test';
import { AUTH_STATE_PATH, TEST_USER } from './fixtures/auth.fixture.js';

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (!baseURL) {
    throw new Error('baseURL not configured in playwright.config.ts');
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login
    await page.goto(`${baseURL}/auth/login`);

    // Fill login form
    await page.locator('#email').fill(TEST_USER.email);
    await page.locator('#password').fill(TEST_USER.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for successful login (redirects away from auth pages)
    // Note: User may be redirected to home page (/), friends, dashboard, or onboarding
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 10000 });

    // If redirected to onboarding, complete it
    if (page.url().includes('/onboarding')) {
      // The test user should already have onboarding completed from seed
      // But if not, wait for redirect or handle it
      await page.waitForURL((url) => !url.pathname.includes('/onboarding'), { timeout: 10000 });
    }

    // Reset language to English for consistent test behavior
    await page.goto(`${baseURL}/profile`);
    await page.waitForLoadState('networkidle');

    // Check current language and change to English if needed
    const languageSelect = page.locator('#language');
    await languageSelect.waitFor({ state: 'visible', timeout: 5000 });
    const currentLanguage = await languageSelect.inputValue();

    if (currentLanguage !== 'en') {
      await languageSelect.selectOption('en');
      // Wait for the language change to be saved
      await page.waitForLoadState('networkidle');
      // Reload to ensure the language is applied
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('Global setup: Language reset to English');
    }

    // Save the storage state (cookies, local storage, etc.)
    await context.storageState({ path: AUTH_STATE_PATH });

    console.log('Global setup: Authentication state saved');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
