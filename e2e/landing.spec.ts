import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('loads and shows key sections', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/MENIUS/i);
    // Hero CTA
    await expect(page.locator('h1').first()).toBeVisible();
    // Nav with pricing link
    await expect(page.locator('a[href*="precio"], a[href*="pricing"], a[href*="#precio"]').first()).toBeVisible();
  });

  test('has working login and signup links', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.locator('a[href="/login"]').first();
    await expect(loginLink).toBeVisible();
  });

  test('FAQ page loads and shows categories', async ({ page }) => {
    await page.goto('/faq');
    await expect(page).toHaveTitle(/FAQ|Preguntas/i);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Blog page loads', async ({ page }) => {
    await page.goto('/blog');
    await expect(page).toHaveTitle(/Blog|MENIUS/i);
    // At least one post card visible
    await expect(page.locator('article, [data-testid="post"], a[href*="/blog/"]').first()).toBeVisible();
  });

  test('Changelog page loads', async ({ page }) => {
    await page.goto('/changelog');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Status page loads and checks services', async ({ page }) => {
    await page.goto('/status');
    await expect(page).toHaveTitle(/Status|Estado/i);
    // Wait for service list to appear (API call)
    await expect(page.locator('text=Base de datos, text=Database').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Privacy and Terms pages load', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1').first()).toBeVisible();
    await page.goto('/terms');
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
