export const dynamic = 'force-dynamic';

/**
 * GET → { id }: qué deploy está sirviendo producción ahora.
 * El Counter lo consulta cada pocos minutos (hooks/use-deploy-reload): si cambió
 * desde que cargó la página, hay una versión nueva y se recarga en un momento
 * tranquilo. Sin datos privados: es el mismo id que Vercel pone en las URLs.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const id = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || 'dev';
  return NextResponse.json({ id }, { headers: { 'Cache-Control': 'no-store' } });
}
