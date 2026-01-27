/**
 * Onboarding flow tests
 *
 * Tests the onboarding process for new users who haven't completed
 * their self-profile setup yet.
 */

import { expect, test } from '@playwright/test';
import { generateTestEmail } from './fixtures/index.js';

test.describe('Onboarding Flow', () => {
  test.describe('New User Onboarding', () => {
    test.use({ storageState: { cookies: [], origins: [] } }); // Fresh browser, no auth

    test('should redirect new user to onboarding after registration', async ({ page }) => {
      const testEmail = generateTestEmail();
      const testPassword = 'testpassword123';

      // Register new user
      await page.goto('/auth/register');
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm password').fill(testPassword);
      await page.getByLabel(/I agree to the/).check();
      await page.getByRole('button', { name: 'Create account' }).click();

      // Should redirect to onboarding
      await expect(page).toHaveURL(/\/onboarding/);

      // Check onboarding page content
      await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();
      await expect(page.getByText(/first entry in your friendbook is you/i)).toBeVisible();
    });

    test('should complete onboarding with self-profile', async ({ page }) => {
      const testEmail = generateTestEmail();
      const testPassword = 'testpassword123';

      // Register new user
      await page.goto('/auth/register');
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm password').fill(testPassword);
      await page.getByLabel(/I agree to the/).check();
      await page.getByRole('button', { name: 'Create account' }).click();

      // Wait for onboarding page
      await expect(page).toHaveURL(/\/onboarding/);

      // Fill in self-profile
      await page.getByPlaceholder(/first name/i).fill('Test');
      await page.getByPlaceholder(/last name/i).fill('User');

      // Display name should auto-populate
      await expect(page.getByPlaceholder(/display name/i)).toHaveValue('Test User');

      // Complete setup
      await page.getByRole('button', { name: /complete setup/i }).click();

      // Should redirect to friends list after completing onboarding
      await expect(page).toHaveURL(/\/friends/);
    });

    test('should require display name for onboarding', async ({ page }) => {
      const testEmail = generateTestEmail();
      const testPassword = 'testpassword123';

      // Register new user
      await page.goto('/auth/register');
      await page.getByLabel('Email address').fill(testEmail);
      await page.getByLabel('Password', { exact: true }).fill(testPassword);
      await page.getByLabel('Confirm password').fill(testPassword);
      await page.getByLabel(/I agree to the/).check();
      await page.getByRole('button', { name: 'Create account' }).click();

      // Wait for onboarding page
      await expect(page).toHaveURL(/\/onboarding/);

      // Try to submit without filling anything
      const submitButton = page.getByRole('button', { name: /complete setup/i });

      // Button should be disabled when display name is empty
      await expect(submitButton).toBeDisabled();
    });
  });

  test.describe('Completed User Redirect', () => {
    // This uses the default authenticated state (user has completed onboarding)

    test('should redirect completed user away from onboarding to friends', async ({ page }) => {
      // Try to access onboarding directly
      await page.goto('/onboarding');

      // Should redirect to friends since onboarding is complete
      await expect(page).toHaveURL(/\/friends/);
    });
  });
});
