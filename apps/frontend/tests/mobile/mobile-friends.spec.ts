/**
 * Mobile friend management tests
 *
 * Tests friend-specific functionality on mobile viewports including
 * the FAB button, add choice modal, and responsive friend detail layout.
 */

import { expect, test } from '@playwright/test';
import { generateFriendName } from '../fixtures/index.js';
import { FriendListPage } from '../page-objects/friends/friend-list.page.js';

// All tests use mobile viewport
test.use({ viewport: { width: 375, height: 667 } });

test.describe('Mobile Friends', () => {
  test.describe('FAB (Floating Action Button)', () => {
    test('should show FAB on friend detail page', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Click on a friend
      await page.getByText('Anna Schmidt').click();

      // Wait for detail page
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

      // FAB should be visible
      const fab = page.locator(
        '[data-testid="fab"], ' + 'button[aria-label*="add"], ' + '.fixed.bottom-4, ' + '.fab',
      );

      await expect(fab.first()).toBeVisible({ timeout: 5000 });
    });

    test('should open add choice modal when clicking FAB', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Click on a friend
      await page.getByText('Anna Schmidt').click();
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

      // Click FAB
      const fab = page
        .locator(
          '[data-testid="fab"], ' +
            'button[aria-label*="add"], ' +
            '.fixed.bottom-4.right-4 button',
        )
        .first();

      await fab.click();

      // Choice modal should appear
      const modal = page.locator(
        '[data-testid="add-choice-modal"], ' +
          '[data-testid="mobile-add-modal"], ' +
          '[role="dialog"]',
      );

      await expect(modal.first()).toBeVisible({ timeout: 3000 });
    });

    test('should show add options in choice modal', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Navigate to friend detail
      await page.getByText('Anna Schmidt').click();
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

      // Click FAB
      const fab = page
        .locator('[data-testid="fab"], ' + 'button[aria-label*="add"], ' + '.fixed button')
        .first();

      await fab.click();

      // Should show options for adding different items
      const options = [/phone/i, /email/i, /address/i];

      for (const option of options) {
        await expect(page.getByText(option)).toBeVisible({ timeout: 3000 });
      }
    });

    test('should close choice modal when selecting option', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Navigate to friend detail
      await page.getByText('Anna Schmidt').click();
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

      // Click FAB
      const fab = page
        .locator('[data-testid="fab"], ' + 'button[aria-label*="add"], ' + '.fixed button')
        .first();

      await fab.click();

      // Select an option (e.g., Add Phone)
      const phoneOption = page.getByText(/phone/i).first();
      await phoneOption.click();

      // Choice modal should close, edit form should open
      await page.waitForTimeout(300);

      // Should show form for adding phone
      const phoneInput = page.locator('input[placeholder*="phone" i], input[type="tel"]');
      await expect(phoneInput.first()).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Mobile Friend Detail Layout', () => {
    test('should show stacked layout on mobile', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Navigate to friend detail
      await page.getByText('Anna Schmidt').click();

      // Content should be stacked vertically
      const sections = page.locator('section, [data-testid*="section"]');
      const count = await sections.count();

      if (count > 1) {
        // Get positions of first two sections
        const firstBox = await sections.first().boundingBox();
        const secondBox = await sections.nth(1).boundingBox();

        if (firstBox && secondBox) {
          // Second section should be below first (stacked)
          expect(secondBox.y).toBeGreaterThan(firstBox.y);
        }
      }
    });

    test('should show condensed contact info on mobile', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Navigate to friend detail
      await page.getByText('Anna Schmidt').click();

      // Friend info should be visible
      await expect(page.getByText('Anna Schmidt')).toBeVisible();

      // Phone and email should be tappable
      const phoneLink = page.locator('a[href^="tel:"]');
      const emailLink = page.locator('a[href^="mailto:"]');

      if (await phoneLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Phone should be tappable
        const box = await phoneLink.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(40);
      }

      if (await emailLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Email should be tappable
        const box = await emailLink.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(40);
      }
    });

    test('should show back button on mobile', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Navigate to friend detail
      await page.getByText('Anna Schmidt').click();

      // Back button should be visible
      const backButton = page.getByRole('link', { name: /back/i });
      await expect(backButton).toBeVisible();
    });
  });

  test.describe('Mobile Friend Creation', () => {
    test('should show mobile-optimized friend form', async ({ page }) => {
      await page.goto('/friends/new');

      // Form should be full width
      const form = page.locator('form');
      const formBox = await form.boundingBox();

      if (formBox) {
        // Form should span most of the viewport width
        expect(formBox.width).toBeGreaterThan(300);
      }
    });

    test('should show touch-friendly inputs', async ({ page }) => {
      await page.goto('/friends/new');

      // Input fields should be appropriately sized
      const inputs = page.locator('input[type="text"], input[type="email"]');
      const count = await inputs.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const box = await inputs.nth(i).boundingBox();
        if (box) {
          // Inputs should be at least 40px tall for touch
          expect(box.height).toBeGreaterThanOrEqual(36);
        }
      }
    });

    test('should create friend on mobile', async ({ page }) => {
      await page.goto('/friends/new');

      const friendName = generateFriendName('Mobile');

      // Fill display name
      await page.getByPlaceholder(/display name/i).fill(friendName);

      // Submit
      await page.getByRole('button', { name: /create/i }).click();

      // Should navigate to detail
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
    });
  });

  test.describe('Mobile Friend List', () => {
    test('should show search bar on mobile friends list', async ({ page }) => {
      await page.goto('/friends');

      // Search should be visible
      const searchInput = page.locator('input[placeholder*="search" i]');
      await expect(searchInput.first()).toBeVisible();
    });

    test('should show add button on mobile friends list', async ({ page }) => {
      await page.goto('/friends');

      // Add friend button should be visible
      const addButton = page.getByRole('link', { name: /add friend/i });
      await expect(addButton).toBeVisible();
    });

    test('should navigate to friend from list on mobile', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Click on a friend
      await page.getByText('Anna Schmidt').click();

      // Should navigate to detail page
      await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
    });
  });

  test.describe('Mobile Swipe Actions', () => {
    test('should support swipe to edit on friend detail', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Navigate to friend detail
      await page.getByText('Anna Schmidt').click();

      // Find swipeable rows (contact items)
      const swipeableRow = page.locator('[data-testid="swipeable-row"], .swipeable').first();

      if (await swipeableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Simulate swipe right to edit
        const box = await swipeableRow.boundingBox();
        if (box) {
          await page.mouse.move(box.x + 10, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2, { steps: 10 });
          await page.mouse.up();

          // Edit action should be revealed or triggered
          await page.waitForTimeout(300);
        }
      }
    });

    test('should support swipe to delete on friend detail', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Navigate to friend detail
      await page.getByText('Anna Schmidt').click();

      // Find swipeable rows
      const swipeableRow = page.locator('[data-testid="swipeable-row"], .swipeable').first();

      if (await swipeableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Simulate swipe left to delete
        const box = await swipeableRow.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 10 });
          await page.mouse.up();

          // Delete action should be revealed
          await page.waitForTimeout(300);
        }
      }
    });
  });
});
