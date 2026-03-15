import { test, expect } from '@playwright/test';

test.describe('Auth pages', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/MENIUS|Iniciar|Login/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button').filter({ hasText: /Entrar|Login|Iniciar/i }).first()).toBeVisible();
  });

  test('login shows error with wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('test-invalid@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword123');
    await page.locator('button[type="submit"], button').filter({ hasText: /Entrar|Login|Iniciar/i }).first().click();
    // Should show an error message (not redirect)
    await expect(page.locator('text=/inválid|incorrect|error|wrong/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button').filter({ hasText: /Enviar|Send|Reset/i }).first()).toBeVisible();
  });

  test('forgot password requires valid email', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.locator('input[type="email"]').fill('not-an-email');
    await page.locator('button[type="submit"], button').filter({ hasText: /Enviar|Send|Reset/i }).first().click();
    // HTML5 validation or custom error
    const emailInput = page.locator('input[type="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.locator('a[href="/signup"], a[href*="signup"]').first();
    await expect(signupLink).toBeVisible();
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');
    const loginLink = page.locator('a[href="/login"], a[href*="login"]').first();
    await expect(loginLink).toBeVisible();
  });
});
