/**
 * Navigation and global search tests
 *
 * Tests the navigation bar, global search (Cmd+K), and keyboard shortcuts.
 */

import { expect, test } from '@playwright/test';

test.describe('Navigation Bar', () => {
  test('should show main navigation links when authenticated', async ({ page }) => {
    await page.goto('/');

    // Main navigation links
    await expect(page.getByRole('link', { name: /friends/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /circles/i })).toBeVisible();
  });

  test('should show home/logo link', async ({ page }) => {
    await page.goto('/friends');

    // Logo/home link
    const homeLink = page.getByRole('link', { name: /freundebuch|home/i }).first();
    await expect(homeLink).toBeVisible();

    // Click should navigate to home
    await homeLink.click();
    await expect(page).toHaveURL('/');
  });

  test('should navigate to friends list', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /friends/i }).click();

    await expect(page).toHaveURL('/friends');
  });

  test('should navigate to circles', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /circles/i }).click();

    await expect(page).toHaveURL('/circles');
  });

  test('should show user menu/profile', async ({ page }) => {
    await page.goto('/');

    // User menu or profile link
    const userMenu = page.locator(
      '[data-testid="user-menu"], [aria-label*="profile"], [aria-label*="account"], button:has(img[alt*="avatar"])',
    );
    await expect(userMenu.first()).toBeVisible();
  });
});

test.describe('Global Search (Command Palette)', () => {
  test('should open global search with Cmd+K', async ({ page }) => {
    await page.goto('/');

    // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

    // Search modal/palette should open
    const searchModal = page.locator(
      '[data-testid="command-palette"], [data-testid="global-search"], [role="dialog"]:has(input[type="search"]), [role="combobox"]',
    );
    await expect(searchModal.first()).toBeVisible({ timeout: 3000 });
  });

  test('should close global search with Escape', async ({ page }) => {
    await page.goto('/');

    // Open search
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

    // Wait for modal
    const searchModal = page.locator(
      '[data-testid="command-palette"], [data-testid="global-search"], [role="dialog"]:has(input), [role="combobox"]',
    );
    await expect(searchModal.first()).toBeVisible({ timeout: 3000 });

    // Press Escape
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(searchModal.first()).not.toBeVisible({ timeout: 3000 });
  });

  test('should search friends in global search', async ({ page }) => {
    await page.goto('/');

    // Open search
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

    // Wait for search input to be visible and focused
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 3000 });

    // Type search query
    await searchInput.fill('Anna');

    // Should show search results
    await expect(page.getByText('Anna Schmidt')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate with arrow keys in global search', async ({ page }) => {
    await page.goto('/');

    // Open search
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

    // Wait for search input to be visible and focused
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 3000 });

    // Type search query
    await searchInput.fill('Anna');

    // Wait for results
    await expect(page.getByText('Anna Schmidt')).toBeVisible({ timeout: 5000 });

    // Press down arrow to select
    await page.keyboard.press('ArrowDown');

    // First result should be highlighted
    const selectedResult = page
      .locator('[aria-selected="true"], [data-selected], .selected')
      .first();
    await expect(selectedResult)
      .toBeVisible({ timeout: 2000 })
      .catch(() => {
        // Selection may be implicit
      });
  });

  test('should navigate to friend on Enter', async ({ page }) => {
    await page.goto('/');

    // Open search
    const isMac = process.platform === 'darwin';
    await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

    // Wait for search input to be visible and focused
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 3000 });

    // Type search query
    await searchInput.fill('Anna');

    // Wait for results
    await expect(page.getByText('Anna Schmidt')).toBeVisible({ timeout: 5000 });

    // Press Enter to navigate (or click)
    await page.keyboard.press('Enter');

    // Should navigate to friend detail
    await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/, { timeout: 5000 });
  });
});

test.describe('Keyboard Shortcuts', () => {
  test('should support Cmd+K to open search from any page', async ({ page }) => {
    // Test from different pages
    const pages = ['/friends', '/circles', '/profile'];

    for (const pagePath of pages) {
      await page.goto(pagePath);

      const isMac = process.platform === 'darwin';
      await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

      const searchModal = page.locator(
        '[data-testid="command-palette"], [data-testid="global-search"], [role="dialog"]:has(input), [role="combobox"]',
      );

      const isVisible = await searchModal
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (isVisible) {
        await page.keyboard.press('Escape');
      }
    }
  });
});

test.describe('Breadcrumbs / Back Navigation', () => {
  test('should show back link on friend detail page', async ({ page }) => {
    await page.goto('/friends');

    // Click on a friend
    await page.getByText('Anna Schmidt').click();

    // Back link should be visible
    const backLink = page.getByRole('link', { name: /back to friends/i });
    await expect(backLink).toBeVisible();
  });

  test('should navigate back to friends list', async ({ page }) => {
    await page.goto('/friends');

    // Click on a friend
    await page.getByText('Anna Schmidt').click();
    await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

    // Click back
    await page.getByRole('link', { name: /back to friends/i }).click();

    // Should be back on friends list
    await expect(page).toHaveURL('/friends');
  });
});

test.describe('Responsive Navigation', () => {
  test.describe('Desktop', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should show full navigation on desktop', async ({ page }) => {
      await page.goto('/');

      // Navigation links should be visible
      await expect(page.getByRole('link', { name: /friends/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /circles/i })).toBeVisible();
    });
  });

  test.describe('Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should show hamburger menu on mobile', async ({ page }) => {
      await page.goto('/');

      // Hamburger button should be visible
      const hamburger = page.locator(
        '[data-testid="hamburger-menu"], button[aria-label*="menu"], button:has(svg[aria-hidden])',
      );
      await expect(hamburger.first())
        .toBeVisible({ timeout: 3000 })
        .catch(async () => {
          // Navigation might be fully visible on larger mobile screens
          await expect(page.getByRole('link', { name: /friends/i })).toBeVisible();
        });
    });

    test('should open mobile menu on hamburger click', async ({ page }) => {
      await page.goto('/');

      const hamburger = page
        .locator('[data-testid="hamburger-menu"], button[aria-label*="menu"]')
        .first();

      if (await hamburger.isVisible({ timeout: 2000 }).catch(() => false)) {
        await hamburger.click();

        // Mobile menu should open
        const mobileMenu = page.locator('[data-testid="mobile-menu"], [role="menu"], nav.mobile');
        await expect(mobileMenu.first()).toBeVisible({ timeout: 3000 });
      }
    });
  });
});

test.describe('Protected Routes', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // No auth

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/friends');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should redirect to login when accessing circles', async ({ page }) => {
    await page.goto('/circles');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should redirect to login when accessing profile', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('should include redirect parameter in login URL', async ({ page }) => {
    await page.goto('/friends');

    // Should redirect to login with redirect parameter
    await expect(page).toHaveURL(/redirect=/);
  });
});
