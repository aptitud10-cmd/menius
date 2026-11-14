/**
 * GET /api/printing/preview/<orderId>[?kind=reprint]
 *
 * El ticket de un pedido como PNG: exactamente el mismo render que recibe la
 * impresora por CloudPRNT (CA-11). Lo puede ver el dueño o la tablet vinculada,
 * solo para pedidos de SU restaurante.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getTenant } from '@/lib/auth/get-tenant';
import { loadTicketData } from '@/lib/printing/load-ticket';
import { renderTicketPng } from '@/lib/printing/render-ticket';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const logger = createLogger('printing-preview');
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const { orderId } = params;
  if (!UUID_RE.test(orderId)) return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
  const kind = req.nextUrl.searchParams.get('kind') === 'reprint' ? 'reprint' : 'order';

  const tenant = await getTenant({ allowDevice: true });
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await loadTicketData({ orderId, restaurantId: tenant.restaurantId, kind });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const png = await renderTicketPng(data);
    return new NextResponse(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' },
    });
  } catch (err: unknown) {
    logger.error('ticket preview failed', { orderId, message: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: 'printing/preview', orderId });
    return NextResponse.json({ error: 'Render failed' }, { status: 500 });
  }
}
