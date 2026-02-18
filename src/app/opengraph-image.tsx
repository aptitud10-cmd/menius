import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'MENIUS — Menús digitales inteligentes para restaurantes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
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
            top: '-150px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-130px',
            left: '-80px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: 800,
            color: 'white',
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          MENIUS
        </div>

        {/* Gradient line */}
        <div
          style={{
            width: '80px',
            height: '3px',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, #7c3aed, #38bdf8)',
            marginTop: '24px',
            marginBottom: '24px',
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontSize: '26px',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.65)',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.4,
          }}
        >
          Menús digitales inteligentes para restaurantes
        </div>

        {/* Features row */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            marginTop: '40px',
          }}
        >
          {['QR & Pedidos', 'IA Integrada', 'Pagos Online', 'Dashboard'].map((feat) => (
            <div
              key={feat}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                fontSize: '14px',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 500,
              }}
            >
              {feat}
            </div>
          ))}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.25)',
          }}
        >
          menius.app
        </div>
      </div>
    ),
    { ...size },
  );
}
