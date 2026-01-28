/**
 * Page object for the friend detail page (/friends/[id])
 */

import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base.page.js';

export class FriendDetailPage extends BasePage {
  readonly backLink: Locator;
  readonly displayName: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly favoriteButton: Locator;
  readonly avatar: Locator;

  // Sections
  readonly phonesSection: Locator;
  readonly emailsSection: Locator;
  readonly addressesSection: Locator;
  readonly urlsSection: Locator;
  readonly datesSection: Locator;
  readonly professionalSection: Locator;
  readonly socialProfilesSection: Locator;
  readonly circlesSection: Locator;
  readonly interestsSection: Locator;
  readonly metInfoSection: Locator;

  constructor(page: Page) {
    super(page);
    // Use URL-based locator to avoid i18n issues
    this.backLink = page.locator('a[href="/friends"]').first();
    this.displayName = page.locator('[data-testid="friend-name"], h1, h2').first();
    // Edit link goes to /friends/{id}/edit
    this.editButton = page.locator('a[href$="/edit"]').first();
    // Delete button - try multiple translations
    this.deleteButton = page.getByRole('button', { name: /delete|löschen/i });
    this.favoriteButton = page.getByRole('button', { name: /favorite|star|favorit/i });
    this.avatar = page.locator('[data-testid="friend-avatar"], .avatar, img[alt*="avatar"]');

    // Sections - using data-testid (preferred) or i18n-compatible text patterns
    // Text patterns include both English and German translations
    this.phonesSection = page.locator(
      '[data-testid="phones-section"], section:has-text("Phone"), section:has-text("Telefon")',
    );
    this.emailsSection = page.locator(
      '[data-testid="emails-section"], section:has-text("Email"), section:has-text("E-Mail")',
    );
    this.addressesSection = page.locator(
      '[data-testid="addresses-section"], section:has-text("Address"), section:has-text("Adresse")',
    );
    this.urlsSection = page.locator(
      '[data-testid="urls-section"], section:has-text("Website"), section:has-text("URL"), section:has-text("Webseite")',
    );
    this.datesSection = page.locator(
      '[data-testid="dates-section"], section:has-text("Date"), section:has-text("Birthday"), section:has-text("Datum"), section:has-text("Geburtstag")',
    );
    this.professionalSection = page.locator(
      '[data-testid="professional-section"], section:has-text("Professional"), section:has-text("Work"), section:has-text("Beruf"), section:has-text("Arbeit")',
    );
    this.socialProfilesSection = page.locator(
      '[data-testid="social-section"], section:has-text("Social"), section:has-text("Sozial")',
    );
    this.circlesSection = page.locator(
      '[data-testid="circles-section"], section:has-text("Circle"), section:has-text("Kreis")',
    );
    this.interestsSection = page.locator(
      '[data-testid="interests-section"], section:has-text("Interest"), section:has-text("Interesse")',
    );
    this.metInfoSection = page.locator(
      '[data-testid="met-info-section"], section:has-text("How We Met"), section:has-text("Met"), section:has-text("Kennengelernt")',
    );
  }

  /**
   * Navigate to a friend detail page by ID
   */
  async goto(friendId: string): Promise<void> {
    await this.page.goto(`/friends/${friendId}`);
    await this.waitForReady();
  }

  /**
   * Get the friend's display name
   */
  async getDisplayName(): Promise<string> {
    return (await this.displayName.textContent()) || '';
  }

  /**
   * Click the back to friends link
   */
  async goBack(): Promise<void> {
    await this.backLink.click();
    await expect(this.page).toHaveURL('/friends');
  }

  /**
   * Click the edit button/link (navigates to /friends/{id}/edit)
   */
  async clickEdit(): Promise<void> {
    await this.editButton.click();
    await expect(this.page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+\/edit$/);
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(): Promise<void> {
    await this.favoriteButton.click();
    await this.waitForReady();
  }

  /**
   * Delete the friend (with confirmation)
   */
  async deleteFriend(): Promise<void> {
    await this.deleteButton.click();
    // Confirm in the modal
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    await confirmButton.click();
    await expect(this.page).toHaveURL('/friends');
  }

  // ============================================================================
  // Phone methods
  // ============================================================================

  /**
   * Get all phone numbers
   */
  async getPhones(): Promise<string[]> {
    const phoneElements = this.phonesSection.locator(
      '[data-testid="phone-number"], a[href^="tel:"]',
    );
    const phones: string[] = [];
    const count = await phoneElements.count();

    for (let i = 0; i < count; i++) {
      const phone = await phoneElements.nth(i).textContent();
      if (phone) phones.push(phone.trim());
    }

    return phones;
  }

  /**
   * Add a phone number
   */
  async addPhone(phoneNumber: string, type: string = 'mobile'): Promise<void> {
    await this.clickAddButton('phone');
    await this.page.getByPlaceholder(/phone|number/i).fill(phoneNumber);
    await this.selectType(type);
    await this.saveSubresource();
  }

  /**
   * Edit a phone number
   */
  async editPhone(currentNumber: string, newNumber: string): Promise<void> {
    await this.clickEditOnRow(currentNumber);
    await this.page.getByPlaceholder(/phone|number/i).fill(newNumber);
    await this.saveSubresource();
  }

  /**
   * Delete a phone number
   */
  async deletePhone(phoneNumber: string): Promise<void> {
    await this.deleteSubresource(phoneNumber);
  }

  // ============================================================================
  // Email methods
  // ============================================================================

  /**
   * Get all email addresses
   */
  async getEmails(): Promise<string[]> {
    const emailElements = this.emailsSection.locator(
      '[data-testid="email-address"], a[href^="mailto:"]',
    );
    const emails: string[] = [];
    const count = await emailElements.count();

    for (let i = 0; i < count; i++) {
      const email = await emailElements.nth(i).textContent();
      if (email) emails.push(email.trim());
    }

    return emails;
  }

  /**
   * Add an email address
   */
  async addEmail(email: string, type: string = 'personal'): Promise<void> {
    await this.clickAddButton('email');
    await this.page.getByPlaceholder(/email/i).fill(email);
    await this.selectType(type);
    await this.saveSubresource();
  }

  /**
   * Delete an email address
   */
  async deleteEmail(email: string): Promise<void> {
    await this.deleteSubresource(email);
  }

  // ============================================================================
  // Address methods
  // ============================================================================

  /**
   * Add an address
   */
  async addAddress(
    address: {
      streetLine1?: string;
      city?: string;
      postalCode?: string;
      country?: string;
    },
    type: string = 'home',
  ): Promise<void> {
    await this.clickAddButton('address');

    if (address.streetLine1) {
      await this.page
        .getByPlaceholder(/street/i)
        .first()
        .fill(address.streetLine1);
    }
    if (address.city) {
      await this.page.getByPlaceholder(/city/i).fill(address.city);
    }
    if (address.postalCode) {
      await this.page.getByPlaceholder(/postal|zip/i).fill(address.postalCode);
    }
    if (address.country) {
      await this.page.getByPlaceholder(/country/i).fill(address.country);
    }

    await this.selectType(type);
    await this.saveSubresource();
  }

  // ============================================================================
  // URL methods
  // ============================================================================

  /**
   * Add a URL
   */
  async addUrl(url: string, type: string = 'personal', label?: string): Promise<void> {
    await this.clickAddButton('url');
    await this.page.getByPlaceholder(/url/i).fill(url);
    await this.selectType(type);
    if (label) {
      await this.page.getByPlaceholder(/label/i).fill(label);
    }
    await this.saveSubresource();
  }

  // ============================================================================
  // Date methods (birthdays, anniversaries)
  // ============================================================================

  /**
   * Add an important date
   */
  async addDate(date: string, type: string = 'birthday', label?: string): Promise<void> {
    await this.clickAddButton('date');
    await this.page.locator('input[type="date"]').fill(date);
    await this.selectType(type);
    if (label) {
      await this.page.getByPlaceholder(/label/i).fill(label);
    }
    await this.saveSubresource();
  }

  // ============================================================================
  // Professional history methods
  // ============================================================================

  /**
   * Add professional history
   */
  async addProfessionalHistory(job: {
    jobTitle?: string;
    organization?: string;
    department?: string;
    fromMonth: number;
    fromYear: number;
  }): Promise<void> {
    await this.clickAddButton('professional');

    if (job.jobTitle) {
      await this.page.getByPlaceholder(/job title|position/i).fill(job.jobTitle);
    }
    if (job.organization) {
      await this.page.getByPlaceholder(/organization|company/i).fill(job.organization);
    }
    if (job.department) {
      await this.page.getByPlaceholder(/department/i).fill(job.department);
    }

    // Fill date fields
    await this.page
      .locator('select[name*="from_month"], select[name*="fromMonth"]')
      .selectOption(String(job.fromMonth));
    await this.page
      .locator('input[name*="from_year"], input[name*="fromYear"]')
      .fill(String(job.fromYear));

    await this.saveSubresource();
  }

  // ============================================================================
  // Social profile methods
  // ============================================================================

  /**
   * Add a social profile
   */
  async addSocialProfile(platform: string, urlOrUsername: string): Promise<void> {
    await this.clickAddButton('social');

    // Select platform
    await this.page.locator('select[name*="platform"]').selectOption(platform);

    // Fill URL or username depending on what's provided
    if (urlOrUsername.startsWith('http')) {
      await this.page.getByPlaceholder(/url/i).fill(urlOrUsername);
    } else {
      await this.page.getByPlaceholder(/username/i).fill(urlOrUsername);
    }

    await this.saveSubresource();
  }

  // ============================================================================
  // Circle methods
  // ============================================================================

  /**
   * Assign to a circle
   */
  async assignToCircle(circleName: string): Promise<void> {
    // This might be via a dropdown or button
    await this.clickAddButton('circle');
    await this.page.getByRole('option', { name: circleName }).click();
    await this.waitForReady();
  }

  /**
   * Remove from a circle
   */
  async removeFromCircle(circleName: string): Promise<void> {
    const circleTag = this.circlesSection.locator(
      `[data-testid="circle-tag"]:has-text("${circleName}")`,
    );
    await circleTag.getByRole('button', { name: /remove|×/i }).click();
    await this.waitForReady();
  }

  // ============================================================================
  // Helper methods
  // ============================================================================

  /**
   * Click the add button for a specific subresource type
   */
  private async clickAddButton(type: string): Promise<void> {
    const addButton = this.page.getByRole('button', {
      name: new RegExp(`add.*${type}|${type}.*add|\\+.*${type}`, 'i'),
    });

    // Try to find the button, if not visible, look for a dropdown
    if (await addButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await addButton.click();
    } else {
      // Look for an "Add" dropdown that contains the option
      const addDropdown = this.page.getByRole('button', { name: /add|\\+/i });
      await addDropdown.click();
      await this.page.getByRole('menuitem', { name: new RegExp(type, 'i') }).click();
    }
  }

  /**
   * Select a type in the current form
   */
  private async selectType(type: string): Promise<void> {
    const typeSelect = this.page.locator('select[name*="type"]');
    if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      await typeSelect.selectOption(type);
    }
  }

  /**
   * Save the current subresource form
   */
  private async saveSubresource(): Promise<void> {
    await this.page.getByRole('button', { name: /save|add|submit/i }).click();
    await this.waitForReady();
  }

  /**
   * Click edit on a row containing the given text
   */
  private async clickEditOnRow(text: string): Promise<void> {
    const row = this.page.locator(
      `[data-testid="subresource-row"]:has-text("${text}"), tr:has-text("${text}"), li:has-text("${text}")`,
    );
    await row.getByRole('button', { name: /edit/i }).click();
  }

  /**
   * Delete a subresource by its display text
   */
  private async deleteSubresource(text: string): Promise<void> {
    const row = this.page.locator(
      `[data-testid="subresource-row"]:has-text("${text}"), tr:has-text("${text}"), li:has-text("${text}")`,
    );
    await row.getByRole('button', { name: /delete|remove|×/i }).click();

    // Confirm deletion if modal appears
    const confirmButton = this.page.getByRole('button', { name: /confirm|yes|delete/i });
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await this.waitForReady();
  }
}
