import { ImageResponse } from 'next/og';
import { blogPosts } from '@/lib/blog-data';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const CATEGORY_COLORS: Record<string, string> = {
  'Guías': '#059669',
  'Guides': '#059669',
  'Tendencias': '#7c3aed',
  'Trends': '#7c3aed',
  'Marketing': '#d97706',
  'Tecnología': '#2563eb',
  'Technology': '#2563eb',
  'Negocios': '#0891b2',
  'Business': '#0891b2',
};

export default function BlogOgImage({ params }: { params: { slug: string } }) {
  const post = blogPosts.find((p) => p.slug === params.slug);

  const title = post?.title ?? 'Blog — MENIUS';
  const description = post?.description ?? 'Menús digitales inteligentes para restaurantes.';
  const category = post?.category ?? 'Blog';
  const readTime = post?.readTime ?? 5;
  const accentColor = CATEGORY_COLORS[category] ?? '#059669';

  // Trim title to ~80 chars to avoid overflow
  const displayTitle = title.length > 78 ? title.slice(0, 75) + '…' : title;
  // Trim description to ~120 chars
  const displayDesc = description.length > 118 ? description.slice(0, 115) + '…' : description;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#050505',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px 72px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 480,
            height: 480,
            background: `${accentColor}18`,
            borderRadius: '50%',
            filter: 'blur(80px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 320,
            height: 320,
            background: 'rgba(99,102,241,0.08)',
            borderRadius: '50%',
            filter: 'blur(60px)',
          }}
        />

        {/* Top: Logo + Category */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 48 }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.04em' }}>
            MENIUS
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: `${accentColor}22`,
                border: `1px solid ${accentColor}44`,
                fontSize: 13,
                fontWeight: 600,
                color: accentColor,
              }}
            >
              {category}
            </div>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: 13,
                color: '#9ca3af',
              }}
            >
              {readTime} min
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
          {/* Accent bar */}
          <div
            style={{
              width: 48,
              height: 4,
              borderRadius: 999,
              background: accentColor,
              marginBottom: 28,
            }}
          />

          {/* Title */}
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: 24,
              maxWidth: 900,
            }}
          >
            {displayTitle}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 22,
              color: '#9ca3af',
              lineHeight: 1.5,
              maxWidth: 780,
            }}
          >
            {displayDesc}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 28,
            borderTop: '1px solid rgba(255,255,255,0.07)',
            marginTop: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              🍽️
            </div>
            <span style={{ fontSize: 15, color: '#6b7280' }}>menius.app/blog</span>
          </div>
          <span style={{ fontSize: 15, color: '#374151' }}>Blog MENIUS</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
