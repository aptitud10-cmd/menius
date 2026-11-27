import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import { demoRestaurant } from '@/lib/demo-data';
import { grillHouseRestaurant } from '@/lib/demo-data-en';
import { trackerBrand } from '@/lib/tracker-brand';

// Edge renderer: it reads JPEG and PNG, not WebP. A .webp cover used to crash
// the whole route ("Image size cannot be determined"); now the card skips the
// photo and uses the store color + logo. Covers uploaded today are __lg.jpg.
export const runtime = 'edge';
export const alt = 'Order online';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DEMO_MAP: Record<string, { name: string; description?: string | null }> = {
  demo: demoRestaurant,
  'la-casa-del-sabor': demoRestaurant,
  'the-grill-house': grillHouseRestaurant,
};

/** The URL if the renderer can draw it (JPEG/PNG), otherwise null. */
function drawable(url: string | null): string | null {
  if (!url) return null;
  const path = url.split('?')[0].toLowerCase();
  return /\.(jpe?g|png)$/.test(path) ? url : null;
}

// Inter like the menu. If the font can't be fetched the card still renders
// with the default face.
const INTER = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-';
async function loadFonts() {
  try {
    const [w500, w700] = await Promise.all(
      [500, 700].map((w) => fetch(INTER + w + '-normal.woff').then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))),
    );
    return [
      { name: 'Inter', data: w500, weight: 500 as const, style: 'normal' as const },
      { name: 'Inter', data: w700, weight: 700 as const, style: 'normal' as const },
    ];
  } catch {
    return undefined;
  }
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n).trimEnd() + '…' : s);

export default async function Image(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const demo = DEMO_MAP[params.slug];
  let name = demo?.name ?? 'Restaurant';
  let description = demo?.description ?? '';
  let coverUrl: string | null = null;
  let logoUrl: string | null = null;
  let locale = 'es';
  let brandColor: string | null = null;

  if (!demo) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('restaurants')
        .select('name, description, cover_image_url, logo_url, locale, brand_color')
        .eq('slug', params.slug)
        .maybeSingle();
      if (data) {
        name = data.name;
        description = data.description ?? '';
        coverUrl = data.cover_image_url ?? null;
        logoUrl = data.logo_url ?? null;
        locale = data.locale ?? 'es';
        brandColor = data.brand_color ?? null;
      }
    } catch (err) {
      console.error('[opengraph-image] fetch restaurant failed:', err);
    }
  }

  const en = locale === 'en';
  const cta = en ? 'Order online' : 'Pide en línea';
  const b = trackerBrand(brandColor);
  // On the dark photo the store color reads; without one, a white pill.
  const pill = b.fallback ? { bg: '#FFFFFF', fg: '#111114' } : { bg: b.brand, fg: b.ink };

  const fonts = await loadFonts();
  const cover = drawable(coverUrl);
  const logo = drawable(logoUrl);

  // Everything sits in the centre 600×600: WhatsApp on a computer (and some
  // phones) crops the card to a small square from the middle, so a left-aligned
  // layout or a line of description came out as unreadable specks. The
  // description already travels as text next to the image (og:description).
  const NAME_SIZE = name.length > 22 ? 56 : 72;

  const logoEl = (px: number) =>
    logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt="" width={px} height={px} style={{ width: px, height: px, borderRadius: px / 2, border: '6px solid #FFFFFF' }} />
    ) : (
      <div style={{ width: px, height: px, borderRadius: px / 2, background: '#FFFFFF', color: b.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px * 0.42, fontWeight: 700 }}>
        {name.charAt(0).toUpperCase()}
      </div>
    );

  const nameEl = (
    <div style={{ display: 'flex', maxWidth: 600, fontSize: NAME_SIZE, fontWeight: 700, lineHeight: 1.05, textAlign: 'center', justifyContent: 'center', letterSpacing: '-0.02em' }}>
      {clip(name, 40)}
    </div>
  );

  if (cover) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', fontFamily: 'Inter, sans-serif' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" width={size.width} height={size.height} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: 'radial-gradient(circle at 50% 55%, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.2) 100%)',
            }}
          />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, color: '#FFFFFF' }}>
            {logoEl(170)}
            {nameEl}
            <div style={{ display: 'flex', padding: '16px 36px', borderRadius: 999, background: pill.bg, color: pill.fg, fontSize: 32, fontWeight: 700 }}>{cta}</div>
          </div>
        </div>
      ),
      { ...size, fonts },
    );
  }

  // No cover: the store color as the background, logo and name centered.
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 24,
          background: b.brand,
          color: b.ink,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {logoEl(220)}
        {nameEl}
        <div style={{ display: 'flex', padding: '16px 36px', borderRadius: 999, background: '#FFFFFF', color: '#111114', fontSize: 32, fontWeight: 700 }}>{cta}</div>
      </div>
    ),
    { ...size, fonts },
  );
}
