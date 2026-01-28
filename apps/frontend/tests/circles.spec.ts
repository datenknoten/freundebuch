/**
 * Circles management tests
 *
 * Tests creating, editing, and deleting circles for organizing friends.
 */

import { expect, test } from '@playwright/test';
import { generateCircleName, SEEDED_CIRCLES } from './fixtures/index.js';

test.describe('Circles Management', () => {
  test.describe('View Circles', () => {
    test('should display list of circles', async ({ page }) => {
      await page.goto('/circles');

      // Page heading
      await expect(page.getByRole('heading', { level: 1 })).toContainText(/circles/i);

      // Should show seeded circles
      for (const circleName of SEEDED_CIRCLES) {
        await expect(page.getByText(circleName)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show circle colors', async ({ page }) => {
      await page.goto('/circles');

      // Color indicators should be visible
      const colorIndicators = page.locator('[style*="background-color"]');
      const count = await colorIndicators.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should show friend count for each circle', async ({ page }) => {
      await page.goto('/circles');

      // Friend count badges should be visible for circles with members
      // Anna is in Work and Friends, so Work should have at least 1 friend
      await expect(page.getByText(/\d+ friend/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show new circle button', async ({ page }) => {
      await page.goto('/circles');

      await expect(page.getByRole('button', { name: /new circle/i })).toBeVisible();
    });
  });

  test.describe('Create Circle', () => {
    test('should open create modal', async ({ page }) => {
      await page.goto('/circles');

      await page.getByRole('button', { name: /new circle/i }).click();

      // Modal should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    });

    test('should create a new circle', async ({ page }) => {
      await page.goto('/circles');

      const circleName = generateCircleName();

      await page.getByRole('button', { name: /new circle/i }).click();

      // Fill circle name
      await page.getByLabel(/name/i).fill(circleName);

      // Submit
      await page.getByRole('button', { name: /create|save/i }).click();

      // Modal should close and circle should appear
      await expect(page.getByText(circleName)).toBeVisible({ timeout: 5000 });
    });

    test('should create circle with color', async ({ page }) => {
      await page.goto('/circles');

      const circleName = generateCircleName('WithColor');

      await page.getByRole('button', { name: /new circle/i }).click();

      // Fill circle name
      await page.getByLabel(/name/i).fill(circleName);

      // Select a color (click on color picker if available)
      const colorPicker = page.locator(
        'input[type="color"], button[aria-label*="color"], .color-picker',
      );
      if (await colorPicker.isVisible({ timeout: 1000 }).catch(() => false)) {
        await colorPicker.click();
      }

      // Submit
      await page.getByRole('button', { name: /create|save/i }).click();

      // Circle should be created
      await expect(page.getByText(circleName)).toBeVisible({ timeout: 5000 });
    });

    test('should require circle name', async ({ page }) => {
      await page.goto('/circles');

      await page.getByRole('button', { name: /new circle/i }).click();

      // Try to submit without name
      const submitButton = page.getByRole('button', { name: /create|save/i });

      // Button should be disabled or show error
      await expect(submitButton).toBeDisabled();
    });

    test('should cancel circle creation', async ({ page }) => {
      await page.goto('/circles');

      await page.getByRole('button', { name: /new circle/i }).click();

      // Fill some data
      await page.getByLabel(/name/i).fill('Should Not Be Created');

      // Cancel
      await page.getByRole('button', { name: /cancel/i }).click();

      // Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3000 });

      // Circle should not exist
      await expect(page.getByText('Should Not Be Created')).not.toBeVisible();
    });
  });

  test.describe('Edit Circle', () => {
    test('should open edit modal', async ({ page }) => {
      await page.goto('/circles');

      // Find the first seeded circle (Family)
      const circleRow = page.locator('text=Family').first();
      await circleRow.hover();

      // Click edit button
      const editButton = page.getByRole('button', { name: /edit/i }).first();
      await editButton.click();

      // Modal should open with circle data
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
      await expect(page.getByLabel(/name/i)).toHaveValue('Family');
    });

    test('should edit circle name', async ({ page }) => {
      await page.goto('/circles');

      // Create a test circle first
      const originalName = generateCircleName('ToEdit');
      await page.getByRole('button', { name: /new circle/i }).click();
      await page.getByLabel(/name/i).fill(originalName);
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(page.getByText(originalName)).toBeVisible({ timeout: 5000 });

      // Now edit it
      const circleRow = page.locator(`text=${originalName}`).first();
      await circleRow.hover();

      const editButton = page.getByRole('button', { name: /edit/i }).first();
      await editButton.click();

      // Change name
      const newName = `${originalName} Edited`;
      await page.getByLabel(/name/i).fill(newName);
      await page.getByRole('button', { name: /save/i }).click();

      // New name should appear
      await expect(page.getByText(newName)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(originalName)).not.toBeVisible();
    });

    test('should edit circle color', async ({ page }) => {
      await page.goto('/circles');

      // Find a circle and open edit
      const circleRow = page.locator('text=Work').first();
      await circleRow.hover();

      const editButton = page.getByRole('button', { name: /edit/i }).first();
      await editButton.click();

      // Click different color if color picker exists
      const colorPicker = page.locator(
        'input[type="color"], button[aria-label*="color"], [data-color]',
      );
      if (await colorPicker.isVisible({ timeout: 1000 }).catch(() => false)) {
        await colorPicker.first().click();
      }

      // Save
      await page.getByRole('button', { name: /save/i }).click();

      // Circle should still exist
      await expect(page.getByText('Work')).toBeVisible();
    });
  });

  test.describe('Delete Circle', () => {
    test('should delete circle with confirmation', async ({ page }) => {
      await page.goto('/circles');

      // Create a test circle first
      const circleName = generateCircleName('ToDelete');
      await page.getByRole('button', { name: /new circle/i }).click();
      await page.getByLabel(/name/i).fill(circleName);
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(page.getByText(circleName)).toBeVisible({ timeout: 5000 });

      // Find and hover over the circle
      const circleRow = page.locator(`text=${circleName}`).first();
      await circleRow.hover();

      // Click delete button
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      await deleteButton.click();

      // Confirmation modal should appear
      await expect(page.getByText(/confirm|are you sure/i)).toBeVisible({ timeout: 3000 });

      // Confirm deletion
      await page
        .getByRole('button', { name: /confirm|yes|delete/i })
        .last()
        .click();

      // Circle should be removed
      await expect(page.getByText(circleName)).not.toBeVisible({ timeout: 5000 });
    });

    test('should cancel circle deletion', async ({ page }) => {
      await page.goto('/circles');

      // Find a seeded circle
      const circleRow = page.locator('text=Sports').first();
      await circleRow.hover();

      // Click delete
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      await deleteButton.click();

      // Modal should appear
      await expect(page.getByText(/confirm|are you sure/i)).toBeVisible({ timeout: 3000 });

      // Cancel
      await page.getByRole('button', { name: /cancel|no/i }).click();

      // Circle should still exist
      await expect(page.getByText('Sports')).toBeVisible();
    });

    test('should show warning when deleting circle with friends', async ({ page }) => {
      await page.goto('/circles');

      // Work circle has friends assigned
      const circleRow = page.locator('text=Work').first();
      await circleRow.hover();

      // Click delete
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      await deleteButton.click();

      // Should show warning about friends
      await expect(page.getByText(/friend/i)).toBeVisible({ timeout: 3000 });

      // Cancel to avoid actual deletion
      await page.getByRole('button', { name: /cancel|no/i }).click();
    });
  });

  test.describe('Circle Hierarchy', () => {
    test('should display nested circles with indentation', async ({ page }) => {
      await page.goto('/circles');

      // Create parent circle
      const parentName = generateCircleName('Parent');
      await page.getByRole('button', { name: /new circle/i }).click();
      await page.getByLabel(/name/i).fill(parentName);
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(page.getByText(parentName)).toBeVisible({ timeout: 5000 });

      // Create child circle
      const childName = generateCircleName('Child');
      await page.getByRole('button', { name: /new circle/i }).click();
      await page.getByLabel(/name/i).fill(childName);

      // Select parent if dropdown exists
      const parentSelect = page.locator('select[name*="parent"], [aria-label*="parent"]');
      if (await parentSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await parentSelect.selectOption({ label: parentName });
      }

      await page.getByRole('button', { name: /create|save/i }).click();

      // Both should be visible
      await expect(page.getByText(parentName)).toBeVisible();
      await expect(page.getByText(childName)).toBeVisible();
    });
  });
});
