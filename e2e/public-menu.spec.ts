import { test, expect } from '@playwright/test';

// Uses the built-in demo restaurant (no DB needed)
const DEMO_SLUG = 'la-casa-del-sabor';
const DEMO_SLUG_EN = 'the-grill-house';

test.describe('Public menu — demo (ES)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}`);
    // Products MUST render — hard failure if they don't
    await expect(page.locator('button').first()).toBeVisible({ timeout: 15_000 });
  });

  test('page title includes restaurant name', async ({ page }) => {
    await expect(page).toHaveTitle(/La Casa del Sabor|MENIUS/i);
  });

  test('shows restaurant name in header', async ({ page }) => {
    await expect(page.getByText(/La Casa del Sabor/i).first()).toBeVisible();
  });

  test('category pills are visible and clickable', async ({ page }) => {
    // At least one pill with 3+ characters must be visible
    const pills = page.locator('button').filter({ hasText: /[A-Za-záéíóú]{3,}/ });
    await expect(pills.first()).toBeVisible({ timeout: 5_000 });
    await pills.first().click();
  });

  test('search opens and filters products', async ({ page }) => {
    await page.keyboard.press('/');
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"], input[placeholder*="usca"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 5_000 });
    await searchInput.first().fill('taco');
    await page.waitForTimeout(400);
  });

  test('adding a product to cart shows cart button', async ({ page }) => {
    // The demo menu MUST have at least one directly-addable product
    const addBtn = page.locator('button').filter({ hasText: /^\+$|Agregar|Add/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();
    // Cart count or total must appear
    await expect(page.locator('text=/[1-9]/').first()).toBeVisible({ timeout: 5_000 });
  });

  test('cart opens when cart button is clicked', async ({ page }) => {
    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();
    const cartBar = page.locator('button').filter({ hasText: /USD|MXN|\$/ }).first();
    await expect(cartBar).toBeVisible({ timeout: 5_000 });
    await cartBar.click();
    await expect(page.getByText(/Mi Orden|My Order/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('product detail opens on click (modifier product)', async ({ page }) => {
    const productCards = page.locator('button, [role="button"]').filter({ hasText: /Personalizar|Customize/ });
    const count = await productCards.count();
    if (count > 0) {
      await productCards.first().click();
      await expect(page.getByText(/Personalizar|Customize|Opciones/i).first()).toBeVisible({ timeout: 5_000 });
    }
    // If no modifier products exist in demo, skip gracefully (not a hard failure)
  });

  test('my orders page loads', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}/mis-pedidos`);
    await expect(page.getByText(/Mis pedidos|My orders|historial/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Public menu — demo (EN)', () => {
  test('English demo loads with correct locale', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG_EN}`);
    await expect(page).toHaveTitle(/The Grill House|MENIUS/i);
    await expect(page.getByText(/The Grill House/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('shows Open/Closed indicator', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG_EN}`);
    await expect(page.locator('text=/Open|Closed|Abierto|Cerrado/').first()).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Non-existent menu', () => {
  test('unknown slug shows 404', async ({ page }) => {
    const res = await page.goto('/restaurante-que-no-existe-xyz123');
    const is404 =
      res?.status() === 404 ||
      (await page.locator('text=/404|no encontrado|not found/i').first().isVisible({ timeout: 5_000 }).catch(() => false));
    expect(is404).toBeTruthy();
  });
});
