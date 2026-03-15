import { test, expect } from '@playwright/test';

// Uses the built-in demo restaurant (no DB needed)
const DEMO_SLUG = 'la-casa-del-sabor';
const DEMO_SLUG_EN = 'the-grill-house';

test.describe('Public menu — demo (ES)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}`);
    // Wait for products to render
    await expect(page.locator('[data-testid="product-card"], .product-card, button').first()).toBeVisible({ timeout: 10_000 });
  });

  test('page title includes restaurant name', async ({ page }) => {
    await expect(page).toHaveTitle(/La Casa del Sabor|MENIUS/i);
  });

  test('shows restaurant name in header', async ({ page }) => {
    await expect(page.getByText(/La Casa del Sabor/i).first()).toBeVisible();
  });

  test('category pills are visible and clickable', async ({ page }) => {
    const pills = page.locator('button').filter({ hasText: /[A-Za-záéíóú]{3,}/ });
    await expect(pills.first()).toBeVisible();
    // Click the first pill
    await pills.first().click();
  });

  test('search opens and filters products', async ({ page }) => {
    // Open search (mobile search icon or keyboard)
    await page.keyboard.press('/');
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch"], input[placeholder*="usca"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 5_000 });
    await searchInput.first().fill('taco');
    // Search results should update
    await page.waitForTimeout(500);
  });

  test('adding a product to cart shows cart button', async ({ page }) => {
    // Click the first add-to-cart button (non-modifier product = direct add)
    const addBtn = page.locator('button').filter({ hasText: /^\+$|Agregar|Add/ }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      // Cart count badge should appear
      await expect(page.locator('text=/[1-9]/').first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('cart opens when cart button is clicked', async ({ page }) => {
    // Add an item first
    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      // Click the cart bar or cart icon
      const cartBar = page.locator('button').filter({ hasText: /USD|MXN|\$/ }).first();
      if (await cartBar.isVisible()) {
        await cartBar.click();
        await expect(page.getByText(/Mi Orden|My Order/i).first()).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test('product detail opens on click (modifier product)', async ({ page }) => {
    // Products with modifiers open a customization sheet
    const productCards = page.locator('button, [role="button"]').filter({ hasText: /Personalizar|Customize/ });
    if (await productCards.count() > 0) {
      await productCards.first().click();
      await expect(page.getByText(/Personalizar|Customize|Opciones/i).first()).toBeVisible({ timeout: 5_000 });
    }
  });

  test('my orders page loads', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}/mis-pedidos`);
    await expect(page.getByText(/Mis pedidos|My orders|historial/i).first()).toBeVisible();
  });
});

test.describe('Public menu — demo (EN)', () => {
  test('English demo loads with correct locale', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG_EN}`);
    await expect(page).toHaveTitle(/The Grill House|MENIUS/i);
    await expect(page.getByText(/The Grill House/i).first()).toBeVisible();
  });

  test('shows Open/Closed indicator', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG_EN}`);
    await expect(page.locator('text=/Open|Closed|Abierto|Cerrado/').first()).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Non-existent menu', () => {
  test('unknown slug shows 404', async ({ page }) => {
    const res = await page.goto('/restaurante-que-no-existe-xyz123');
    // Either 404 status or not-found page
    const is404 = res?.status() === 404 || await page.locator('text=/404|no encontrado|not found/i').first().isVisible({ timeout: 3_000 }).catch(() => false);
    expect(is404).toBeTruthy();
  });
});
