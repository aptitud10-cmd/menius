import { ImageResponse } from 'next/og';
import { createAdminClient } from '@/lib/supabase/admin';
import { demoRestaurant } from '@/lib/demo-data';
import { grillHouseRestaurant } from '@/lib/demo-data-en';

export const runtime = 'edge';
export const alt = 'Menú digital';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DEMO_MAP: Record<string, { name: string; description?: string | null }> = {
  demo: demoRestaurant,
  'la-casa-del-sabor': demoRestaurant,
  'the-grill-house': grillHouseRestaurant,
};

export default async function Image({ params }: { params: { slug: string } }) {
  const demo = DEMO_MAP[params.slug];
  let name = demo?.name ?? 'Restaurante';
  let description = demo?.description ?? '';
  let coverImageUrl: string | null = null;

  if (!demo) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from('restaurants')
        .select('name, description, cover_image_url')
        .eq('slug', params.slug)
        .single();
      if (data) {
        name = data.name;
        description = data.description ?? '';
        coverImageUrl = data.cover_image_url ?? null;
      }
    } catch (err) {
      console.error('[opengraph-image] fetch restaurant failed:', err);
    }
  }

  const initial = name.charAt(0).toUpperCase();

  // With cover photo: full-bleed image + dark overlay + name at bottom
  if (coverImageUrl) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Cover image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt={name}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {/* Dark gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0.1) 100%)',
            }}
          />
          {/* Text content at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '48px 60px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '56px', fontWeight: 800, color: 'white', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {name}
            </div>
            {description && (
              <div style={{ fontSize: '22px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                {description.length > 100 ? description.slice(0, 100) + '…' : description}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#05c8a7' }} />
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>MENIUS · Menú Digital</span>
            </div>
          </div>
        </div>
      ),
      { ...size },
    );
  }

  // Fallback: branded gradient with restaurant initial
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
          background: 'linear-gradient(145deg, #050505 0%, #0a0a12 50%, #0d0520 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-80px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            left: '-60px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
            boxShadow: '0 0 60px rgba(124,58,237,0.3)',
          }}
        >
          <span style={{ fontSize: '40px', color: 'white', fontWeight: 700 }}>
            {initial}
          </span>
        </div>
        <div
          style={{
            fontSize: '52px',
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            maxWidth: '900px',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          {name}
        </div>
        {description && (
          <div
            style={{
              fontSize: '22px',
              color: 'rgba(255,255,255,0.55)',
              textAlign: 'center',
              maxWidth: '700px',
              marginTop: '16px',
              lineHeight: 1.4,
            }}
          >
            {description.length > 120 ? description.slice(0, 120) + '…' : description}
          </div>
        )}
        <div
          style={{
            width: '60px',
            height: '3px',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, #7c3aed, #38bdf8)',
            marginTop: '32px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>
            MENIUS
          </span>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
            Menú Digital
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
