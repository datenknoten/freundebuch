/**
 * Friend CRUD (Create, Read, Update, Delete) tests
 *
 * Tests basic friend management operations.
 */

import { expect, test } from '@playwright/test';
import { generateFriendName } from '../fixtures/index.js';
import { FriendDetailPage } from '../page-objects/friends/friend-detail.page.js';
import { FriendFormPage } from '../page-objects/friends/friend-form.page.js';
import { FriendListPage } from '../page-objects/friends/friend-list.page.js';

test.describe('Friend CRUD Operations', () => {
  test.describe('Create Friend', () => {
    test('should create friend with minimal data (just display name)', async ({ page }) => {
      const friendForm = new FriendFormPage(page);
      const friendName = generateFriendName('Minimal');

      await friendForm.gotoNew();
      await friendForm.fillDisplayName(friendName);
      await friendForm.submit();

      // Should navigate to friend detail page
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

      // Friend name should be visible in heading
      await expect(page.getByRole('heading', { name: friendName })).toBeVisible();
    });

    test('should create friend with full name parts', async ({ page }) => {
      const friendForm = new FriendFormPage(page);
      const timestamp = Date.now();

      await friendForm.gotoNew();

      // Fill name parts
      await friendForm.fillNameParts({
        prefix: 'Dr.',
        first: `TestFirst${timestamp}`,
        middle: 'Middle',
        last: `TestLast${timestamp}`,
        suffix: 'PhD',
      });

      // Trigger blur to ensure auto-generation happens
      await page.keyboard.press('Tab');
      await page.waitForTimeout(500);

      // Display name should auto-generate (or we fill it manually if not)
      const displayNameInput = page.getByPlaceholder(/display name/i);
      const currentValue = await displayNameInput.inputValue();
      if (!currentValue) {
        // Auto-generation didn't happen, fill manually
        await displayNameInput.fill(`Dr. TestFirst${timestamp} Middle TestLast${timestamp} PhD`);
      }

      await friendForm.submit();

      // Should navigate to friend detail page
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
    });

    test('should create friend with nickname and maiden name', async ({ page }) => {
      const friendForm = new FriendFormPage(page);
      const friendName = generateFriendName('WithNickname');

      await friendForm.gotoNew();
      await friendForm.fillDisplayName(friendName);
      await friendForm.fillNameParts({
        first: 'Sarah',
        last: 'Johnson',
        maiden: 'Smith',
        nickname: 'Sally',
      });
      await friendForm.submit();

      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
    });

    test('should require display name', async ({ page }) => {
      const friendForm = new FriendFormPage(page);

      await friendForm.gotoNew();

      // Submit button should be disabled without display name
      await expect(friendForm.submitButton).toBeDisabled();
    });

    test('should navigate back to list on cancel', async ({ page }) => {
      const friendForm = new FriendFormPage(page);

      await friendForm.gotoNew();
      await friendForm.cancel();

      await expect(page).toHaveURL('/friends');
    });
  });

  test.describe('View Friend', () => {
    let createdFriendId: string;
    const viewFriendName = generateFriendName('ViewTest');

    test.beforeAll(async ({ browser }) => {
      // Create a friend to use in view tests
      const context = await browser.newContext({
        storageState: 'tests/.auth/user.json',
      });
      const page = await context.newPage();

      const friendForm = new FriendFormPage(page);
      await friendForm.gotoNew();
      await friendForm.fillDisplayName(viewFriendName);
      await friendForm.submit();

      // Must be a UUID-like ID, not "new"
      await expect(page).toHaveURL(/\/friends\/(?!new$)[a-zA-Z0-9-]{8,}$/);
      createdFriendId = page.url().split('/friends/')[1];

      await context.close();
    });

    test('should view friend details', async ({ page }) => {
      await page.goto(`/friends/${createdFriendId}`);

      // Should show friend name in heading
      await expect(page.getByRole('heading', { name: viewFriendName })).toBeVisible();
    });

    test('should show back link to friends list', async ({ page }) => {
      await page.goto(`/friends/${createdFriendId}`);

      // Back link should be visible (use URL-based locator for i18n)
      const backLink = page.locator('a[href="/friends"]').first();
      await expect(backLink).toBeVisible();

      // Click back
      await backLink.click();
      await expect(page).toHaveURL('/friends');
    });

    test('should show friend not found for invalid ID', async ({ page }) => {
      await page.goto('/friends/invalid-id-that-does-not-exist');

      // Should show error state (handle EN and DE)
      await expect(page.getByText(/not found|error|nicht gefunden|fehler/i)).toBeVisible();
    });
  });

  test.describe('Edit Friend', () => {
    let createdFriendId: string;
    const friendName = generateFriendName('ToEdit');

    test.beforeEach(async ({ page }) => {
      // Create a friend first
      const friendForm = new FriendFormPage(page);
      await friendForm.gotoNew();
      await friendForm.fillDisplayName(friendName);
      await friendForm.submit();

      // Extract friend ID from URL - must be a UUID-like ID, not "new"
      await expect(page).toHaveURL(/\/friends\/(?!new$)[a-zA-Z0-9-]{8,}$/);
      const url = page.url();
      createdFriendId = url.split('/friends/')[1];
    });

    test('should edit friend display name', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(createdFriendId);

      // Click edit button
      await friendDetail.clickEdit();

      // Should show edit form/modal
      const displayNameInput = page.getByPlaceholder(/display name/i);
      await expect(displayNameInput).toBeVisible();

      // Change the name
      const newName = `${friendName} Edited`;
      await displayNameInput.fill(newName);

      // Save
      await page.getByRole('button', { name: /save/i }).click();

      // Should redirect back to detail page with updated name in heading
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
      await expect(page.getByRole('heading', { name: newName })).toBeVisible();
    });

    test('should edit friend interests', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(createdFriendId);

      // Click edit button
      await friendDetail.clickEdit();

      // Fill interests
      const interestsInput = page.getByPlaceholder(/interests|hobbies/i);
      await interestsInput.fill('Testing, Automation, Playwright');

      // Save
      await page.getByRole('button', { name: /save/i }).click();

      // Should show updated interests
      await expect(page.getByText(/testing.*automation/i)).toBeVisible();
    });
  });

  test.describe('Delete Friend', () => {
    test('should delete friend with confirmation', async ({ page }) => {
      const friendForm = new FriendFormPage(page);
      const friendName = generateFriendName('ToDelete');

      // Create a friend first
      await friendForm.gotoNew();
      await friendForm.fillDisplayName(friendName);
      await friendForm.submit();

      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

      // Find and click delete button (handle both EN and DE)
      await page.getByRole('button', { name: /delete|löschen/i }).click();

      // Confirmation should appear - look for the h3 "Delete Friend" heading specifically
      await expect(page.getByRole('heading', { level: 3, name: /delete|löschen/i })).toBeVisible();

      // Confirm deletion (click the delete/confirm button, avoid the cancel button)
      const confirmButtons = page.getByRole('button', { name: /^delete$|^löschen$/i });
      await confirmButtons.last().click();

      // Should redirect to friends list
      await expect(page).toHaveURL('/friends');

      // Friend should no longer be visible
      await expect(page.getByText(friendName)).not.toBeVisible();
    });

    test('should cancel deletion when clicking cancel', async ({ page }) => {
      const friendForm = new FriendFormPage(page);
      const cancelFriendName = generateFriendName('CancelDelete');

      // Create a friend first
      await friendForm.gotoNew();
      await friendForm.fillDisplayName(cancelFriendName);
      await friendForm.submit();

      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

      // Click delete (handle both EN and DE)
      await page.getByRole('button', { name: /delete|löschen/i }).click();

      // Confirmation should appear - look for the h3 "Delete Friend" heading specifically
      await expect(page.getByRole('heading', { level: 3, name: /delete|löschen/i })).toBeVisible();

      // Click cancel
      await page.getByRole('button', { name: /cancel|abbrechen/i }).click();

      // Should stay on detail page
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
      await expect(page.getByRole('heading', { name: cancelFriendName })).toBeVisible();
    });
  });

  test.describe('Friend List', () => {
    test('should display list of friends', async ({ page }) => {
      const friendList = new FriendListPage(page);

      await friendList.goto();
      await friendList.waitForFriends();

      // Should have some seeded friends
      const friendCount = await friendList.getFriendCount();
      expect(friendCount).toBeGreaterThan(0);
    });

    test('should show add friend button', async ({ page }) => {
      const friendList = new FriendListPage(page);

      await friendList.goto();

      await expect(friendList.addFriendButton).toBeVisible();
    });

    test('should navigate to add friend page', async ({ page }) => {
      const friendList = new FriendListPage(page);

      await friendList.goto();
      await friendList.clickAddFriend();

      await expect(page).toHaveURL('/friends/new');
    });

    test('should click on first friend in list', async ({ page }) => {
      const friendList = new FriendListPage(page);

      await friendList.goto();
      await friendList.waitForFriends();

      // Get friend names
      const friendCount = await friendList.getFriendCount();
      expect(friendCount).toBeGreaterThan(0);

      // Click the first friend
      await friendList.friendRows.first().click();

      // Should navigate to detail page (may have ?from= query param)
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+/);
    });
  });
});
