import { createClient } from '@/lib/supabase/server';
import { blogPosts } from '@/lib/blog-data';
import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${APP_URL}/signup`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${APP_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${APP_URL}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${APP_URL}/setup-profesional`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${APP_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${APP_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${APP_URL}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${APP_URL}/r/demo`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${APP_URL}/r/the-grill-house`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ];

  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${APP_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  try {
    const supabase = createClient();
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('slug, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5000);

    const restaurantPages: MetadataRoute.Sitemap = (restaurants ?? []).map((r) => ({
      url: `${APP_URL}/r/${r.slug}`,
      lastModified: new Date(r.created_at),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));

    return [...staticPages, ...blogPages, ...restaurantPages];
  } catch {
    return [...staticPages, ...blogPages];
  }
}
