import { ImageResponse } from 'next/og';
import { B_DINER, B_TOP } from './Wordmark';

/**
 * Share card (WhatsApp / iMessage / social): lockup B centered on Paper, the
 * roof sign's colors (AD 25.4), no other text — the title and address travel in
 * the link preview itself. Departs from AD 10.4 (photo left, lockup right) on
 * purpose: WhatsApp crops the card to its central square, which cut the lockup
 * in half. Centered at 540px it survives that crop with ~45px to spare.
 */
// Same runtime as the root opengraph-image (the Node render crashed the dev server on Windows).
export const runtime = 'edge';
export const alt = 'Buccaneer Diner';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const W = 540;
const H = Math.round((W * 219.8) / 690.4);

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#FAF4E6',
        }}
      >
        <svg width={W} height={H} viewBox="0 0 690.4 219.8">
          <path fill="#C8152A" d={B_TOP} />
          <path fill="#17225A" d={B_DINER} />
        </svg>
      </div>
    ),
    size,
  );
}
