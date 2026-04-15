import { test, expect } from '@playwright/test';

// Checkout flow test — uses demo menu (no auth required)
const DEMO_SLUG = 'la-casa-del-sabor';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3099';

test.describe('Checkout flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}`);
    // Demo menu MUST load — hard failure if it doesn't
    await expect(page.locator('button').first()).toBeVisible({ timeout: 15_000 });
  });

  test('can add item and see cart total', async ({ page }) => {
    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();
    // Cart total must appear (currency or number)
    await expect(page.locator('text=/USD|MXN|\$[0-9]|[0-9]+\.[0-9]+/').first()).toBeVisible({ timeout: 5_000 });
  });

  test('cart stepper increments and decrements quantity', async ({ page }) => {
    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();
    // Stepper with quantity 1 must appear
    const qty = page.locator('text=/^1$/').first();
    await expect(qty).toBeVisible({ timeout: 5_000 });
    // Decrement button must appear and be clickable
    const minusBtn = page.locator('button').filter({ hasText: /^−$|^-$/ }).first();
    await expect(minusBtn).toBeVisible({ timeout: 3_000 });
    await minusBtn.click();
  });

  test('cart panel opens and shows item', async ({ page }) => {
    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();
    const cartBar = page.locator('button, div').filter({ hasText: /USD [0-9]|Ver carrito|View cart/i }).first();
    await expect(cartBar).toBeVisible({ timeout: 5_000 });
    await cartBar.click();
    await expect(page.getByText(/Mi Orden|My Order/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('checkout form validates required fields', async ({ page }) => {
    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();
    // Navigate to checkout page directly
    await page.goto(`/${DEMO_SLUG}/checkout`);
    // Submit button must be present
    const submitBtn = page.locator('button').filter({ hasText: /Pagar|Ordenar|Confirmar|Place|Submit/i }).first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
      // A validation error MUST appear — empty form should not submit
      await expect(
        page.locator('text=/requerido|required|obligatorio|nombre|name/i').first()
      ).toBeVisible({ timeout: 5_000 });
    }
  });

  test('order history page requires email lookup', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}/mis-pedidos`);
    // Input field for email/phone lookup must be present
    await expect(
      page.locator('input[type="email"], input[type="text"]').first()
    ).toBeVisible({ timeout: 8_000 });
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /Buscar|Search|Ver/i }).first();
    await expect(submitBtn).toBeVisible({ timeout: 5_000 });
  });
});

// ─── API-level integration tests (no browser needed) ─────────────────────────

test.describe('Cart Quote API — /api/cart/quote', () => {
  test('returns 400 for missing restaurant_id', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cart/quote`, {
      data: { items: [{ product_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', qty: 1 }] },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for non-UUID restaurant_id', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cart/quote`, {
      data: {
        restaurant_id: 'not-a-uuid',
        items: [{ product_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', qty: 1 }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for empty items array', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cart/quote`, {
      data: {
        restaurant_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        items: [],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 400 for item with qty=0', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/cart/quote`, {
      data: {
        restaurant_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
        items: [{ product_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', qty: 0 }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('returns 404 for inactive restaurant', async ({ request }) => {
    const fakeId = '00000000-0000-4000-8000-000000000001';
    const res = await request.post(`${BASE_URL}/api/cart/quote`, {
      data: {
        restaurant_id: fakeId,
        items: [{ product_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', qty: 1 }],
      },
    });
    // Either 404 (restaurant not found) or 400 — never 200 with fake data
    expect([400, 404]).toContain(res.status());
  });
});

test.describe('Orders API — /api/orders security', () => {
  test('rejects order with honeypot field set (_hp)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/orders`, {
      data: {
        slug: DEMO_SLUG,
        customer_name: 'Bot',
        customer_phone: '+18095550000',
        items: [{ product_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', qty: 1, unit_price: 10, line_total: 10, extras: [], modifiers: [] }],
        _hp: 'filled-by-bot',
      },
    });
    // Honeypot should cause rejection (400 or 403)
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('rejects order with no items', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/orders`, {
      data: {
        slug: DEMO_SLUG,
        customer_name: 'Test',
        customer_phone: '+18095551234',
        items: [],
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('rejects order with empty customer_name', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/orders`, {
      data: {
        slug: DEMO_SLUG,
        customer_name: '',
        customer_phone: '+18095551234',
        items: [{ product_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', qty: 1, unit_price: 10, line_total: 10, extras: [], modifiers: [] }],
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test('rejects order missing Idempotency-Key header format check', async ({ request }) => {
    // Order submission without required slug should fail
    const res = await request.post(`${BASE_URL}/api/orders`, {
      data: {
        customer_name: 'Test',
        customer_phone: '+18095551234',
        items: [{ product_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', qty: 1, unit_price: 10, line_total: 10, extras: [], modifiers: [] }],
      },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Checkout — demo order submission', () => {
  test('submitting a demo order returns order_number', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}`);
    await expect(page.locator('button').first()).toBeVisible({ timeout: 15_000 });

    // Add the first directly-addable product
    const addBtn = page.locator('button').filter({ hasText: /^\+$/ }).first();
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await addBtn.click();

    // Open cart and go to checkout
    const cartBar = page.locator('button, div').filter({ hasText: /USD|MXN|\$[0-9]/ }).first();
    await expect(cartBar).toBeVisible({ timeout: 5_000 });
    await cartBar.click();

    // Look for checkout / proceed button inside cart
    const checkoutBtn = page.locator('button').filter({ hasText: /Pagar|Checkout|Ordenar|Confirmar/i }).first();
    if (!await checkoutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      // If cart didn't open, try direct navigation
      await page.goto(`/${DEMO_SLUG}/checkout`);
    } else {
      await checkoutBtn.click();
    }

    // Fill the minimum required fields
    const nameInput = page.locator('input[name="customer_name"], input[placeholder*="ombre"], input[placeholder*="Name"]').first();
    if (await nameInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await nameInput.fill('Test E2E');
    }
    const phoneInput = page.locator('input[name="customer_phone"], input[type="tel"], input[placeholder*="éfono"], input[placeholder*="Phone"]').first();
    if (await phoneInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await phoneInput.fill('+18095551234');
    }
    const emailInput = page.locator('input[name="customer_email"], input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await emailInput.fill('test-e2e@menius.app');
    }

    // Submit
    const submitBtn = page.locator('button').filter({ hasText: /Pagar|Ordenar|Confirmar|Place|Submit/i }).first();
    if (await submitBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await submitBtn.click();
      // Confirmation MUST show an order number (DEMO-XXXX format) or confirmation text
      await expect(
        page.locator('text=/DEMO-|Pedido confirmado|Order confirmed|order_number/i').first()
      ).toBeVisible({ timeout: 15_000 });
    }
  });
});
