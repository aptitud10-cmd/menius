/**
 * Protocolo Star CloudPRNT (HTTP) del lado del server — API impresión §1.
 *
 *   POST   poll: la impresora pregunta cada N s si hay algo para imprimir.
 *   GET    trae el job (o, sin `type`, la "Server setting information request").
 *   DELETE confirma: code 2xx = impreso; otro código = error.
 *
 * La impresora se identifica por el secreto de la URL (/api/cloudprnt/<secreto>);
 * el job, por `?token=` / header X-Star-Token (jobToken del POST; firmware ≥ 3.2
 * en mC-Print3). Son dos cosas distintas: nunca comparten parámetro.
 *
 * La base está detrás de CloudPrntStore para poder testear el protocolo sin DB.
 */
import { createHash } from 'node:crypto';

export const CLOUDPRNT_MEDIA_TYPE = 'image/png';

/** Ver API §1.0: respuesta para que una impresora con firmware MQTT quede en HTTP. */
export const SERVER_SETTING_RESPONSE = {
  title: 'star_cloudprnt_server_setting',
  version: '1.0.0',
  serverSupportProtocol: ['HTTP'],
} as const;

/** Lo que la impresora informa la primera vez (se guarda en last_client_info). */
const CLIENT_INFO_REQUESTS = ['ClientType', 'ClientVersion', 'PageInfo'] as const;

/** last_poll_at se escribe como máximo cada 30 s (o si cambia el estado). */
const POLL_WRITE_EVERY_MS = 30_000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PrinterRow {
  id: string;
  restaurant_id: string;
  mac_address: string | null;
  last_poll_at: string | null;
  last_asb_status: string | null;
  last_client_info: Record<string, unknown> | null;
}

export interface ClaimedJob {
  id: string;
  restaurant_id: string;
  order_id: string | null;
  kind: 'order' | 'reprint' | 'test';
  created_at: string;
}

export interface CloudPrntStore {
  updatePrinter(id: string, patch: Partial<Pick<PrinterRow, 'mac_address' | 'last_poll_at' | 'last_asb_status' | 'last_client_info'>>): Promise<void>;
  /** ¿Otra impresora ya tiene esta MAC? Solo para loguear: no se bloquea. */
  macUsedByOther(mac: string, printerId: string): Promise<boolean>;
  /** Siguiente job listo (queued y not_before vencido), en orden de la cola. */
  nextQueuedJobId(printerId: string): Promise<string | null>;
  /** El job 'sent' más viejo (DELETE sin token, firmware viejo). */
  oldestSentJobId(printerId: string): Promise<string | null>;
  claimJob(jobId: string, printerId: string, mediaType: string): Promise<ClaimedJob | null>;
  finishJob(jobId: string, printerId: string, code: string): Promise<string | null>;
  warn(message: string, meta: Record<string, unknown>): void;
}

export function hashPrinterToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Token de la URL de una impresora: 32 bytes aleatorios en base64url (API §2). */
export function isPlausiblePrinterToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{32,64}$/.test(token);
}

// ── POST (poll) ────────────────────────────────────────────────────────────────

interface PollBody {
  status?: unknown;
  printerMAC?: unknown;
  printingInProgress?: unknown;
  clientAction?: unknown;
}

export interface PollResponse {
  jobReady: boolean;
  mediaTypes?: string[];
  jobToken?: string;
  clientAction?: { request: string; options: string }[];
}

export async function handlePoll(printer: PrinterRow, rawBody: unknown, store: CloudPrntStore, now = new Date()): Promise<PollResponse> {
  const body: PollBody = rawBody && typeof rawBody === 'object' ? (rawBody as PollBody) : {};
  const status = typeof body.status === 'string' ? body.status.slice(0, 200) : null;
  const mac = typeof body.printerMAC === 'string' ? body.printerMAC.trim().toLowerCase().slice(0, 64) : null;

  const patch: Parameters<CloudPrntStore['updatePrinter']>[1] = {};
  const lastPoll = printer.last_poll_at ? Date.parse(printer.last_poll_at) : 0;
  if (!lastPoll || now.getTime() - lastPoll > POLL_WRITE_EVERY_MS || (status !== null && status !== printer.last_asb_status)) {
    patch.last_poll_at = now.toISOString();
    if (status !== null) patch.last_asb_status = status;
  }

  if (mac && !printer.mac_address) {
    patch.mac_address = mac;
    if (await store.macUsedByOther(mac, printer.id)) {
      store.warn('cloudprnt: MAC already registered on another printer', { printerId: printer.id });
    }
  }

  // Resultados de clientAction (ClientType, ClientVersion, PageInfo…).
  const results = Array.isArray(body.clientAction)
    ? (body.clientAction as unknown[]).filter(
        (a): a is { request: string; result: unknown } =>
          !!a && typeof a === 'object' && typeof (a as { request?: unknown }).request === 'string',
      )
    : [];
  if (results.length > 0) {
    patch.last_client_info = {
      ...(printer.last_client_info ?? {}),
      ...Object.fromEntries(results.map((a) => [a.request, a.result ?? null])),
    };
  }

  if (Object.keys(patch).length > 0) await store.updatePrinter(printer.id, patch);

  const res: PollResponse = { jobReady: false };
  if (!printer.last_client_info && results.length === 0) {
    res.clientAction = CLIENT_INFO_REQUESTS.map((request) => ({ request, options: '' }));
  }

  // Imprimiendo: no se ofrece otro job hasta que termine.
  if (body.printingInProgress === true) return res;

  const jobId = await store.nextQueuedJobId(printer.id);
  if (jobId) {
    res.jobReady = true;
    res.mediaTypes = [CLOUDPRNT_MEDIA_TYPE];
    res.jobToken = jobId;
  }
  return res;
}

// ── GET (job) ──────────────────────────────────────────────────────────────────

export type GetResult =
  | { kind: 'setting' }
  | { kind: 'job'; job: ClaimedJob }
  | { kind: 'unsupported_media' }
  | { kind: 'not_found' };

/** Resuelve qué pide un GET y reclama el job de forma atómica. No renderiza. */
export async function handleGet(
  printer: PrinterRow,
  query: URLSearchParams,
  headerToken: string | null,
  store: CloudPrntStore,
): Promise<GetResult> {
  const type = query.get('type');
  // Sin `type` no es un pedido de job: es la consulta de configuración del server.
  if (!type) return { kind: 'setting' };
  if (type !== CLOUDPRNT_MEDIA_TYPE) return { kind: 'unsupported_media' };

  const jobId = pickJobToken(query.get('token'), headerToken) ?? (await store.nextQueuedJobId(printer.id));
  if (!jobId) return { kind: 'not_found' };

  const job = await store.claimJob(jobId, printer.id, type);
  return job ? { kind: 'job', job } : { kind: 'not_found' };
}

// ── DELETE (confirmación) ──────────────────────────────────────────────────────

export async function handleDelete(
  printer: PrinterRow,
  query: URLSearchParams,
  headerToken: string | null,
  store: CloudPrntStore,
): Promise<string | null> {
  const code = (query.get('code') ?? '').slice(0, 32);
  const jobId = pickJobToken(query.get('token'), headerToken) ?? (await store.oldestSentJobId(printer.id));
  if (!jobId) return null;
  return store.finishJob(jobId, printer.id, code);
}

function pickJobToken(queryToken: string | null, headerToken: string | null): string | null {
  for (const t of [queryToken, headerToken]) {
    if (t && UUID_RE.test(t.trim())) return t.trim();
  }
  return null;
}
