import { test, expect } from '@playwright/test';

test.describe('Not found & error handling', () => {
  test('reserved paths do not show restaurant menus', async ({ page }) => {
    // These are reserved paths in RESERVED_PATHS set — should NOT render as menu
    const reserved = ['/app', '/api', '/admin', '/blog', '/faq'];
    for (const path of reserved) {
      const res = await page.goto(path);
      // Should either redirect (3xx), show auth wall (login redirect), or load the actual page
      // — but NOT render a restaurant menu shell
      const title = await page.title();
      expect(title).not.toMatch(/Menú Digital.*MENIUS/i);
    }
  });

  test('offline page exists', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.locator('body')).toBeVisible();
  });

  test('API health endpoint responds', async ({ page }) => {
    const res = await page.goto('/api/billing/health');
    // Should return JSON (even if 401 for unauthenticated)
    expect([200, 401, 403]).toContain(res?.status());
  });

  test('API status endpoint responds with services', async ({ page }) => {
    const res = await page.goto('/api/status');
    expect(res?.status()).toBe(200);
    const json = await res?.json();
    expect(json.services).toBeDefined();
    expect(Array.isArray(json.services)).toBeTruthy();
    expect(json.services.length).toBeGreaterThan(0);
    // All services have required fields
    for (const svc of json.services) {
      expect(svc.id).toBeTruthy();
      expect(svc.status).toMatch(/operational|degraded|outage/);
      expect(typeof svc.latency).toBe('number');
    }
  });

  test('non-existent API route returns 404', async ({ page }) => {
    const res = await page.goto('/api/this-does-not-exist');
    expect(res?.status()).toBe(404);
  });
});
