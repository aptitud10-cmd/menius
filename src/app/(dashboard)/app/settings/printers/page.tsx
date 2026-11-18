import { getDashboardContext } from '@/lib/get-dashboard-context';
import { loadPrintersStatus } from '@/lib/printing/printers-server';
import { PRINTER_CLIENT_COLUMNS, type Printer } from '@/types';
import PrintersContent from './_content';

export const dynamic = 'force-dynamic';

/** Impresoras CloudPRNT (SPEC impresión F3/F4/F5). Solo el dueño: una tablet vuelve al inicio. */
export default async function PrintersPage() {
  const { supabase, restaurantId } = await getDashboardContext(false, true);
  const [{ data }, status] = await Promise.all([
    supabase.from('printers').select(PRINTER_CLIENT_COLUMNS).eq('restaurant_id', restaurantId).order('created_at'),
    loadPrintersStatus(restaurantId),
  ]);
  return <PrintersContent initialPrinters={(data ?? []) as unknown as Printer[]} initialStatus={status} />;
}
