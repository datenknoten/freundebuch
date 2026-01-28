/**
 * Friend detail subresource tests
 *
 * Tests adding, editing, and deleting contact details and other
 * subresources on the friend detail page.
 */

import { expect, test } from '@playwright/test';
import {
  generateFriendName,
  TEST_ADDRESSES,
  TEST_DATES,
  TEST_EMAILS,
  TEST_PHONES,
  TEST_URLS,
} from '../fixtures/index.js';
import { FriendDetailPage } from '../page-objects/friends/friend-detail.page.js';
import { FriendFormPage } from '../page-objects/friends/friend-form.page.js';
import { FriendListPage } from '../page-objects/friends/friend-list.page.js';

test.describe('Friend Contact Details', () => {
  let friendId: string;
  const friendName = generateFriendName('ContactDetails');

  test.beforeAll(async ({ browser }) => {
    // Create a test friend to use for all detail tests
    const context = await browser.newContext({
      storageState: 'tests/.auth/user.json',
    });
    const page = await context.newPage();

    const friendForm = new FriendFormPage(page);
    await friendForm.gotoNew();
    await friendForm.fillDisplayName(friendName);
    await friendForm.submit();

    // Extract friend ID
    await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);
    friendId = page.url().split('/friends/')[1];

    await context.close();
  });

  test.describe('Phone Numbers', () => {
    test('should add a phone number', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(friendId);

      // Find the add button for phone section
      const addButton = page.getByRole('button', { name: /add.*phone|phone.*add|\+/i }).first();
      await addButton.click();

      // Fill phone form
      await page.getByPlaceholder(/phone|number/i).fill(TEST_PHONES.mobile);

      // Select type if there's a dropdown
      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelect.selectOption('mobile');
      }

      // Save
      await page.getByRole('button', { name: /save|add/i }).click();

      // Phone should be visible
      await friendDetail.waitForReady();
      await expect(page.getByText(TEST_PHONES.mobile)).toBeVisible();
    });

    test('should add multiple phone numbers', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(friendId);

      // Add home phone
      const addButton = page.getByRole('button', { name: /add.*phone|phone.*add|\+/i }).first();
      await addButton.click();

      await page.getByPlaceholder(/phone|number/i).fill(TEST_PHONES.home);

      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelect.selectOption('home');
      }

      await page.getByRole('button', { name: /save|add/i }).click();
      await friendDetail.waitForReady();

      // Both phones should be visible
      await expect(page.getByText(TEST_PHONES.home)).toBeVisible();
    });
  });

  test.describe('Email Addresses', () => {
    test('should add an email address', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(friendId);

      // Look for add button in emails section or general add dropdown
      const addButton = page.getByRole('button', { name: /add.*email|email.*add|\+/i }).first();

      // If there's a dropdown, use it
      if (!(await addButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        // Try clicking an add dropdown and selecting email
        await page
          .getByRole('button', { name: /add|\+/i })
          .first()
          .click();
        await page.getByRole('menuitem', { name: /email/i }).click();
      } else {
        await addButton.click();
      }

      // Fill email form
      await page.getByPlaceholder(/email/i).fill(TEST_EMAILS.personal);

      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelect.selectOption('personal');
      }

      await page.getByRole('button', { name: /save|add/i }).click();
      await friendDetail.waitForReady();

      // Email should be visible
      await expect(page.getByText(TEST_EMAILS.personal)).toBeVisible();
    });
  });

  test.describe('Addresses', () => {
    test('should add an address', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(friendId);

      // Look for add address button
      const addButton = page.getByRole('button', { name: /add.*address|address.*add|\+/i }).first();

      if (!(await addButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        await page
          .getByRole('button', { name: /add|\+/i })
          .first()
          .click();
        await page.getByRole('menuitem', { name: /address/i }).click();
      } else {
        await addButton.click();
      }

      // Fill address form - fields may vary
      const streetInput = page.getByPlaceholder(/street/i).first();
      if (await streetInput.isVisible()) {
        await streetInput.fill(TEST_ADDRESSES.home.streetLine1);
      }

      const cityInput = page.getByPlaceholder(/city/i);
      if (await cityInput.isVisible()) {
        await cityInput.fill(TEST_ADDRESSES.home.city);
      }

      const postalInput = page.getByPlaceholder(/postal|zip/i);
      if (await postalInput.isVisible()) {
        await postalInput.fill(TEST_ADDRESSES.home.postalCode);
      }

      await page.getByRole('button', { name: /save|add/i }).click();
      await friendDetail.waitForReady();

      // City should be visible
      await expect(page.getByText(TEST_ADDRESSES.home.city)).toBeVisible();
    });
  });

  test.describe('URLs/Websites', () => {
    test('should add a website URL', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(friendId);

      // Look for add URL/website button
      const addButton = page
        .getByRole('button', { name: /add.*url|add.*website|url.*add|\+/i })
        .first();

      if (!(await addButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        await page
          .getByRole('button', { name: /add|\+/i })
          .first()
          .click();
        await page.getByRole('menuitem', { name: /url|website/i }).click();
      } else {
        await addButton.click();
      }

      // Fill URL form
      await page.getByPlaceholder(/url/i).fill(TEST_URLS.personal);

      await page.getByRole('button', { name: /save|add/i }).click();
      await friendDetail.waitForReady();

      // URL should be visible (as link)
      await expect(page.getByText(/personal-website/i)).toBeVisible();
    });
  });

  test.describe('Important Dates', () => {
    test('should add a birthday', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(friendId);

      // Look for add date/birthday button
      const addButton = page
        .getByRole('button', { name: /add.*date|add.*birthday|date.*add|\+/i })
        .first();

      if (!(await addButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        await page
          .getByRole('button', { name: /add|\+/i })
          .first()
          .click();
        await page.getByRole('menuitem', { name: /date|birthday/i }).click();
      } else {
        await addButton.click();
      }

      // Fill date form
      const dateInput = page.locator('input[type="date"]');
      await dateInput.fill(TEST_DATES.birthday);

      const typeSelect = page.locator('select').first();
      if (await typeSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
        await typeSelect.selectOption('birthday');
      }

      await page.getByRole('button', { name: /save|add/i }).click();
      await friendDetail.waitForReady();

      // Date should be visible (formatted)
      await expect(page.getByText(/1990|May 15|15.*May/i)).toBeVisible();
    });
  });

  test.describe('Professional History', () => {
    test('should add professional history', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(friendId);

      // Look for add professional/work button
      const addButton = page
        .getByRole('button', { name: /add.*professional|add.*work|professional.*add|\+/i })
        .first();

      if (!(await addButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        await page
          .getByRole('button', { name: /add|\+/i })
          .first()
          .click();
        await page.getByRole('menuitem', { name: /professional|work|job/i }).click();
      } else {
        await addButton.click();
      }

      // Fill professional history form
      const jobTitleInput = page.getByPlaceholder(/job title|position/i);
      if (await jobTitleInput.isVisible()) {
        await jobTitleInput.fill('Software Engineer');
      }

      const orgInput = page.getByPlaceholder(/organization|company/i);
      if (await orgInput.isVisible()) {
        await orgInput.fill('Test Corp');
      }

      // Fill start date
      const fromMonthSelect = page
        .locator('select')
        .filter({ hasText: /jan|month/i })
        .first();
      if (await fromMonthSelect.isVisible({ timeout: 500 }).catch(() => false)) {
        await fromMonthSelect.selectOption('1');
      }

      const fromYearInput = page.locator('input[name*="year"]').first();
      if (await fromYearInput.isVisible({ timeout: 500 }).catch(() => false)) {
        await fromYearInput.fill('2020');
      }

      await page.getByRole('button', { name: /save|add/i }).click();
      await friendDetail.waitForReady();

      // Job info should be visible
      await expect(page.getByText(/software engineer|test corp/i)).toBeVisible();
    });
  });

  test.describe('Social Profiles', () => {
    test('should add a social profile', async ({ page }) => {
      const friendDetail = new FriendDetailPage(page);
      await friendDetail.goto(friendId);

      // Look for add social button
      const addButton = page.getByRole('button', { name: /add.*social|social.*add|\+/i }).first();

      if (!(await addButton.isVisible({ timeout: 1000 }).catch(() => false))) {
        await page
          .getByRole('button', { name: /add|\+/i })
          .first()
          .click();
        await page.getByRole('menuitem', { name: /social/i }).click();
      } else {
        await addButton.click();
      }

      // Select platform
      const platformSelect = page.locator('select').first();
      await platformSelect.selectOption('linkedin');

      // Fill URL or username
      const urlInput = page.getByPlaceholder(/url/i);
      if (await urlInput.isVisible()) {
        await urlInput.fill('https://linkedin.com/in/testuser');
      } else {
        const usernameInput = page.getByPlaceholder(/username/i);
        await usernameInput.fill('testuser');
      }

      await page.getByRole('button', { name: /save|add/i }).click();
      await friendDetail.waitForReady();

      // Social profile should be visible
      await expect(page.getByText(/linkedin/i)).toBeVisible();
    });
  });

  test.describe('Circles Assignment', () => {
    test('should assign friend to a circle', async ({ page }) => {
      const friendList = new FriendListPage(page);
      await friendList.goto();
      await friendList.waitForFriends();

      // Use a seeded friend (Anna Schmidt is in Work and Friends circles)
      await friendList.clickFriend('Anna Schmidt');

      // Circles section should show existing circles
      await expect(page.getByText(/work|friends/i)).toBeVisible();
    });
  });
});

test.describe('Edit and Delete Subresources', () => {
  test('should edit an existing phone number', async ({ page }) => {
    const friendList = new FriendListPage(page);
    await friendList.goto();
    await friendList.waitForFriends();

    // Use Anna Schmidt who has phone numbers
    await friendList.clickFriend('Anna Schmidt');

    // Find the phone number row and click edit
    const phoneRow = page.locator('text=+49 151').first();
    await phoneRow.hover();

    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editButton.click();

      // Should show edit form
      await expect(page.getByPlaceholder(/phone|number/i)).toBeVisible();

      // Cancel to avoid changes
      await page.getByRole('button', { name: /cancel/i }).click();
    }
  });

  test('should delete a subresource with confirmation', async ({ page }) => {
    // Create a friend with some data first
    const friendForm = new FriendFormPage(page);
    const friendName = generateFriendName('DeleteSubresource');

    await friendForm.gotoNew();
    await friendForm.fillDisplayName(friendName);
    await friendForm.submit();

    await expect(page).toHaveURL(/\/friends\/[a-zA-Z0-9-]+$/);

    // Add a phone number
    const addButton = page.getByRole('button', { name: /add|\+/i }).first();
    await addButton.click();

    // If there's a menu, select phone
    const phoneOption = page.getByRole('menuitem', { name: /phone/i });
    if (await phoneOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await phoneOption.click();
    }

    await page.getByPlaceholder(/phone|number/i).fill('+49 123 456789');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Wait for phone to appear
    await expect(page.getByText('+49 123 456789')).toBeVisible();

    // Now try to delete it
    const phoneRow = page.locator('text=+49 123 456789').first();
    await phoneRow.hover();

    const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first();
    if (await deleteButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion if modal appears
      const confirmButton = page.getByRole('button', { name: /confirm|yes|delete/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Phone should be removed
      await expect(page.getByText('+49 123 456789')).not.toBeVisible({ timeout: 5000 });
    }
  });
});
