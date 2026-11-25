import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { sendEmail } from '@/lib/notifications/email';
import { SUPPORT_CONTACT } from '@/lib/support-contact';

const logger = createLogger('payments-admin-alerts');

export const idOf = (v: string | { id: string } | null | undefined) =>
  typeof v === 'string' ? v : v?.id ?? null;

export const formatCents = (cents: number, currency?: string | null) =>
  `${(cents / 100).toFixed(2)} ${(currency ?? '').toUpperCase()}`.trim();

export type AlertOrder = {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  restaurantName: string | null;
};

/** Pedido para un aviso a los admins, por id o por PaymentIntent (solo si es único). */
export async function findOrderForAlert(by: { orderId?: string | null; paymentIntentId?: string | null }): Promise<AlertOrder | null> {
  if (!by.orderId && !by.paymentIntentId) return null;
  const q = createAdminClient()
    .from('orders')
    .select('id, order_number, customer_name, customer_email, customer_phone, restaurants(name)');
  const { data: rows } = by.orderId
    ? await q.eq('id', by.orderId).limit(2)
    : await q.eq('payment_intent_id', by.paymentIntentId as string).limit(2);
  if (rows?.length !== 1) return null;
  const row = rows[0] as Omit<AlertOrder, 'restaurantName'> & { restaurants?: { name?: string } | { name?: string }[] | null };
  const rest = Array.isArray(row.restaurants) ? row.restaurants[0] : row.restaurants;
  return {
    id: row.id,
    order_number: row.order_number,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    customer_phone: row.customer_phone,
    restaurantName: rest?.name ?? null,
  };
}

/** Email a cada dirección de ADMIN_EMAIL (acepta CSV). Nunca lanza. */
export async function emailAdmins(opts: {
  subject: string;
  title: string;
  intro: string;
  rows: [string, string][];
  link: { href: string; label: string };
}) {
  const admins = (process.env.ADMIN_EMAIL ?? '').split(',').map((e) => e.trim()).filter(Boolean);
  if (!admins.length) {
    logger.error('ADMIN_EMAIL not set — admin alert not sent', { subject: opts.subject });
    return;
  }
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const row = ([k, v]: [string, string]) =>
    `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">${esc(k)}</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${esc(v)}</td></tr>`;
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
      <h2 style="color:#b91c1c;margin:0 0 8px;">${esc(opts.title)}</h2>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">${esc(opts.intro)}</p>
      <table style="width:100%;border-collapse:collapse;">
        ${opts.rows.map(row).join('')}
      </table>
      <p style="margin-top:20px;"><a href="${esc(opts.link.href)}" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${esc(opts.link.label)}</a></p>
    </div>`;
  for (const to of admins) {
    try {
      const sent = await sendEmail({ to, subject: opts.subject, html });
      if (!sent) logger.error('Admin alert email not sent', { subject: opts.subject });
    } catch (err) {
      logger.error('Admin alert email threw', { subject: opts.subject, error: err instanceof Error ? err.message : String(err) });
    }
  }
}

type OwnerEmail = { subject: string; title: string; intro: string; rows: [string, string][] };

/**
 * Email al dueño del restaurante de un pedido (disputas: a él se le descuentan
 * la multa y el monto). Va a la dirección de avisos del restaurante o, si no
 * hay, al email de su cuenta; en el idioma del restaurante. Nunca lanza.
 */
export async function emailRestaurantOwner(orderId: string, build: (en: boolean) => OwnerEmail) {
  try {
    const db = createAdminClient();
    const { data: order } = await db
      .from('orders')
      .select('restaurant_id, restaurants(name, locale, notification_email, owner_user_id)')
      .eq('id', orderId)
      .maybeSingle();
    const rel = (order as { restaurants?: unknown } | null)?.restaurants;
    const rest = (Array.isArray(rel) ? rel[0] : rel) as
      | { name?: string | null; locale?: string | null; notification_email?: string | null; owner_user_id?: string | null }
      | undefined;
    if (!rest) return;
    let to = rest.notification_email?.trim() || '';
    if (!to && rest.owner_user_id) {
      const { data } = await db.auth.admin.getUserById(rest.owner_user_id);
      to = data.user?.email ?? '';
    }
    if (!to) {
      logger.error('Owner alert not sent: no email', { orderId });
      return;
    }
    const msg = build(rest.locale === 'en');
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const row = ([k, v]: [string, string]) =>
      `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px;">${esc(k)}</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${esc(v)}</td></tr>`;
    const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:20px;">
      <h2 style="color:#111827;margin:0 0 8px;">${esc(msg.title)}</h2>
      <p style="font-size:14px;line-height:1.5;color:#374151;margin:0 0 16px;">${esc(msg.intro)}</p>
      <table style="width:100%;border-collapse:collapse;">
        ${msg.rows.map(row).join('')}
      </table>
    </div>`;
    const sent = await sendEmail({ to, replyTo: SUPPORT_CONTACT.email, subject: msg.subject, html });
    if (!sent) logger.error('Owner alert email not sent', { orderId });
  } catch (err) {
    logger.error('Owner alert email threw', { orderId, error: err instanceof Error ? err.message : String(err) });
  }
}
