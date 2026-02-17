import { test, expect } from '@playwright/test';

test.describe('Public Menu — Demo Restaurant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/r/demo');
    await page.waitForLoadState('networkidle');
  });

  test('renders restaurant name', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('La Cocina de MENIUS');
  });

  test('renders category buttons', async ({ page }) => {
    // Use getByRole button with exact match to find category pills
    const entradas = page.getByRole('button', { name: 'Entradas' });
    await expect(entradas.first()).toBeVisible();
  });

  test('renders product cards with prices', async ({ page }) => {
    const priceElements = page.locator('text=/\\$\\d+/');
    await expect(priceElements.first()).toBeVisible();
  });

  test('clicking a product opens detail modal', async ({ page }) => {
    await page.locator('h3').filter({ hasText: 'Tacos al Pastor' }).first().click();
    await expect(page.locator('button').filter({ hasText: /agregar/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('add product to cart updates cart badge', async ({ page }) => {
    await page.locator('h3').filter({ hasText: 'Tacos al Pastor' }).first().click();
    const addBtn = page.locator('button').filter({ hasText: /agregar/i }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click();

    await expect(page.locator('[aria-label="Cart"]').first()).toBeVisible();
  });

  test('cart drawer shows added item', async ({ page }) => {
    await page.locator('h3').filter({ hasText: 'Tacos al Pastor' }).first().click();
    const addBtn = page.locator('button').filter({ hasText: /agregar/i }).first();
    await addBtn.waitFor({ state: 'visible', timeout: 5000 });
    await addBtn.click();

    await page.locator('[aria-label="Cart"]').first().click();

    await expect(page.locator('h4').filter({ hasText: 'Tacos al Pastor' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total').first()).toBeVisible();
  });

  test('has correct meta title', async ({ page }) => {
    await expect(page).toHaveTitle(/La Cocina de MENIUS/);
  });

  test('JSON-LD structured data is present', async ({ page }) => {
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toBeTruthy();
    const data = JSON.parse(jsonLd!);
    expect(data['@type']).toBe('Restaurant');
    expect(data.name).toBe('La Cocina de MENIUS');
  });
});
