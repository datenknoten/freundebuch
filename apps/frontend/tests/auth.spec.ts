import { expect, test } from '@playwright/test';

// Note: These tests assume the backend is running on localhost:3000
// and the frontend on the default dev server port

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the home page
    await page.goto('/');
  });

  test('should show sign in and sign up buttons when not authenticated', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.getByRole('link', { name: 'Get Started' }).click();
    await expect(page).toHaveURL('/auth/register');
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();
  });

  test('should show validation errors on login form', async ({ page }) => {
    await page.goto('/auth/login');

    // Try to submit empty form
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Browser native validation should prevent submission
    const emailInput = page.getByLabel('Email address');
    await expect(emailInput).toHaveAttribute('required', '');
  });

  test('should show validation errors on registration form', async ({ page }) => {
    await page.goto('/auth/register');

    // Fill in email but not password
    await page.getByLabel('Email address').fill('test@example.com');

    // Try to submit
    await page.getByRole('button', { name: 'Create account' }).click();

    // Browser native validation should prevent submission
    const passwordInput = page.getByLabel('Password', { exact: true });
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('should navigate between auth pages', async ({ page }) => {
    // Start at login
    await page.goto('/auth/login');

    // Click "Create one" link to go to register
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL('/auth/register');
    await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

    // Click "Sign in" link to go back to login
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/auth/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Click "Forgot password?" link
    await page.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL('/auth/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  });

  test('should show password mismatch error on registration', async ({ page }) => {
    await page.goto('/auth/register');

    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Confirm password').fill('differentpassword');
    await page.getByLabel(/I agree to the/).check();

    await page.getByRole('button', { name: 'Create account' }).click();

    // Should show error message
    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should show password length error on registration', async ({ page }) => {
    await page.goto('/auth/register');

    await page.getByLabel('Email address').fill('test@example.com');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByLabel('Confirm password').fill('short');
    await page.getByLabel(/I agree to the/).check();

    await page.getByRole('button', { name: 'Create account' }).click();

    // Should show error message
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('forgot password flow', async ({ page }) => {
    await page.goto('/auth/forgot-password');

    // Fill in email
    await page.getByLabel('Email address').fill('test@example.com');

    // Submit form
    await page.getByRole('button', { name: 'Send reset link' }).click();

    // Should show success message (even if email doesn't exist - security best practice)
    await expect(
      page.getByText('If the email exists, a password reset link has been sent'),
    ).toBeVisible();
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

    // Check navbar shows Sign in and Sign up
    const navbar = page.locator('nav');
    await expect(navbar.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(navbar.getByRole('link', { name: 'Sign up' })).toBeVisible();

    // Should not show profile or logout
    await expect(navbar.getByRole('link', { name: 'Profile' })).not.toBeVisible();
    await expect(navbar.getByRole('button', { name: 'Logout' })).not.toBeVisible();
  });

  test('should have Personal CRM logo/link', async ({ page }) => {
    await page.goto('/');

    const logo = page.locator('nav').getByRole('link', { name: 'Personal CRM' });
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
    await expect(page).toHaveURL(/\/auth\/login\?redirect=/);
  });
});

test.describe('Accessibility', () => {
  test('login form should have proper labels', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for proper labels
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('registration form should have proper labels', async ({ page }) => {
    await page.goto('/auth/register');

    // Check for proper labels
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Confirm password')).toBeVisible();
  });

  test('forms should have submit buttons', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

    await page.goto('/auth/register');
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();

    await page.goto('/auth/forgot-password');
    await expect(page.getByRole('button', { name: 'Send reset link' })).toBeVisible();
  });
});
