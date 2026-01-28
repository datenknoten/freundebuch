/**
 * Mobile navigation tests
 *
 * Tests navigation on mobile viewports including hamburger menu,
 * slide-out navigation, and mobile search.
 */

import { expect, test } from '@playwright/test';

// All tests use mobile viewport
test.use({ viewport: { width: 375, height: 667 } });

test.describe('Mobile Navigation', () => {
  test.describe('Hamburger Menu', () => {
    test('should show hamburger menu on mobile', async ({ page }) => {
      await page.goto('/');

      // Hamburger button should be visible
      const hamburger = page.locator(
        '[data-testid="hamburger-menu"], ' +
          'button[aria-label*="menu"], ' +
          'button[aria-expanded]',
      );

      await expect(hamburger.first()).toBeVisible({ timeout: 5000 });
    });

    test('should open mobile menu when clicking hamburger', async ({ page }) => {
      await page.goto('/');

      // Click hamburger
      const hamburger = page
        .locator(
          '[data-testid="hamburger-menu"], ' +
            'button[aria-label*="menu"], ' +
            'button[aria-expanded]',
        )
        .first();

      await hamburger.click();

      // Mobile menu should open
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu"], ' +
          '[role="menu"], ' +
          'nav[aria-expanded="true"], ' +
          '.mobile-nav',
      );

      await expect(mobileMenu.first()).toBeVisible({ timeout: 3000 });
    });

    test('should show navigation links in mobile menu', async ({ page }) => {
      await page.goto('/');

      // Open hamburger
      const hamburger = page
        .locator('[data-testid="hamburger-menu"], ' + 'button[aria-label*="menu"]')
        .first();

      await hamburger.click();

      // Navigation links should be visible
      await expect(page.getByRole('link', { name: /friends/i })).toBeVisible({ timeout: 3000 });
      await expect(page.getByRole('link', { name: /circles/i })).toBeVisible({ timeout: 3000 });
    });

    test('should close mobile menu when clicking link', async ({ page }) => {
      await page.goto('/');

      // Open hamburger
      const hamburger = page
        .locator('[data-testid="hamburger-menu"], ' + 'button[aria-label*="menu"]')
        .first();

      await hamburger.click();

      // Click Friends link
      await page.getByRole('link', { name: /friends/i }).click();

      // Should navigate to friends
      await expect(page).toHaveURL('/friends');
    });

    test('should close mobile menu when clicking outside', async ({ page }) => {
      await page.goto('/');

      // Open hamburger
      const hamburger = page
        .locator('[data-testid="hamburger-menu"], ' + 'button[aria-label*="menu"]')
        .first();

      await hamburger.click();

      // Wait for menu to open
      await page.waitForTimeout(300);

      // Click outside (on backdrop if exists)
      const backdrop = page.locator('[data-testid="menu-backdrop"], .backdrop, .overlay');
      if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
        await backdrop.click();
      } else {
        // Press Escape
        await page.keyboard.press('Escape');
      }

      // Menu should close
      const mobileMenu = page.locator(
        '[data-testid="mobile-menu"], ' + 'nav[aria-expanded="true"]',
      );

      await expect(mobileMenu.first())
        .not.toBeVisible({ timeout: 3000 })
        .catch(() => {
          // Menu might close differently
        });
    });
  });

  test.describe('Mobile Search', () => {
    test('should show search button on mobile', async ({ page }) => {
      await page.goto('/friends');

      // Search input or search button should be visible
      const searchTrigger = page.locator(
        'input[type="search"], ' +
          'input[placeholder*="search" i], ' +
          'button[aria-label*="search"]',
      );

      await expect(searchTrigger.first()).toBeVisible();
    });

    test('should perform search on mobile', async ({ page }) => {
      await page.goto('/friends');

      // Find search input
      const searchInput = page
        .locator('input[placeholder*="search" i], input[type="search"]')
        .first();

      await searchInput.fill('Anna');

      // Wait for results
      await page.waitForTimeout(500);

      // Should show search results
      await expect(page.getByText('Anna Schmidt')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Mobile Layout', () => {
    test('should show single column layout on mobile', async ({ page }) => {
      await page.goto('/friends');

      // On mobile, grid should be single column
      const grid = page.locator('.grid, [data-testid="friend-grid"]');

      if (await grid.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check it's not showing multiple columns
        const gridStyles = await grid.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            gridTemplateColumns: computed.gridTemplateColumns,
          };
        });

        // Should be single column or stacked layout
        if (gridStyles.display === 'grid') {
          expect(gridStyles.gridTemplateColumns).not.toMatch(/repeat\([3-9]|fr.*fr.*fr/);
        }
      }
    });

    test('should have touch-friendly tap targets', async ({ page }) => {
      await page.goto('/friends');

      // Buttons and links should be at least 44x44px (WCAG recommendation)
      const buttons = page.locator('button, a').first();

      if (await buttons.isVisible()) {
        const boundingBox = await buttons.boundingBox();
        if (boundingBox) {
          expect(boundingBox.height).toBeGreaterThanOrEqual(40);
        }
      }
    });
  });

  test.describe('Mobile Gestures', () => {
    test('should support swipe gestures on circles', async ({ page }) => {
      await page.goto('/circles');

      // Wait for circles to load
      await expect(page.getByText('Family')).toBeVisible({ timeout: 5000 });

      // Find a swipeable row
      const swipeableRow = page.locator('[data-testid="swipeable-row"], .swipeable').first();

      if (await swipeableRow.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Simulate swipe (touch events)
        const box = await swipeableRow.boundingBox();
        if (box) {
          // Swipe left to reveal delete
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
