// TEMPORAL (Sprint 2, primera tarea): prueba que satori + resvg + sharp corren en
// runtime nodejs en Vercel. Solo existe en preview; se borra al terminar la prueba.
import { createElement as h } from 'react';
import { NextResponse } from 'next/server';
import { renderToPng } from '@/lib/printing/render-png';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.VERCEL_ENV === 'production') return new NextResponse(null, { status: 404 });
  const t0 = Date.now();
  const png = await renderToPng(
    h('div', { style: { display: 'flex', flexDirection: 'column', width: 576, background: '#fff', color: '#000', fontFamily: 'Inter' } },
      h('div', { style: { display: 'flex', justifyContent: 'center', fontSize: 40, fontWeight: 900 } }, 'BUCCANEER DINER'),
      h('div', { style: { display: 'flex', background: '#000', color: '#fff', fontSize: 128, fontWeight: 900, padding: '0 16px' } }, '#003'),
      h('div', { style: { display: 'flex', fontSize: 26, fontWeight: 700 } }, 'Ñandú, jalapeño, crème brûlée — ¿sí? ¡ok!'),
    ),
  );
  return new NextResponse(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Render-Ms': String(Date.now() - t0) },
  });
}
