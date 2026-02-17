import { createClient } from '@/lib/supabase/server';
import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${APP_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${APP_URL}/r/demo`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${APP_URL}/r/buccaneer-diner`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];

  try {
    const supabase = createClient();
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('slug, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(500);

    const restaurantPages: MetadataRoute.Sitemap = (restaurants ?? []).map((r) => ({
      url: `${APP_URL}/r/${r.slug}`,
      lastModified: new Date(r.created_at),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    }));

    return [...staticPages, ...restaurantPages];
  } catch {
    return staticPages;
  }
}
