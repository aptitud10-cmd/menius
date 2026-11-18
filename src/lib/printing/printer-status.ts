/**
 * Estado de las impresoras CloudPRNT (SPEC impresión F5, API §2 getPrinterStatus).
 * Puro: lo comparten el endpoint de la counter app y el panel, y se testea sin base.
 */

/** Sin poll en 60 s → la impresora está desconectada (F5). */
export const PRINTER_OFFLINE_AFTER_MS = 60_000;
/**
 * CloudPRNT "activo" para apagar las impresiones locales (SPEC §1b regla 3):
 * alguna impresora activa con poll en los últimos 10 min. Más largo que el
 * offline a propósito: un corte corto de red no reactiva el auto-print de la
 * tablet (eso sería imprimir doble cuando vuelve).
 */
export const CLOUDPRNT_ACTIVE_WINDOW_MS = 10 * 60_000;
/** Los fallidos viejos no quedan en el banner para siempre. */
export const FAILED_WINDOW_MS = 12 * 60 * 60_000;

export interface PrinterStatusRow {
  id: string;
  name: string;
  is_active: boolean;
  last_poll_at: string | null;
}

export interface PrinterJobRow {
  printer_id: string;
  status: string;
  not_before: string | null;
  created_at: string;
}

export interface PrinterStatus {
  printerId: string;
  name: string;
  state: 'online' | 'offline';
  lastPollAt: string | null;
  queuedCount: number;
  failedCount: number;
}

export interface PrintersStatusResponse {
  printers: PrinterStatus[];
  cloudprntActive: boolean;
}

const ms = (iso: string | null | undefined): number => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : NaN;
};

export function computePrintersStatus(
  printers: PrinterStatusRow[],
  jobs: PrinterJobRow[],
  now = Date.now(),
): PrintersStatusResponse {
  const out: PrinterStatus[] = printers
    .filter((p) => p.is_active)
    .map((p) => {
      const poll = ms(p.last_poll_at);
      const mine = jobs.filter((j) => j.printer_id === p.id);
      return {
        printerId: p.id,
        name: p.name,
        state: Number.isFinite(poll) && now - poll <= PRINTER_OFFLINE_AFTER_MS ? 'online' : 'offline',
        lastPollAt: p.last_poll_at,
        // Solo lo que ya debería haber salido: un programado con not_before futuro no cuenta.
        queuedCount: mine.filter((j) => j.status === 'queued' && (!j.not_before || ms(j.not_before) <= now)).length,
        failedCount: mine.filter((j) => j.status === 'failed' && now - ms(j.created_at) <= FAILED_WINDOW_MS).length,
      };
    });
  const cloudprntActive = printers.some((p) => {
    const poll = ms(p.last_poll_at);
    return p.is_active && Number.isFinite(poll) && now - poll <= CLOUDPRNT_ACTIVE_WINDOW_MS;
  });
  return { printers: out, cloudprntActive };
}
