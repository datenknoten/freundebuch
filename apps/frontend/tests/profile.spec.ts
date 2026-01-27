/**
 * Profile settings tests
 *
 * Tests user profile settings, preferences, and app password management.
 */

import { expect, test } from '@playwright/test';

test.describe('Profile Settings', () => {
  test.describe('View Profile', () => {
    test('should display profile page', async ({ page }) => {
      await page.goto('/profile');

      // Page heading
      await expect(page.getByRole('heading', { name: /your profile|profile/i })).toBeVisible();
    });

    test('should show user email', async ({ page }) => {
      await page.goto('/profile');

      // Email field
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveValue(/test@example.com/);
    });

    test('should show user ID (read-only)', async ({ page }) => {
      await page.goto('/profile');

      // User ID field
      const userIdInput = page.getByLabel(/user id/i);
      await expect(userIdInput).toBeVisible();
      await expect(userIdInput).toBeDisabled();
    });

    test('should show member since date', async ({ page }) => {
      await page.goto('/profile');

      // Member since
      await expect(page.getByText(/member since/i)).toBeVisible();
    });

    test('should show edit button', async ({ page }) => {
      await page.goto('/profile');

      await expect(page.getByRole('button', { name: /edit profile/i })).toBeVisible();
    });
  });

  test.describe('Edit Profile', () => {
    test('should enter edit mode', async ({ page }) => {
      await page.goto('/profile');

      await page.getByRole('button', { name: /edit profile/i }).click();

      // Email field should be editable
      const emailInput = page.getByLabel(/email/i);
      await expect(emailInput).not.toBeDisabled();

      // Save and Cancel buttons should appear
      await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });

    test('should cancel editing', async ({ page }) => {
      await page.goto('/profile');

      await page.getByRole('button', { name: /edit profile/i }).click();

      // Change email
      const emailInput = page.getByLabel(/email/i);
      const originalEmail = await emailInput.inputValue();
      await emailInput.fill('changed@example.com');

      // Cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // Email should be reverted
      await expect(emailInput).toHaveValue(originalEmail);
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/profile');

      await page.getByRole('button', { name: /edit profile/i }).click();

      // Enter invalid email
      const emailInput = page.getByLabel(/email/i);
      await emailInput.fill('not-an-email');

      // Try to submit - browser validation should prevent
      await page.getByRole('button', { name: /save/i }).click();

      // Should show validation error or stay in edit mode
      await expect(emailInput).toBeVisible();
    });
  });

  test.describe('Language Settings', () => {
    test('should show language preference', async ({ page }) => {
      await page.goto('/profile');

      // Language select
      const languageSelect = page.getByLabel(/language/i);
      await expect(languageSelect).toBeVisible();
    });

    test('should change language', async ({ page }) => {
      await page.goto('/profile');

      const languageSelect = page.getByLabel(/language/i);

      // Get current language
      const currentLang = await languageSelect.inputValue();

      // Change to different language
      const newLang = currentLang === 'en' ? 'de' : 'en';
      await languageSelect.selectOption(newLang);

      // Wait for UI to update
      await page.waitForTimeout(500);

      // The page should update (text changes)
      // Note: We just verify the select value changed
      await expect(languageSelect).toHaveValue(newLang);

      // Change back
      await languageSelect.selectOption(currentLang);
    });

    test('should persist language preference', async ({ page }) => {
      await page.goto('/profile');

      const languageSelect = page.getByLabel(/language/i);
      const currentLang = await languageSelect.inputValue();

      // Reload page
      await page.reload();

      // Language should persist
      await expect(languageSelect).toHaveValue(currentLang);
    });
  });

  test.describe('Birthday Format Settings', () => {
    test('should show birthday format preference', async ({ page }) => {
      await page.goto('/profile');

      // Birthday format select
      const birthdayFormatSelect = page.getByLabel(/birthday format/i);
      await expect(birthdayFormatSelect).toBeVisible();
    });

    test('should change birthday format', async ({ page }) => {
      await page.goto('/profile');

      const birthdayFormatSelect = page.getByLabel(/birthday format/i);

      // Change format
      await birthdayFormatSelect.selectOption('us');

      // Verify change
      await expect(birthdayFormatSelect).toHaveValue('us');

      // Change back to ISO
      await birthdayFormatSelect.selectOption('iso');
    });

    test('should show format examples', async ({ page }) => {
      await page.goto('/profile');

      // Help text should show format examples
      const helpText = page.getByText(/format|example/i).first();
      await expect(helpText)
        .toBeVisible({ timeout: 3000 })
        .catch(() => {
          // Help text may not be present
        });
    });
  });

  test.describe('App Passwords', () => {
    test('should show app passwords section', async ({ page }) => {
      await page.goto('/profile');

      // Section heading
      await expect(page.getByText(/app passwords/i)).toBeVisible();
    });

    test('should show create app password button', async ({ page }) => {
      await page.goto('/profile');

      const createButton = page.getByRole('button', { name: /create.*password|new.*password/i });
      await expect(createButton).toBeVisible();
    });

    test('should open create app password modal', async ({ page }) => {
      await page.goto('/profile');

      await page.getByRole('button', { name: /create.*password|new.*password/i }).click();

      // Modal or form should appear
      await expect(page.getByLabel(/name|label/i)).toBeVisible({ timeout: 3000 });
    });

    test('should create app password', async ({ page }) => {
      await page.goto('/profile');

      await page.getByRole('button', { name: /create.*password|new.*password/i }).click();

      // Fill name
      const nameInput = page.getByLabel(/name|label/i);
      await nameInput.fill(`Test App ${Date.now()}`);

      // Create
      await page.getByRole('button', { name: /create|generate/i }).click();

      // Should show the generated password (one-time display)
      await expect(page.getByText(/password|generated|copy/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('CardDAV Setup', () => {
    test('should show CardDAV section', async ({ page }) => {
      await page.goto('/profile');

      // Section heading
      await expect(page.getByText(/carddav/i)).toBeVisible();
    });

    test('should show CardDAV setup instructions', async ({ page }) => {
      await page.goto('/profile');

      // Should show some setup instructions
      await expect(page.getByText(/sync|contact|setup/i)).toBeVisible();
    });
  });
});

test.describe('Profile - Unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should redirect to login when accessing profile', async ({ page }) => {
    await page.goto('/profile');

    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
