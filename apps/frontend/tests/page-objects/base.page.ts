/**
 * Base page object with common methods shared across all pages
 */

import { expect, type Locator, type Page } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a path
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Wait for navigation to a URL pattern
   */
  async waitForUrl(pattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(pattern);
  }

  /**
   * Get the current URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Wait for a loading spinner to appear and then disappear
   */
  async waitForLoading(): Promise<void> {
    const spinner = this.page.locator('.animate-spin');
    // Wait for spinner to appear (if loading takes time)
    await spinner.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {
      // Spinner may not appear if load is fast
    });
    // Wait for spinner to disappear
    await spinner.waitFor({ state: 'hidden', timeout: 30000 });
  }

  /**
   * Wait for page to be ready (DOM loaded, no spinners)
   */
  async waitForReady(): Promise<void> {
    // Wait for DOM content to be loaded
    await this.page.waitForLoadState('domcontentloaded');
    // Give a small buffer for any dynamic content
    await this.page.waitForTimeout(100);
  }

  /**
   * Check if an element is visible
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Click a button by its text
   */
  async clickButton(text: string | RegExp): Promise<void> {
    await this.page.getByRole('button', { name: text }).click();
  }

  /**
   * Click a link by its text
   */
  async clickLink(text: string | RegExp): Promise<void> {
    await this.page.getByRole('link', { name: text }).click();
  }

  /**
   * Fill an input by its label
   */
  async fillInput(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).fill(value);
  }

  /**
   * Fill an input by its placeholder
   */
  async fillByPlaceholder(placeholder: string, value: string): Promise<void> {
    await this.page.getByPlaceholder(placeholder).fill(value);
  }

  /**
   * Check if text is visible on the page
   */
  async hasText(text: string | RegExp): Promise<boolean> {
    return await this.page.getByText(text).isVisible();
  }

  /**
   * Wait for text to appear
   */
  async waitForText(text: string | RegExp): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  /**
   * Press a keyboard shortcut
   */
  async pressShortcut(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Open command palette (Cmd+K on Mac, Ctrl+K on Windows/Linux)
   */
  async openCommandPalette(): Promise<void> {
    const isMac = process.platform === 'darwin';
    await this.page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');
  }

  /**
   * Get the page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }

  /**
   * Reload the page
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.waitForReady();
  }

  /**
   * Get toast/alert message
   */
  getToast(): Locator {
    return this.page.locator('[role="alert"], [data-testid="toast"]');
  }

  /**
   * Wait for toast to appear with text
   */
  async waitForToast(text: string | RegExp): Promise<void> {
    await expect(this.getToast().filter({ hasText: text })).toBeVisible();
  }

  /**
   * Close modal by clicking backdrop or close button
   */
  async closeModal(): Promise<void> {
    // Try close button first
    const closeButton = this.page.getByRole('button', { name: /close|cancel|×/i });
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeButton.click();
      return;
    }
    // Press Escape as fallback
    await this.page.keyboard.press('Escape');
  }
}
