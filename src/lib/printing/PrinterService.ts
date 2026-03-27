/**
 * PrinterService — browser-only singleton.
 *
 * State machine per print job:
 *
 *   IDLE ──► PRINTING ──► PRINTED
 *                │
 *                └──► FAILED ──► RETRYING ──► PRINTED
 *                                    │
 *                                    └──► FAILED (max attempts)
 *
 * Usage:
 *   PrinterService.printOrder(order, etaMinutes, restaurantName, currency);
 *   PrinterService.subscribe(job => setJobState(job));
 */

import type { Order, OrderItem } from '@/types';
import type { PrintJob, PrintState, ReceiptData, ReceiptLineItem } from './types';
import { buildReceiptHTML, buildKitchenHTML } from './receipt-formatter';
import { PrinterConfig } from './PrinterConfig';
import { isMeniusNativePrintAvailable, nativePrintReceipt } from './native-bridge';

const MAX_ATTEMPTS = 3;
const PRINT_TIMEOUT_MS = 25_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapOrderToReceipt(
  order: Order,
  etaMinutes: number | undefined,
  restaurantName: string,
  currency: string,
  locale?: string,
): ReceiptData {
  const items: ReceiptLineItem[] = (order.items ?? []).map((item: OrderItem) => {
    const raw = item as any;
    const modifiers: string[] = [];

    if (item.variant?.name) modifiers.push(item.variant.name);

    // extras — typed as item.extras or raw joined as order_item_extras
    const extras: any[] = item.extras ?? raw.order_item_extras ?? [];
    for (const ex of extras) {
      const name = ex.extra?.name ?? ex.product_extras?.name;
      if (name) modifiers.push(name);
    }

    // modifier groups (raw join from Supabase)
    const mods: any[] = raw.order_item_modifiers ?? [];
    for (const mod of mods) {
      if (mod.option_name) modifiers.push(mod.option_name);
    }

    return {
      qty: item.qty,
      name: item.product?.name ?? 'Producto',
      lineTotal: item.line_total ?? item.unit_price * item.qty,
      modifiers,
      notes: item.notes ?? undefined,
    };
  });

  const taxAmt = order.tax_amount ? Number(order.tax_amount) : undefined;

  return {
    restaurantName,
    orderNumber: order.order_number ?? order.id.slice(-6).toUpperCase(),
    customerName: order.customer_name ?? '',
    customerPhone: order.customer_phone ?? undefined,
    orderType: order.order_type ?? undefined,
    tableName: (order as any).table?.name ?? order.table_name ?? undefined,
    paymentMethod: order.payment_method ?? undefined,
    deliveryAddress: order.delivery_address ?? undefined,
    items,
    subtotal: Number(order.total) - (Number(order.tip_amount) || 0) - (taxAmt && !(order as any).tax_included ? taxAmt : 0),
    tip: Number(order.tip_amount) || undefined,
    tax: taxAmt,
    taxLabel: taxAmt ? ((order as any).tax_label ?? 'Tax') : undefined,
    taxIncluded: (order as any).tax_included ?? false,
    total: order.total,
    notes: order.notes ?? undefined,
    etaMinutes,
    currency,
    timestamp: new Date(order.created_at),
    locale,
  };
}

function executePrint(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in browser'));
      return;
    }

    // Use a hidden iframe — no popup permission required.
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch { /* already removed */ }
    };

    const timeout = setTimeout(() => {
      cleanup();
      // Timeout likely means the print dialog closed — treat as success.
      resolve();
    }, PRINT_TIMEOUT_MS);

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) { clearTimeout(timeout); cleanup(); reject(new Error('iframe window unavailable')); return; }

        win.onafterprint = () => {
          clearTimeout(timeout);
          cleanup();
          resolve();
        };

        win.focus();
        win.print();
      } catch (err) {
        clearTimeout(timeout);
        cleanup();
        reject(err);
      }
    };

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      cleanup();
      reject(new Error('No iframe document'));
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();
  });
}

// ─── PrinterService ──────────────────────────────────────────────────────────

type Listener = (job: PrintJob) => void;

class PrinterServiceImpl {
  private jobs = new Map<string, PrintJob>();
  private listeners = new Set<Listener>();

  // ── Subscriptions ──

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(job: PrintJob) {
    this.listeners.forEach((fn) => fn({ ...job }));
  }

  private transition(job: PrintJob, state: PrintState, error?: string): PrintJob {
    const updated: PrintJob = {
      ...job,
      state,
      error,
      completedAt: ['printed', 'failed'].includes(state) ? new Date() : job.completedAt,
    };
    this.jobs.set(updated.id, updated);
    this.notify(updated);
    return updated;
  }

  // ── Main API ──

  getJob(jobId: string): PrintJob | undefined {
    return this.jobs.get(jobId);
  }

  getJobByOrder(orderId: string): PrintJob | undefined {
    for (const job of Array.from(this.jobs.values())) {
      if (job.orderId === orderId) return job;
    }
    return undefined;
  }

  async printOrder(
    order: Order,
    etaMinutes: number | undefined,
    restaurantName: string,
    currency: string,
    locale?: string,
  ): Promise<PrintJob> {
    // Create job
    const job: PrintJob = {
      id: crypto.randomUUID(),
      orderId: order.id,
      orderNumber: order.order_number ?? order.id.slice(-6).toUpperCase(),
      state: 'idle',
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      createdAt: new Date(),
    };
    this.jobs.set(job.id, job);
    this.notify(job);

    return this._execute(job, order, etaMinutes, restaurantName, currency, locale);
  }

  async retryJob(
    jobId: string,
    order: Order,
    etaMinutes: number | undefined,
    restaurantName: string,
    currency: string,
    locale?: string,
  ): Promise<PrintJob | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.state !== 'failed') return null;
    if (job.attempts >= job.maxAttempts) return job;

    const retrying = this.transition(job, 'retrying');
    return this._execute(retrying, order, etaMinutes, restaurantName, currency, locale);
  }

  private async _execute(
    job: PrintJob,
    order: Order,
    etaMinutes: number | undefined,
    restaurantName: string,
    currency: string,
    locale?: string,
  ): Promise<PrintJob> {
    // Transition → printing
    let current = this.transition(job, 'printing');
    current = { ...current, attempts: current.attempts + 1 };
    this.jobs.set(current.id, current);
    this.notify(current);

    try {
      const receiptData = mapOrderToReceipt(order, etaMinutes, restaurantName, currency, locale);
      const cfg = PrinterConfig.config;

      // Android Counter app: native Bluetooth ESC/POS (no browser print dialog)
      if (isMeniusNativePrintAvailable()) {
        if (cfg.receiptEnabled) nativePrintReceipt(receiptData, 'receipt');
        if (cfg.kitchenEnabled) nativePrintReceipt(receiptData, 'kitchen');
        if (!cfg.receiptEnabled && !cfg.kitchenEnabled) {
          nativePrintReceipt(receiptData, 'receipt');
        }
        return this.transition(current, 'printed');
      }

      // Print receipt and/or kitchen ticket based on device config
      if (cfg.receiptEnabled) await executePrint(buildReceiptHTML(receiptData));
      if (cfg.kitchenEnabled) await executePrint(buildKitchenHTML(receiptData));
      // If both disabled, fall back to receipt to avoid silent no-print
      if (!cfg.receiptEnabled && !cfg.kitchenEnabled) await executePrint(buildReceiptHTML(receiptData));
      return this.transition(current, 'printed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown printer error';
      return this.transition(current, 'failed', message);
    }
  }

  // ── Housekeeping ──

  /** Remove jobs older than `maxAgeMs` (default 2 h). Call periodically if desired. */
  purgeOldJobs(maxAgeMs = 2 * 60 * 60 * 1000) {
    const cutoff = Date.now() - maxAgeMs;
    for (const [id, job] of Array.from(this.jobs)) {
      if (job.createdAt.getTime() < cutoff) this.jobs.delete(id);
    }
  }
}

export const PrinterService = new PrinterServiceImpl();
