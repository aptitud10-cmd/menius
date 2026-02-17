import { test, expect } from '@playwright/test';

test.describe('Authentication Pages', () => {
  test('login page renders with email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/MENIUS/);

    await expect(page.getByPlaceholder('tu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /regístrate/i })).toBeVisible();
  });

  test('signup page renders with name, email and password fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveTitle(/MENIUS/);

    await expect(page.getByPlaceholder('Juan García')).toBeVisible();
    await expect(page.getByPlaceholder('tu@email.com')).toBeVisible();
    await expect(page.getByPlaceholder('Mínimo 6 caracteres')).toBeVisible();
    await expect(page.getByRole('button', { name: /crear cuenta/i })).toBeVisible();
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('link', { name: /inicia sesión/i })).toBeVisible();
  });
});
