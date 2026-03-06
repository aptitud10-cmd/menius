import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app/', '/api/', '/onboarding/', '/auth/', '/admin/', '/r/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
