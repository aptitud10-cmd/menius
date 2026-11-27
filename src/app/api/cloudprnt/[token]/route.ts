/**
 * Endpoint Star CloudPRNT de UNA impresora: /api/cloudprnt/<secreto>
 * (API impresión §1). La lógica del protocolo vive en lib/printing/cloudprnt.ts.
 *
 * - Secreto inválido → 404 vacío, sin tocar pedidos. Sin rate limit: el
 *   secreto es de 256 bits (API §1).
 * - Nunca se loguea el path: contiene el secreto.
 * - El middleware de auth ya excluye /api (middleware.ts).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { captureError } from '@/lib/error-reporting';
import {
  handlePoll, handleGet, handleDelete, hashPrinterToken, isPlausiblePrinterToken,
  SERVER_SETTING_RESPONSE, type CloudPrntStore, type PrinterRow, type ClaimedJob,
} from '@/lib/printing/cloudprnt';
import { loadTicketData, loadTestTicketData } from '@/lib/printing/load-ticket';
import { renderTicketPng, renderTestTicketPng } from '@/lib/printing/render-ticket';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const logger = createLogger('cloudprnt');

type Ctx = { params: Promise<{ token: string }> };

const PRINTER_COLUMNS = 'id, restaurant_id, mac_address, last_poll_at, last_asb_status, last_client_info';

function notFound() {
  return new NextResponse(null, { status: 404 });
}

async function findPrinter(token: string): Promise<PrinterRow | null> {
  if (!isPlausiblePrinterToken(token)) return null;
  const { data, error } = await createAdminClient()
    .from('printers')
    .select(PRINTER_COLUMNS)
    .eq('token_hash', hashPrinterToken(token))
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    logger.error('printer lookup failed', { code: error.code });
    return null;
  }
  return (data as PrinterRow | null) ?? null;
}

function makeStore(): CloudPrntStore {
  const db = createAdminClient();
  return {
    async updatePrinter(id, patch) {
      const { error } = await db.from('printers').update(patch).eq('id', id);
      if (error) logger.error('printer update failed', { printerId: id, code: error.code });
    },
    async macUsedByOther(mac, printerId) {
      const { data } = await db.from('printers').select('id').eq('mac_address', mac).neq('id', printerId).limit(1);
      return (data?.length ?? 0) > 0;
    },
    async nextQueuedJobId(printerId) {
      const { data, error } = await db
        .from('print_jobs')
        .select('id')
        .eq('printer_id', printerId)
        .eq('status', 'queued')
        .or(`not_before.is.null,not_before.lte.${new Date().toISOString()}`)
        .order('created_at', { ascending: true })
        .order('copy_index', { ascending: true })
        .order('id', { ascending: true })
        .limit(1);
      if (error) logger.error('next job query failed', { printerId, code: error.code });
      return data?.[0]?.id ?? null;
    },
    async oldestSentJobId(printerId) {
      const { data } = await db
        .from('print_jobs').select('id').eq('printer_id', printerId).eq('status', 'sent')
        .order('sent_at', { ascending: true }).limit(1);
      return data?.[0]?.id ?? null;
    },
    async claimJob(jobId, printerId, mediaType) {
      const { data, error } = await db.rpc('claim_print_job', { p_job: jobId, p_printer: printerId, p_media_type: mediaType });
      if (error) logger.error('claim failed', { jobId, code: error.code });
      const row = Array.isArray(data) ? data[0] : data;
      return (row as ClaimedJob | undefined) ?? null;
    },
    async finishJob(jobId, printerId, code) {
      const { data, error } = await db.rpc('finish_print_job', { p_job: jobId, p_printer: printerId, p_code: code });
      if (error) logger.error('finish failed', { jobId, code: error.code });
      return typeof data === 'string' ? data : null;
    },
    warn(message, meta) {
      logger.warn(message, meta);
    },
  };
}

async function renderJob(job: ClaimedJob): Promise<Buffer | null> {
  if (job.kind === 'test') {
    const d = await loadTestTicketData(job.restaurant_id);
    return d ? renderTestTicketPng(d) : null;
  }
  if (!job.order_id) return null;
  const d = await loadTicketData({
    orderId: job.order_id,
    restaurantId: job.restaurant_id,
    kind: job.kind,
    reprintedAt: job.kind === 'reprint' ? new Date(job.created_at) : undefined,
  });
  return d ? renderTicketPng(d) : null;
}

export async function POST(req: NextRequest, props: Ctx) {
  const params = await props.params;
  const printer = await findPrinter(params.token);
  if (!printer) return notFound();
  const body: unknown = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await handlePoll(printer, body, makeStore()));
  } catch (err: unknown) {
    logger.error('poll failed', { printerId: printer.id, message: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: 'cloudprnt/poll', printerId: printer.id });
    // La impresora vuelve a preguntar en unos segundos.
    return NextResponse.json({ jobReady: false });
  }
}

export async function GET(req: NextRequest, props: Ctx) {
  const params = await props.params;
  const printer = await findPrinter(params.token);
  if (!printer) return notFound();

  const result = await handleGet(printer, req.nextUrl.searchParams, req.headers.get('x-star-token'), makeStore());
  if (result.kind === 'setting') return NextResponse.json(SERVER_SETTING_RESPONSE);
  if (result.kind === 'unsupported_media') return new NextResponse(null, { status: 415 });
  if (result.kind === 'not_found') return notFound();

  const { job } = result;
  if (job.restaurant_id !== printer.restaurant_id) {
    // Imposible por las FKs compuestas; si pasa, no se imprime nada ajeno.
    logger.error('job/printer restaurant mismatch', { jobId: job.id, printerId: printer.id });
    return notFound();
  }
  try {
    const png = await renderJob(job);
    if (!png) {
      logger.error('ticket data missing', { jobId: job.id });
      return new NextResponse(null, { status: 500 });
    }
    return new NextResponse(new Uint8Array(png), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' },
    });
  } catch (err: unknown) {
    // El job queda 'sent': el cron lo reintenta a los 120 s (o lo da por fallido).
    logger.error('ticket render failed', { jobId: job.id, message: err instanceof Error ? err.message : String(err) });
    captureError(err, { route: 'cloudprnt/get', jobId: job.id });
    return new NextResponse(null, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, props: Ctx) {
  const params = await props.params;
  const printer = await findPrinter(params.token);
  if (!printer) return notFound();
  const status = await handleDelete(printer, req.nextUrl.searchParams, req.headers.get('x-star-token'), makeStore());
  if (status && status !== 'printed') {
    logger.warn('printer reported error', { printerId: printer.id, code: req.nextUrl.searchParams.get('code'), status });
  }
  return new NextResponse(null, { status: 200 });
}
