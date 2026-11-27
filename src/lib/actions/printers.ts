'use server';

/**
 * Impresoras CloudPRNT (API impresión §2).
 * - Alta, URL, ajustes, borrar y prueba: solo el dueño (ownerOnly). Una tablet
 *   no toca la configuración, ni con el panel abierto por PIN.
 * - Reimprimir: también la tablet del Counter (allowDevice), sobre su tienda.
 * Se valida todo antes de tocar la base; escribe con el admin client y filtra
 * por restaurant_id en cada query.
 */
import { z } from 'zod';
import { getTenant } from '@/lib/auth/get-tenant';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { PRINTER_CLIENT_COLUMNS, type Printer } from '@/types';
import { newPrinterToken, printerServerUrl, enqueueManualJob } from '@/lib/printing/printers-server';

const logger = createLogger('printers');

type Err = 'invalid' | 'unauthorized' | 'not_found' | 'no_printer' | 'db';
export type ActionResult<T> = ({ ok: true } & T) | { ok: false; error: Err };

const uuid = z.guid();
const nameSchema = z.string().trim().min(1).max(40);

export async function createPrinter(input: unknown): Promise<ActionResult<{ printer: Printer; serverUrl: string }>> {
  const parsed = z.object({ name: nameSchema.optional() }).safeParse(input ?? {});
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return { ok: false, error: 'unauthorized' };

  const { token, hash } = newPrinterToken();
  const { data, error } = await createAdminClient()
    .from('printers')
    .insert({ restaurant_id: tenant.restaurantId, name: parsed.data.name ?? 'Counter', token_hash: hash })
    .select(PRINTER_CLIENT_COLUMNS)
    .single();
  if (error || !data) {
    logger.error('createPrinter failed', { message: error?.message });
    return { ok: false, error: 'db' };
  }
  // El token en claro sale UNA vez, en esta respuesta (F4). En la base queda el hash.
  return { ok: true, printer: data as unknown as Printer, serverUrl: printerServerUrl(token) };
}

export async function rotatePrinterToken(input: unknown): Promise<ActionResult<{ serverUrl: string }>> {
  const parsed = z.object({ printerId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return { ok: false, error: 'unauthorized' };

  const { token, hash } = newPrinterToken();
  const { data, error } = await createAdminClient()
    .from('printers')
    .update({ token_hash: hash, mac_address: null, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.printerId)
    .eq('restaurant_id', tenant.restaurantId)
    .select('id')
    .maybeSingle();
  if (error) {
    logger.error('rotatePrinterToken failed', { message: error.message });
    return { ok: false, error: 'db' };
  }
  if (!data) return { ok: false, error: 'not_found' };
  return { ok: true, serverUrl: printerServerUrl(token) };
}

const settingsSchema = z.object({
  printerId: uuid,
  name: nameSchema.optional(),
  print_on: z.enum(['accepted', 'created']).optional(),
  copies: z.number().int().min(1).max(3).optional(),
  order_types: z.array(z.enum(['delivery', 'pickup', 'dine_in'])).min(1).max(3).optional(),
  is_active: z.boolean().optional(),
});

export async function updatePrinterSettings(input: unknown): Promise<ActionResult<{ printer: Printer }>> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const { printerId, ...patch } = parsed.data;
  if (Object.keys(patch).length === 0) return { ok: false, error: 'invalid' };
  if (patch.order_types) patch.order_types = Array.from(new Set(patch.order_types));
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return { ok: false, error: 'unauthorized' };

  const { data, error } = await createAdminClient()
    .from('printers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', printerId)
    .eq('restaurant_id', tenant.restaurantId)
    .select(PRINTER_CLIENT_COLUMNS)
    .maybeSingle();
  if (error) {
    logger.error('updatePrinterSettings failed', { message: error.message });
    return { ok: false, error: 'db' };
  }
  if (!data) return { ok: false, error: 'not_found' };
  return { ok: true, printer: data as unknown as Printer };
}

export async function deletePrinter(input: unknown): Promise<ActionResult<Record<never, never>>> {
  const parsed = z.object({ printerId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return { ok: false, error: 'unauthorized' };

  const { data, error } = await createAdminClient()
    .from('printers')
    .delete()
    .eq('id', parsed.data.printerId)
    .eq('restaurant_id', tenant.restaurantId)
    .select('id')
    .maybeSingle();
  if (error) {
    logger.error('deletePrinter failed', { message: error.message });
    return { ok: false, error: 'db' };
  }
  if (!data) return { ok: false, error: 'not_found' };
  return { ok: true };
}

export async function printTest(input: unknown): Promise<ActionResult<{ jobs: number }>> {
  const parsed = z.object({ printerId: uuid }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const tenant = await getTenant({ ownerOnly: true });
  if (!tenant) return { ok: false, error: 'unauthorized' };
  try {
    const jobs = await enqueueManualJob({ restaurantId: tenant.restaurantId, kind: 'test', printerId: parsed.data.printerId, requestedBy: tenant.userId });
    return jobs ? { ok: true, jobs } : { ok: false, error: 'no_printer' };
  } catch (e: unknown) {
    logger.error('printTest failed', { message: e instanceof Error ? e.message : String(e) });
    return { ok: false, error: 'db' };
  }
}

/** F2: "Reimprimir" del Counter o del panel. El ticket sale con la franja REPRINT. */
export async function reprintOrder(input: unknown): Promise<ActionResult<{ jobs: number }>> {
  const parsed = z.object({ orderId: uuid, printerId: uuid.optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'invalid' };
  const tenant = await getTenant({ allowDevice: true });
  if (!tenant) return { ok: false, error: 'unauthorized' };

  const { data: order } = await createAdminClient()
    .from('orders')
    .select('id')
    .eq('id', parsed.data.orderId)
    .eq('restaurant_id', tenant.restaurantId)
    .maybeSingle();
  if (!order) return { ok: false, error: 'not_found' };

  try {
    const jobs = await enqueueManualJob({
      restaurantId: tenant.restaurantId, kind: 'reprint', orderId: order.id,
      printerId: parsed.data.printerId, requestedBy: tenant.userId,
    });
    return jobs ? { ok: true, jobs } : { ok: false, error: 'no_printer' };
  } catch (e: unknown) {
    logger.error('reprintOrder failed', { message: e instanceof Error ? e.message : String(e) });
    return { ok: false, error: 'db' };
  }
}
