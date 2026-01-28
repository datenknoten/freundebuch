/**
 * Authentication fixtures and helpers for E2E tests
 */

import { expect, type Page } from '@playwright/test';

// Test user credentials (must match seed script)
export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123',
};

export const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demopassword123',
};

// Storage state path for authenticated tests
export const AUTH_STATE_PATH = 'tests/.auth/user.json';

/**
 * Log in a user via the UI
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard or friends
  await expect(page).toHaveURL(/\/(friends|dashboard|onboarding)/);
}

/**
 * Log in with the demo user
 */
export async function loginAsDemo(page: Page): Promise<void> {
  await login(page, DEMO_USER.email, DEMO_USER.password);
}

/**
 * Log in with the test user
 */
export async function loginAsTest(page: Page): Promise<void> {
  await login(page, TEST_USER.email, TEST_USER.password);
}

/**
 * Register a new user via the UI
 */
export async function register(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/auth/register');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByLabel(/I agree to the/).check();
  await page.getByRole('button', { name: 'Create account' }).click();

  // Wait for redirect to onboarding (new users must complete onboarding)
  await expect(page).toHaveURL(/\/onboarding/);
}

/**
 * Log out the current user via UI
 */
export async function logout(page: Page): Promise<void> {
  // Click on user menu/avatar
  await page.getByRole('button', { name: /profile|user|account/i }).click();
  await page.getByRole('menuitem', { name: /log ?out|sign ?out/i }).click();

  // Wait for redirect to home or login
  await expect(page).toHaveURL(/\/(auth\/login)?$/);
}

/**
 * Generate a unique email for test isolation
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test_${timestamp}_${random}@example.com`;
}

/**
 * Check if user is logged in by looking for auth indicators
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Look for common auth indicators (profile link, logout button, etc.)
    const authIndicator = page.locator(
      '[data-testid="user-menu"], [aria-label*="profile"], [aria-label*="account"]',
    );
    return await authIndicator.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Ensure user is on the friends list (authenticated area)
 */
export async function ensureAuthenticated(page: Page): Promise<void> {
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    await loginAsDemo(page);
  }
}
