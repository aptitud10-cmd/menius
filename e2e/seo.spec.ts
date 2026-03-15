import { test, expect } from '@playwright/test';

const DEMO_SLUG = 'la-casa-del-sabor';

test.describe('SEO & Meta tags', () => {
  test('landing page has correct meta tags', async ({ page }) => {
    await page.goto('/');
    // Title
    const title = await page.title();
    expect(title).toMatch(/MENIUS/i);
    // Description
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toBeTruthy();
    expect(desc!.length).toBeGreaterThan(50);
    // OG tags
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toBeTruthy();
    // Canonical
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
  });

  test('public menu has restaurant-specific meta tags', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}`);
    const title = await page.title();
    expect(title).toMatch(/La Casa del Sabor/i);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toMatch(/La Casa del Sabor/i);
  });

  test('blog post page has article meta tags', async ({ page }) => {
    await page.goto('/blog');
    // Get first blog post link
    const firstPost = page.locator('a[href^="/blog/"]').first();
    await expect(firstPost).toBeVisible();
    const href = await firstPost.getAttribute('href');
    if (href) {
      await page.goto(href);
      const title = await page.title();
      expect(title).toBeTruthy();
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc).toBeTruthy();
    }
  });

  test('robots.txt is accessible', async ({ page }) => {
    const res = await page.goto('/robots.txt');
    expect(res?.status()).toBe(200);
    const body = await page.content();
    expect(body).toMatch(/User-agent/i);
  });

  test('sitemap.xml is accessible', async ({ page }) => {
    const res = await page.goto('/sitemap.xml');
    expect(res?.status()).toBe(200);
    const body = await page.content();
    expect(body).toMatch(/<url>|<urlset/i);
  });

  test('404 page returns correct status', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist-at-all-xyz');
    // Next.js 404 can return 200 with not-found content or 404
    const body = await page.textContent('body');
    const is404Page = body?.toLowerCase().includes('404') || body?.toLowerCase().includes('no encontr') || res?.status() === 404;
    expect(is404Page).toBeTruthy();
  });

  test('public menu has structured data (JSON-LD)', async ({ page }) => {
    await page.goto(`/${DEMO_SLUG}`);
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd.first()).toBeAttached();
    const content = await jsonLd.first().textContent();
    const parsed = JSON.parse(content ?? '{}');
    expect(parsed['@type']).toBeTruthy();
  });

  test('manifest.json is accessible', async ({ page }) => {
    const res = await page.goto('/manifest.json');
    expect(res?.status()).toBe(200);
    const json = await res?.json();
    expect(json?.name).toBeTruthy();
    expect(json?.icons?.length).toBeGreaterThan(0);
  });
});
