/**
 * Lado servidor de las impresoras CloudPRNT (API impresión §2). Quien llama ya
 * validó que `restaurantId` es suyo (getTenant). Admin client + filtro explícito
 * por restaurant_id en cada query: el aislamiento no depende solo del RLS.
 * Columnas verificadas en supabase/schema.sql (regla 11 de CLAUDE.md).
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashPrinterToken } from './cloudprnt';
import { computePrintersStatus, FAILED_WINDOW_MS, type PrintersStatusResponse } from './printer-status';

/** 32 bytes aleatorios en base64url (43 caracteres): el secreto de la URL. */
export function newPrinterToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashPrinterToken(token) };
}

/** La URL que se pega en la configuración CloudPRNT de la impresora. */
export function printerServerUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app').replace(/\/$/, '');
  return `${base}/api/cloudprnt/${token}`;
}

export async function loadPrintersStatus(restaurantId: string): Promise<PrintersStatusResponse> {
  const db = createAdminClient();
  const since = new Date(Date.now() - FAILED_WINDOW_MS).toISOString();
  const [{ data: printers }, { data: jobs }] = await Promise.all([
    db.from('printers').select('id, name, is_active, last_poll_at').eq('restaurant_id', restaurantId),
    db.from('print_jobs')
      .select('printer_id, status, not_before, created_at')
      .eq('restaurant_id', restaurantId)
      .or(`status.eq.queued,and(status.eq.failed,created_at.gte.${since})`)
      .limit(500),
  ]);
  return computePrintersStatus(printers ?? [], jobs ?? []);
}

/**
 * Encola un ticket manual (reimpresión o prueba) en las impresoras activas del
 * restaurante, o en una sola si viene printerId. Devuelve cuántos jobs creó.
 */
export async function enqueueManualJob(args: {
  restaurantId: string;
  kind: 'reprint' | 'test';
  orderId?: string;
  printerId?: string;
  requestedBy: string;
}): Promise<number> {
  const db = createAdminClient();
  let q = db.from('printers').select('id').eq('restaurant_id', args.restaurantId).eq('is_active', true);
  if (args.printerId) q = q.eq('id', args.printerId);
  const { data: printers, error } = await q;
  if (error || !printers?.length) return 0;

  const rows = printers.map((p) => ({
    restaurant_id: args.restaurantId,
    printer_id: p.id,
    order_id: args.orderId ?? null,
    kind: args.kind,
    requested_by: args.requestedBy,
  }));
  const { error: insErr } = await db.from('print_jobs').insert(rows);
  if (insErr) throw new Error(insErr.message);
  return rows.length;
}
