/**
 * GET /api/tenant/printers/status — estado CloudPRNT para la counter app
 * (SPEC impresión §1b regla 3 y F5). La consulta al montar y cada 2 min:
 * con `cloudprntActive` apaga las impresiones locales; con `printers[]` muestra
 * online/offline y el banner rojo de pedidos sin imprimir.
 */
import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { loadPrintersStatus } from '@/lib/printing/printers-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const tenant = await getTenant({ allowDevice: true });
  if (!tenant) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const status = await loadPrintersStatus(tenant.restaurantId);
  return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
}
