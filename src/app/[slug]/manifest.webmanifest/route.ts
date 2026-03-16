export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://menius.app').replace(/\/$/, '');

// Default MENIUS icons as fallback
const DEFAULT_ICONS = [
  { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
  { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
];

// Known demo slugs — served without a DB round-trip
const DEMO_MANIFESTS: Record<string, { name: string; description: string; logo_url: string; locale: string }> = {
  'la-casa-del-sabor': {
    name: 'La Casa del Sabor',
    description: 'Sabores auténticos mexicanos con un toque contemporáneo.',
    logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=512&h=512&fit=crop&q=80',
    locale: 'es',
  },
  'the-grill-house': {
    name: 'The Grill House',
    description: 'Premium grilled meats and fresh ingredients.',
    logo_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=512&h=512&fit=crop&q=80',
    locale: 'en',
  },
};

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } },
) {
  const { slug } = params;

  // Serve demo manifests without a DB round-trip
  const demo = DEMO_MANIFESTS[slug];
  if (demo) {
    return new NextResponse(
      JSON.stringify(buildManifest(demo.name, slug, demo.logo_url, demo.description, demo.locale), null, 2),
      { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=86400' } },
    );
  }

  try {
    const db = createAdminClient();
    const { data: restaurant } = await db
      .from('restaurants')
      .select('name, description, slug, logo_url, locale')
      .eq('slug', slug)
      .maybeSingle();

    // If restaurant not found, return default MENIUS manifest
    if (!restaurant) {
      return NextResponse.json(buildManifest('MENIUS', slug, null, null), {
        headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
      });
    }

    const manifest = buildManifest(
      restaurant.name,
      slug,
      restaurant.logo_url ?? null,
      restaurant.description ?? null,
      restaurant.locale ?? 'es',
    );

    return new NextResponse(JSON.stringify(manifest, null, 2), {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    // On error, serve a minimal valid manifest so the page still works
    return NextResponse.json(buildManifest('Menú Digital', slug, null, null), {
      headers: { 'Content-Type': 'application/manifest+json' },
    });
  }
}

function buildManifest(
  name: string,
  slug: string,
  logoUrl: string | null,
  description: string | null,
  locale = 'es',
) {
  const startUrl = `/${slug}`;
  const isEn = locale === 'en';

  const icons = logoUrl
    ? [
        { src: logoUrl, sizes: '192x192', type: guessType(logoUrl), purpose: 'any' },
        { src: logoUrl, sizes: '512x512', type: guessType(logoUrl), purpose: 'any maskable' },
        ...DEFAULT_ICONS,
      ]
    : DEFAULT_ICONS;

  return {
    id: startUrl,
    name,
    short_name: name.length <= 12 ? name : name.split(' ').slice(0, 2).join(' ').slice(0, 12),
    description: description ?? (isEn ? `Order from ${name} on your phone.` : `Pide en ${name} desde tu teléfono.`),
    start_url: startUrl,
    scope: startUrl,
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#10b981',
    lang: locale,
    categories: ['food', 'lifestyle'],
    prefer_related_applications: false,
    icons,
    shortcuts: [
      {
        name: isEn ? 'View menu' : 'Ver menú',
        short_name: isEn ? 'Menu' : 'Menú',
        url: startUrl,
        icons: [{ src: logoUrl ?? '/icons/icon-96.svg', sizes: '96x96' }],
      },
    ],
  };
}

function guessType(url: string): string {
  if (url.endsWith('.svg')) return 'image/svg+xml';
  if (url.endsWith('.png')) return 'image/png';
  if (url.endsWith('.webp')) return 'image/webp';
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/png';
}
