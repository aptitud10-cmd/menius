import { test, expect } from '@playwright/test';

test.describe('404 Not Found', () => {
  test('shows custom 404 for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.locator('text=404')).toBeVisible();
  });

  test('shows error for non-existent restaurant slug', async ({ page }) => {
    const response = await page.goto('/r/non-existent-restaurant-xyz');
    // Should either 404 or show not found UI
    const bodyText = await page.textContent('body');
    const isNotFound = bodyText?.includes('404') || bodyText?.includes('no encontrad') || response?.status() === 404;
    expect(isNotFound).toBeTruthy();
  });
});
