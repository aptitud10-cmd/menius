import { publicOrderSchema } from '@/lib/validations';
import { verifyOrderToken } from '@/lib/order-token';
import { sanitizeText, sanitizeEmail, sanitizeMultiline } from '@/lib/sanitize';
import { createLogger } from '@/lib/logger';

const logger = createLogger('orders:validate');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SanitizedOrderInput {
  restaurant_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string;
  items: unknown[];
  promo_code: string;
  loyalty_points_redeemed: number;
  loyalty_account_id: string | null;
  order_type: string;
  payment_method: string;
  delivery_address: string;
  table_name: string;
  locale: string;
  en: boolean;
  scheduled_for: string | null;
  include_utensils: boolean;
  tip_amount: number | undefined;
}

export type ValidateResult =
  | {
      success: true;
      data: SanitizedOrderInput;
      parsed: ReturnType<typeof publicOrderSchema.safeParse> & { success: true };
    }
  | {
      success: false;
      error: string;
      status: number;
      isDemoResponse?: boolean;
      demoData?: { order_id: string; order_number: string };
    };

export function sanitizeAndValidate(body: Record<string, unknown>, ip: string): ValidateResult {
  const bodyLocale: string = typeof body.locale === 'string' ? body.locale : 'es';
  const bodyEn = bodyLocale === 'en';

  // Honeypot check
  if (body._hp && String(body._hp).length > 0) {
    logger.warn('Honeypot triggered', { ip });
    return {
      success: false,
      error: '',
      status: 200,
      isDemoResponse: true,
      demoData: { order_id: `blocked-${Date.now()}`, order_number: 'SPAM' },
    };
  }

  // Token verification
  const restaurant_id_raw = String(body.restaurant_id ?? '');
  if (!verifyOrderToken(body._ot as string | undefined, restaurant_id_raw)) {
    logger.warn('Invalid order token', { ip, restaurant_id: restaurant_id_raw });
    return {
      success: false,
      error: bodyEn ? 'Session expired. Please reload the page.' : 'Sesión expirada. Recarga la página.',
      status: 403,
    };
  }

  // Sanitize inputs
  const restaurant_id = body.restaurant_id as string;
  const customer_name = sanitizeText(body.customer_name, 100);
  const customer_email = sanitizeEmail(body.customer_email);
  const customer_phone = sanitizeText(body.customer_phone, 20);
  const notes = sanitizeMultiline(body.notes, 500);
  const promo_code = sanitizeText(body.promo_code, 50);
  const loyalty_points_redeemed = Number(body.loyalty_points_redeemed) || 0;
  const loyalty_account_id =
    typeof body.loyalty_account_id === 'string' && UUID_RE.test(body.loyalty_account_id)
      ? body.loyalty_account_id
      : null;
  const order_type = sanitizeText(body.order_type, 20);
  const payment_method = sanitizeText(body.payment_method, 20);
  const delivery_address = sanitizeMultiline(body.delivery_address, 300);
  const table_name = sanitizeText(body.table_name, 50);

  // Validate restaurant_id format
  if (!restaurant_id || (!String(restaurant_id).startsWith('demo') && !UUID_RE.test(String(restaurant_id)))) {
    return { success: false, error: 'Invalid restaurant_id', status: 400 };
  }

  // Demo mode
  if (String(restaurant_id).startsWith('demo')) {
    if (!customer_name || !customer_phone) {
      return {
        success: false,
        error: bodyEn ? 'Name and phone required' : 'Nombre y teléfono requeridos',
        status: 400,
      };
    }
    const demoNum = `DEMO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return {
      success: false,
      error: '',
      status: 200,
      isDemoResponse: true,
      demoData: { order_id: `demo-order-${Date.now()}`, order_number: demoNum },
    };
  }

  // Zod validation
  const parsed = publicOrderSchema.safeParse({
    customer_name,
    customer_phone,
    customer_email,
    order_type,
    payment_method,
    notes,
    items: body.items,
    tip_amount: body.tip_amount !== undefined ? Number(body.tip_amount) : undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message, status: 400 };
  }

  // Parse scheduled_for
  let scheduledFor: string | null = null;
  if (body.scheduled_for) {
    const sf = new Date(body.scheduled_for as string);
    if (!isNaN(sf.getTime()) && sf.getTime() > Date.now() + 5 * 60_000) {
      scheduledFor = sf.toISOString();
    }
  }

  return {
    success: true,
    data: {
      restaurant_id,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      items: Array.isArray(body.items) ? body.items : [],
      promo_code,
      loyalty_points_redeemed,
      loyalty_account_id,
      order_type,
      payment_method,
      delivery_address,
      table_name,
      locale: bodyLocale,
      en: bodyEn,
      scheduled_for: scheduledFor,
      include_utensils: body.include_utensils !== false,
      tip_amount: body.tip_amount !== undefined ? Number(body.tip_amount) : undefined,
    },
    parsed: parsed as ReturnType<typeof publicOrderSchema.safeParse> & { success: true },
  };
}
