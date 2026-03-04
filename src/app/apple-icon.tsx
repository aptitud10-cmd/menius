import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#10b981',
          borderRadius: 40,
        }}
      >
        <span style={{ fontSize: 100, lineHeight: 1 }}>🍽️</span>
      </div>
    ),
    { ...size }
  );
}
