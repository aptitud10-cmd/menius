import { ImageResponse } from 'next/og';

/**
 * Share card for WhatsApp / iMessage / social. Typographic placeholder in the
 * Sign palette (AD 4) until S01 — the lit sign at night — replaces it.
 */
// Same runtime as the root opengraph-image (the Node render crashed the dev server on Windows).
export const runtime = 'edge';
export const alt = 'Buccaneer Diner — Open 24/7 on Astoria Blvd, East Elmhurst, Queens';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: '#17225A',
          color: '#FAF4E6',
          padding: '72px 80px',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 120, fontWeight: 700, color: '#FF5148', lineHeight: 1 }}>Buccaneer</div>
          <div style={{ fontSize: 56, fontWeight: 700, marginTop: 8 }}>Diner</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#F2B33D' }}>Open 24/7</div>
          <div style={{ fontSize: 32, marginTop: 12, color: '#AEB6C8' }}>
            9301 Astoria Blvd · East Elmhurst, Queens · (718) 429-5188
          </div>
        </div>
      </div>
    ),
    size,
  );
}
