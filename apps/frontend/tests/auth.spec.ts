import { expect, test } from '@playwright/test';

// Note: These tests assume the backend is running on localhost:3000
// and the frontend on the default dev server port

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the home page
    await page.goto('/');
  });

  test('should show sign in and register links when not authenticated', async ({ page }) => {
    // Look for navigation links (may be in desktop nav or mobile menu)
    await expect(page.getByRole('link', { name: /sign in|login/i }).first()).toBeVisible();
    await expect(
      page.getByRole('link', { name: /register|sign up|create account/i }).first(),
    ).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page
      .getByRole('link', { name: /sign in|login/i })
      .first()
      .click();
    await expect(page).toHaveURL('/auth/login');
    // Check for the Sign In heading (from i18n: auth.login.title = "Sign In")
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page
      .getByRole('link', { name: /register|sign up|create account/i })
      .first()
      .click();
    await expect(page).toHaveURL('/auth/register');
    // Check for the Create Account heading (from i18n: auth.register.title = "Create Account")
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('should show validation errors on login form', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit empty form - browser native validation should prevent it
    await page.getByRole('button', { name: /sign in/i }).click();

    // Email input should be required
    const emailInput = page.locator('#email');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should show validation errors on registration form', async ({ page }) => {
    await page.goto('/auth/register');

    // Fill in email but not password
    await page.locator('#email').fill('test@example.com');

    // Try to submit
    await page.getByRole('button', { name: /create account/i }).click();

    // Password input should be required
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should navigate between auth pages', async ({ page }) => {
    // Start at login
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Click link to go to register (from i18n: auth.login.registerLink = "Create one")
    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page).toHaveURL('/auth/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();

    // Click link to go back to login (from i18n: auth.register.loginLink)
    await page.getByRole('link', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Click "Forgot password?" link
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL('/auth/forgot-password');
    await expect(page.getByRole('heading', { name: /reset|forgot/i })).toBeVisible();
  });

  test('should show password mismatch error on registration', async ({ page }) => {
    await page.goto('/auth/register');

    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirm-password').fill('differentpassword');
    await page.getByLabel(/I agree to the/).check();

    await page.getByRole('button', { name: /create account/i }).click();

    // Should show error message
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('should show password length error on registration', async ({ page }) => {
    await page.goto('/auth/register');

    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('short');
    await page.locator('#confirm-password').fill('short');
    await page.getByLabel(/I agree to the/).check();

    await page.getByRole('button', { name: /create account/i }).click();

    // Should show error message about password length (use role=alert to find the error banner)
    await expect(page.getByRole('alert').getByText(/8 characters/i)).toBeVisible();
  });

  test('forgot password flow', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    // Wait for the page to fully load and hydrate
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();

    // Use a unique email to avoid rate limiting
    const uniqueEmail = `test_${Date.now()}@example.com`;

    // Fill in email
    const emailInput = page.locator('#email');
    await emailInput.click();
    await emailInput.fill(uniqueEmail);

    // Submit form
    await page.getByRole('button', { name: /send reset link/i }).click();

    // Wait for network request to complete
    await page.waitForLoadState('networkidle');

    // Should show success message (or rate limit message - both are valid responses)
    // The success message confirms the flow works; rate limit confirms security
    const successMessage = page.getByText(/password reset link sent/i);
    const rateLimitMessage = page.getByText(/too many.*attempts/i);

    // Wait for either message
    await expect(successMessage.or(rateLimitMessage)).toBeVisible({ timeout: 10000 });
  });

  test('should require terms acceptance on registration', async ({ page }) => {
    await page.goto('/auth/register');

    const termsCheckbox = page.getByLabel(/I agree to the/);

    // Should be unchecked by default
    await expect(termsCheckbox).not.toBeChecked();

    // Should have required attribute
    await expect(termsCheckbox).toHaveAttribute('required', '');
  });
});

test.describe('Navigation Bar', () => {
  test('should show correct navigation items when not authenticated', async ({ page }) => {
    await page.goto('/');

    // Check navbar shows Sign in and Register links
    const navbar = page.locator('nav');
    await expect(navbar.getByRole('link', { name: /sign in|login/i }).first()).toBeVisible();
    await expect(
      navbar.getByRole('link', { name: /register|sign up|create/i }).first(),
    ).toBeVisible();

    // Should not show profile or logout for unauthenticated users
    await expect(navbar.getByRole('link', { name: /profile/i })).not.toBeVisible();
    await expect(navbar.getByRole('button', { name: /logout|sign out/i })).not.toBeVisible();
  });

  test('should have Freundebuch logo/link', async ({ page }) => {
    await page.goto('/');

    // Logo should be visible and clickable
    const logo = page
      .locator('nav')
      .getByRole('link', { name: /freundebuch/i })
      .first();
    await expect(logo).toBeVisible();

    // Clicking logo should go to home
    await logo.click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing profile without authentication', async ({
    page,
  }) => {
    // Try to access profile page directly
    await page.goto('/profile');

    // Should redirect to login with redirect parameter
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Accessibility', () => {
  test('login form should have proper input fields', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for email and password inputs
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('registration form should have proper input fields', async ({ page }) => {
    await page.goto('/auth/register');

    // Check for proper input fields
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
  });

  test('forms should have submit buttons', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    await page.goto('/auth/register');
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

    await page.goto('/auth/forgot-password');
    await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible();
  });
});
