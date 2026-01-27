/**
 * Page object for the friend create/edit form (/friends/new, /friends/[id]/edit)
 */

import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page.js';

export class FriendFormPage extends BasePage {
  readonly form: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Name fields
  readonly namePrefixInput: Locator;
  readonly nameFirstInput: Locator;
  readonly nameMiddleInput: Locator;
  readonly nameLastInput: Locator;
  readonly nameSuffixInput: Locator;
  readonly maidenNameInput: Locator;
  readonly displayNameInput: Locator;
  readonly nicknameInput: Locator;

  // Other fields
  readonly interestsInput: Locator;
  readonly metDateInput: Locator;
  readonly metLocationInput: Locator;
  readonly metContextInput: Locator;

  // Photo
  readonly photoUploadButton: Locator;
  readonly photoInput: Locator;
  readonly removePhotoButton: Locator;

  // Error display
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.form = page.locator('form');
    // Handle EN and DE button text
    this.submitButton = page.getByRole('button', { name: /create|save|erstellen|speichern/i });
    this.cancelButton = page.locator('a[href="/friends"]').first();

    // Name fields by placeholder
    this.namePrefixInput = page.getByPlaceholder(/prefix/i);
    this.nameFirstInput = page.getByPlaceholder(/first name/i);
    this.nameMiddleInput = page.getByPlaceholder(/middle name/i);
    this.nameLastInput = page.getByPlaceholder(/last name/i);
    this.nameSuffixInput = page.getByPlaceholder(/suffix/i);
    this.maidenNameInput = page.getByPlaceholder(/maiden/i);
    this.displayNameInput = page.getByPlaceholder(/display name/i);
    this.nicknameInput = page.getByPlaceholder(/nickname/i);

    // Other fields
    this.interestsInput = page.getByPlaceholder(/interests|hobbies/i);
    this.metDateInput = page.locator('input[type="date"]');
    this.metLocationInput = page.getByPlaceholder(/location/i);
    this.metContextInput = page.getByPlaceholder(/context|story/i);

    // Photo
    this.photoUploadButton = page.locator('button:has(.avatar), button:has(img)').first();
    this.photoInput = page.locator('input[type="file"]');
    this.removePhotoButton = page.getByRole('button', { name: /remove photo/i });

    // Error
    this.errorBanner = page.locator('[role="alert"]');
  }

  /**
   * Navigate to the new friend form
   */
  async gotoNew(): Promise<void> {
    await this.page.goto('/friends/new');
    await this.waitForReady();
  }

  /**
   * Navigate to edit form for a friend
   */
  async gotoEdit(friendId: string): Promise<void> {
    await this.page.goto(`/friends/${friendId}/edit`);
    await this.waitForReady();
  }

  /**
   * Fill the display name (required field)
   */
  async fillDisplayName(name: string): Promise<void> {
    await this.displayNameInput.fill(name);
  }

  /**
   * Fill all name parts
   */
  async fillNameParts(parts: {
    prefix?: string;
    first?: string;
    middle?: string;
    last?: string;
    suffix?: string;
    maiden?: string;
    nickname?: string;
  }): Promise<void> {
    if (parts.prefix) await this.namePrefixInput.fill(parts.prefix);
    if (parts.first) await this.nameFirstInput.fill(parts.first);
    if (parts.middle) await this.nameMiddleInput.fill(parts.middle);
    if (parts.last) await this.nameLastInput.fill(parts.last);
    if (parts.suffix) await this.nameSuffixInput.fill(parts.suffix);
    if (parts.maiden) await this.maidenNameInput.fill(parts.maiden);
    if (parts.nickname) await this.nicknameInput.fill(parts.nickname);
  }

  /**
   * Fill interests field
   */
  async fillInterests(interests: string): Promise<void> {
    await this.interestsInput.fill(interests);
  }

  /**
   * Fill "how we met" information
   */
  async fillMetInfo(metInfo: {
    date?: string;
    location?: string;
    context?: string;
  }): Promise<void> {
    if (metInfo.date) await this.metDateInput.fill(metInfo.date);
    if (metInfo.location) await this.metLocationInput.fill(metInfo.location);
    if (metInfo.context) await this.metContextInput.fill(metInfo.context);
  }

  /**
   * Submit the form
   */
  async submit(): Promise<void> {
    // Wait for the submit button to be enabled (validation passes)
    await expect(this.submitButton).toBeEnabled({ timeout: 10000 });
    await this.submitButton.click();
    // Wait for navigation away from the form
    await this.page.waitForURL(
      (url) => !url.pathname.includes('/new') && !url.pathname.includes('/edit'),
      {
        timeout: 15000,
      },
    );
  }

  /**
   * Cancel and go back
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Create a minimal friend (just display name)
   */
  async createMinimalFriend(displayName: string): Promise<void> {
    await this.fillDisplayName(displayName);
    await this.submit();
    // Wait for navigation to friend detail
    await expect(this.page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
  }

  /**
   * Create a friend with full name parts
   */
  async createFriendWithFullName(parts: {
    prefix?: string;
    first: string;
    middle?: string;
    last: string;
    suffix?: string;
    maiden?: string;
    nickname?: string;
  }): Promise<void> {
    await this.fillNameParts(parts);
    // Display name should auto-generate from parts
    await this.submit();
    await expect(this.page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
  }

  /**
   * Check if form has validation error
   */
  async hasError(): Promise<boolean> {
    return await this.errorBanner.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorBanner.textContent()) || '';
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  /**
   * Upload a photo (for editing existing friend)
   */
  async uploadPhoto(filePath: string): Promise<void> {
    // Trigger file input
    await this.photoInput.setInputFiles(filePath);

    // Wait for crop modal if it appears
    const cropModal = this.page.locator('[data-testid="crop-modal"]');
    if (await cropModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Click save/crop button
      await this.page.getByRole('button', { name: /save|crop|done/i }).click();
    }

    await this.waitForReady();
  }

  /**
   * Remove current photo
   */
  async removePhoto(): Promise<void> {
    await this.removePhotoButton.click();
    await this.waitForReady();
  }

  /**
   * Wait for the form to be ready
   */
  async waitForForm(): Promise<void> {
    await this.form.waitFor({ state: 'visible' });
    await this.nameFirstInput.waitFor({ state: 'visible' });
  }
}
