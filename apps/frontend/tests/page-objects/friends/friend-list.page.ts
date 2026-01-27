/**
 * Page object for the friend list page (/friends)
 */

import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page.js';

export class FriendListPage extends BasePage {
  readonly pageHeading: Locator;
  readonly addFriendButton: Locator;
  readonly searchInput: Locator;
  readonly friendTable: Locator;
  readonly friendRows: Locator;
  readonly emptyState: Locator;
  readonly paginationInfo: Locator;
  readonly friendCountText: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.getByRole('heading', { level: 1 });
    // Use main content area to avoid nav bar link, take first to avoid empty state button
    this.addFriendButton = page.locator('main a[href="/friends/new"]').first();
    this.searchInput = page.locator('input[aria-label*="earch"]');
    this.friendTable = page.locator('table');
    // Friend rows are <tr role="link"> elements with aria-label="View {name}"
    this.friendRows = page.locator('table tbody tr[role="link"]');
    this.emptyState = page.getByText(/no friends|keine freunde/i);
    this.paginationInfo = page.locator('[data-testid="pagination-info"]');
    this.friendCountText = page.locator('text=/\\d+ [Ff]riends?|\\d+ [Ff]reunde?/');
  }

  /**
   * Navigate to the friends list page
   */
  async goto(): Promise<void> {
    await this.page.goto('/friends');
    await this.waitForReady();
  }

  /**
   * Search for friends by query
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Wait for search results to update (debounced)
    await this.page.waitForTimeout(500);
    await this.waitForReady();
  }

  /**
   * Clear the search input
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
    await this.waitForReady();
  }

  /**
   * Click the Add Friend button
   */
  async clickAddFriend(): Promise<void> {
    await this.addFriendButton.click();
    await expect(this.page).toHaveURL(/\/friends\/new/);
  }

  /**
   * Click on a friend row by name
   */
  async clickFriend(name: string): Promise<void> {
    // Table rows have role="link" and aria-label="View {name}"
    await this.page.locator(`table tbody tr[role="link"][aria-label*="${name}"]`).click();
  }

  /**
   * Get all visible friend names from the table
   */
  async getFriendNames(): Promise<string[]> {
    const names: string[] = [];
    const count = await this.friendRows.count();

    for (let i = 0; i < count; i++) {
      // Friend name is in the second cell of each row
      const nameCell = this.friendRows.nth(i).locator('td').nth(1);
      const name = await nameCell.textContent();
      if (name) {
        names.push(name.trim());
      }
    }

    return names;
  }

  /**
   * Get the count of visible friends from the table
   */
  async getFriendCount(): Promise<number> {
    return await this.friendRows.count();
  }

  /**
   * Check if a friend with given name is visible
   */
  async hasFriend(name: string): Promise<boolean> {
    return await this.page.getByText(name, { exact: false }).isVisible();
  }

  /**
   * Wait for the friend list to load
   */
  async waitForFriends(): Promise<void> {
    // Wait for either friends to appear or empty state
    await Promise.race([
      this.friendRows.first().waitFor({ state: 'visible', timeout: 10000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  }

  /**
   * Apply a facet filter
   */
  async applyFilter(filterType: string, value: string): Promise<void> {
    // Click the filter dropdown
    const filterButton = this.page.getByRole('button', { name: new RegExp(filterType, 'i') });
    await filterButton.click();

    // Select the value
    await this.page.getByRole('option', { name: value }).click();
    await this.waitForReady();
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    const clearButton = this.page.getByRole('button', { name: /clear filters/i });
    if (await clearButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await clearButton.click();
      await this.waitForReady();
    }
  }

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    const nextButton = this.page.getByRole('button', { name: /next/i });
    await nextButton.click();
    await this.waitForReady();
  }

  /**
   * Go to previous page
   */
  async previousPage(): Promise<void> {
    const prevButton = this.page.getByRole('button', { name: /previous|prev/i });
    await prevButton.click();
    await this.waitForReady();
  }

  /**
   * Change sort order
   */
  async sortBy(option: string): Promise<void> {
    const sortSelect = this.page.locator('[data-testid="sort-select"], select[name="sort"]');
    await sortSelect.selectOption({ label: option });
    await this.waitForReady();
  }

  /**
   * Toggle between grid and list view
   */
  async toggleView(): Promise<void> {
    const viewToggle = this.page.getByRole('button', { name: /grid|list|view/i });
    await viewToggle.click();
  }
}
