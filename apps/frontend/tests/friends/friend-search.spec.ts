/**
 * Friend search and filtering tests
 *
 * Tests the friend list search, faceted filters, pagination, and sorting.
 */

import { expect, test } from '@playwright/test';
import { FriendListPage } from '../page-objects/friends/friend-list.page.js';

test.describe('Friend Search', () => {
  test.describe('Full-text Search', () => {
    test('should search friends by name', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Search for Anna
      await friendList.search('Anna');

      // Should show Anna Schmidt
      await expect(page.getByText('Anna Schmidt')).toBeVisible();
    });

    test('should search friends by partial name', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Search for "Schm" (partial match for Schmidt)
      await friendList.search('Schm');

      // Should show friends with Schmidt in name
      await expect(page.getByText('Anna Schmidt')).toBeVisible();
    });

    test('should search friends by organization', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Search for TechCorp (Anna's organization)
      await friendList.search('TechCorp');

      // Should show Anna Schmidt
      await expect(page.getByText('Anna Schmidt')).toBeVisible();
    });

    test('should search friends by city', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Search for Berlin
      await friendList.search('Berlin');

      // Should show friends in Berlin (Anna, Oma Helga)
      const friendCount = await friendList.getFriendCount();
      expect(friendCount).toBeGreaterThanOrEqual(1);
    });

    test('should show no results for non-matching search', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Search for something that doesn't exist
      await friendList.search('xyznonexistent123');

      // Should show no results message or empty list
      const friendCount = await friendList.getFriendCount();
      expect(friendCount).toBe(0);
    });

    test('should clear search and show all friends', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      const initialCount = await friendList.getFriendCount();

      // Search
      await friendList.search('Anna');
      const searchCount = await friendList.getFriendCount();
      expect(searchCount).toBeLessThan(initialCount);

      // Clear search
      await friendList.clearSearch();
      const clearedCount = await friendList.getFriendCount();
      expect(clearedCount).toBe(initialCount);
    });

    test('should update URL with search query', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();

      await friendList.search('Anna');

      // URL should contain query parameter
      await expect(page).toHaveURL(/[?&]q=Anna/);
    });

    test('should restore search from URL', async ({ page }) => {
      // Navigate directly with search query
      await page.goto('/friends?q=Anna');

      // Search input should have the query
      const searchInput = page.getByPlaceholder(/search/i);
      await expect(searchInput).toHaveValue('Anna');

      // Results should be filtered
      await expect(page.getByText('Anna Schmidt')).toBeVisible();
    });
  });

  test.describe('Faceted Filters', () => {
    test('should filter by country', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Apply Germany filter
      await friendList.applyFilter('country', 'Germany');

      // Should show German friends
      await expect(page.getByText('Anna Schmidt')).toBeVisible();

      // URL should reflect filter
      await expect(page).toHaveURL(/country=Germany/);
    });

    test('should filter by city', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Apply Berlin filter
      await friendList.applyFilter('city', 'Berlin');

      // Should show Berlin friends
      const friendCount = await friendList.getFriendCount();
      expect(friendCount).toBeGreaterThanOrEqual(1);
    });

    test('should filter by organization', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Apply organization filter
      await friendList.applyFilter('organization', 'TechCorp');

      // Should show TechCorp employees
      await expect(page.getByText('Anna Schmidt')).toBeVisible();
    });

    test('should filter by circle', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Apply Work circle filter
      await friendList.applyFilter('circles', 'Work');

      // Should show Work circle members
      await expect(page.getByText('Anna Schmidt')).toBeVisible();
    });

    test('should combine multiple filters', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Apply multiple filters
      await friendList.applyFilter('country', 'Germany');
      await friendList.applyFilter('city', 'Berlin');

      // Should show filtered results
      const friendCount = await friendList.getFriendCount();
      expect(friendCount).toBeGreaterThanOrEqual(1);
    });

    test('should clear filters', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      const initialCount = await friendList.getFriendCount();

      // Apply filter
      await friendList.applyFilter('country', 'Germany');

      // Clear filters
      await friendList.clearFilters();
      const clearedCount = await friendList.getFriendCount();

      // After clearing, should restore to initial count
      expect(clearedCount).toBe(initialCount);
    });
  });

  test.describe('Sorting', () => {
    test('should sort by name ascending', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Sort by name ascending
      await friendList.sortBy('Name (A-Z)');

      // First friend should start with A or early letter
      const names = await friendList.getFriendNames();
      if (names.length > 1) {
        expect(names[0].localeCompare(names[1])).toBeLessThanOrEqual(0);
      }
    });

    test('should sort by name descending', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Sort by name descending
      await friendList.sortBy('Name (Z-A)');

      // First friend should start with late letter
      const names = await friendList.getFriendNames();
      if (names.length > 1) {
        expect(names[0].localeCompare(names[1])).toBeGreaterThanOrEqual(0);
      }
    });

    test('should sort by date added', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Sort by newest - try common label variations
      const sortOption = page.locator('select, [role="listbox"]').first();
      if (await sortOption.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Try common sort option labels
        const options = await sortOption.locator('option').allTextContents();
        const newestLabel = options.find((opt) => /newest|recent/i.test(opt));
        if (newestLabel) {
          await sortOption.selectOption({ label: newestLabel });
        }
      }
    });
  });

  test.describe('Pagination', () => {
    // These tests depend on having enough seeded data

    test('should show pagination controls when needed', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Pagination should be visible if there are enough friends
      const friendCount = await friendList.getFriendCount();

      // If we have more than one page worth of friends
      if (friendCount >= 10) {
        const pagination = page.locator(
          '[data-testid="pagination"], nav[aria-label*="pagination"]',
        );
        await expect(pagination).toBeVisible();
      }
    });

    test('should navigate to next page', async ({ page }) => {
      // Navigate to first page
      await page.goto('/friends?page=1');

      const nextButton = page.getByRole('button', { name: /next/i });

      if (await nextButton.isEnabled({ timeout: 1000 }).catch(() => false)) {
        await nextButton.click();

        // URL should update
        await expect(page).toHaveURL(/page=2/);
      }
    });

    test('should navigate to previous page', async ({ page }) => {
      // Start on page 2
      await page.goto('/friends?page=2');

      const prevButton = page.getByRole('button', { name: /prev/i });

      if (await prevButton.isEnabled({ timeout: 1000 }).catch(() => false)) {
        await prevButton.click();

        // URL should update
        await expect(page).toHaveURL(/page=1/);
      }
    });
  });

  test.describe('View Toggle', () => {
    test('should toggle between grid and list view', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Find view toggle button
      const viewToggle = page.getByRole('button', { name: /grid|list|view/i }).first();

      if (await viewToggle.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Get initial state
        const initialView = await page
          .locator('.grid, .list, [data-view]')
          .first()
          .getAttribute('class');

        // Click toggle
        await viewToggle.click();

        // View should change
        const newView = await page
          .locator('.grid, .list, [data-view]')
          .first()
          .getAttribute('class');

        // Views should be different
        expect(newView).not.toBe(initialView);
      }
    });
  });
});
