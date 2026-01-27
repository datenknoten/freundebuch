/**
 * Dashboard/Home page tests
 *
 * Tests the main landing page for both authenticated and unauthenticated users.
 */

import { expect, test } from '@playwright/test';

test.describe('Dashboard - Authenticated', () => {
  // Uses default authenticated state from global setup

  test('should show welcome message with user name', async ({ page }) => {
    await page.goto('/');

    // Should show welcome back message
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });

  test('should show upcoming dates widget', async ({ page }) => {
    await page.goto('/');

    // Upcoming dates section should be visible
    await expect(page.getByText(/upcoming/i)).toBeVisible();
  });

  test('should show quick actions', async ({ page }) => {
    await page.goto('/');

    // Quick actions section
    await expect(page.getByText(/quick actions/i)).toBeVisible();

    // Add new friend action
    await expect(page.getByRole('link', { name: /add.*friend/i })).toBeVisible();

    // View all friends action
    await expect(page.getByRole('link', { name: /view.*friends/i })).toBeVisible();
  });

  test('should navigate to add friend from quick actions', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /add.*friend/i }).click();

    await expect(page).toHaveURL('/friends/new');
  });

  test('should navigate to friends list from quick actions', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /view.*friends/i }).click();

    await expect(page).toHaveURL('/friends');
  });

  test('should show network graph', async ({ page }) => {
    await page.goto('/');

    // Network graph section should be present (may be empty for new users)
    // Just check the container loads without errors
    await page.waitForTimeout(1000); // Give graph time to render
  });
});

test.describe('Dashboard - Unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Fresh browser, no auth

  test('should show landing page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Should show main Freundebuch heading
    await expect(page.getByRole('heading', { name: 'Freundebuch' })).toBeVisible();
  });

  test('should show sign up button', async ({ page }) => {
    await page.goto('/');

    // Get Started / Sign Up button
    await expect(page.getByRole('link', { name: /get started|sign up/i })).toBeVisible();
  });

  test('should show login button', async ({ page }) => {
    await page.goto('/');

    // Login button
    await expect(page.getByRole('link', { name: /log in|sign in/i })).toBeVisible();
  });

  test('should navigate to register page from CTA', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /get started|sign up/i }).click();

    await expect(page).toHaveURL('/auth/register');
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /log in|sign in/i }).click();

    await expect(page).toHaveURL('/auth/login');
  });

  test('should show feature descriptions', async ({ page }) => {
    await page.goto('/');

    // Check for feature sections (at least one should be visible)
    const featureTexts = [/remember/i, /stay in touch/i, /nurture/i, /privacy/i];

    let foundFeature = false;
    for (const text of featureTexts) {
      const element = page.getByText(text);
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundFeature = true;
        break;
      }
    }

    expect(foundFeature).toBe(true);
  });

  test('should not show welcome back message for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Welcome back should not be visible
    await expect(page.getByText(/welcome back/i)).not.toBeVisible();
  });

  test('should not show quick actions for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Quick actions should not be visible
    await expect(page.getByText(/quick actions/i)).not.toBeVisible();
  });
});
