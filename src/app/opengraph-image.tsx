import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MENIUS — Menús digitales para restaurantes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 40%, #a7f3d0 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 96,
            height: 96,
            borderRadius: 24,
            background: '#10b981',
            marginBottom: 32,
            boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
          }}
        >
          <span style={{ fontSize: 52, lineHeight: 1 }}>🍽️</span>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#064e3b',
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          MENIUS
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: '#065f46',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          Menús digitales inteligentes para restaurantes
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
          {['QR Menú', 'Pedidos en tiempo real', 'IA integrada'].map((label) => (
            <div
              key={label}
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                background: '#10b981',
                color: '#fff',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
