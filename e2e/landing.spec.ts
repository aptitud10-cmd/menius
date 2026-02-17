import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders hero section with CTA buttons', async ({ page }) => {
    await expect(page.getByRole('banner').getByRole('link', { name: /MENIUS/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /ver demo en vivo/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /crear cuenta gratis/i }).first()).toBeVisible();
  });

  test('renders all 8 feature cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Menú Digital QR' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pedidos en Tiempo Real' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Analytics Inteligente' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Promociones y Cupones' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gestión de Equipo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pagos con Stripe' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fotos con IA' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Notificaciones Inteligentes' })).toBeVisible();
  });

  test('renders 3 pricing plans', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Starter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Business' })).toBeVisible();
  });

  test('renders FAQ section with questions', async ({ page }) => {
    await expect(page.locator('text=¿Necesito conocimientos técnicos?')).toBeVisible();
    await expect(page.locator('text=¿Hay comisiones por pedido?')).toBeVisible();
  });

  test('renders testimonials', async ({ page }) => {
    await expect(page.locator('text=María González').first()).toBeVisible();
    await expect(page.locator('text=Carlos Ramírez').first()).toBeVisible();
  });

  test('demo link navigates to /r/demo', async ({ page }) => {
    await page.getByRole('link', { name: /demo en español/i }).first().click();
    await page.waitForURL(/\/r\/demo/);
    await expect(page).toHaveURL(/\/r\/demo/);
  });

  test('has correct meta title', async ({ page }) => {
    await expect(page).toHaveTitle(/MENIUS/);
  });
});
