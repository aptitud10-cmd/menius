import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { demoRestaurant } from '@/lib/demo-data';
import { buccaneerRestaurant } from '@/lib/demo-data-en';

export const runtime = 'edge';
export const alt = 'Menú digital';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const DEMO_MAP: Record<string, { name: string; description?: string | null }> = {
  demo: demoRestaurant,
  'buccaneer-diner': buccaneerRestaurant,
};

export default async function Image({ params }: { params: { slug: string } }) {
  const demo = DEMO_MAP[params.slug];
  let name = demo?.name ?? 'Restaurante';
  let description = demo?.description ?? '';

  if (!demo) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('restaurants')
        .select('name, description')
        .eq('slug', params.slug)
        .single();
      if (data) {
        name = data.name;
        description = data.description ?? '';
      }
    } catch (err) {
      console.error('[opengraph-image] fetch restaurant failed:', err);
    }
  }

  const initial = name.charAt(0).toUpperCase();

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
        {/* Decorative orbs */}
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

        {/* Restaurant initial */}
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
          <span style={{ fontSize: '40px', color: 'white', fontWeight: 700 }}>{initial}</span>
        </div>

        {/* Restaurant name */}
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

        {/* Divider */}
        <div
          style={{
            width: '60px',
            height: '3px',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, #7c3aed, #38bdf8)',
            marginTop: '32px',
          }}
        />

        {/* Bottom branding */}
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
