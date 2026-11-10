/**
 * Emails al CLIENTE final (el que pidió comida), versión 2026.
 *
 * 3 emails por pedido: recibo → hora exacta → "listo" (pickup) o "en camino"
 * (delivery). Más cancelado/reembolsado cuando pasa y un pedido de reseña.
 * Los estados intermedios viven en el seguimiento y en push/SMS.
 *
 * Reglas de este archivo:
 * - Funciones puras: reciben datos ya cargados y devuelven { subject, preheader, html }.
 * - HTML de email: tablas + estilos en línea. Cada texto lleva una clase para
 *   que el modo oscuro de Apple Mail / Outlook (prefers-color-scheme) lo
 *   repinte; Gmail ignora el bloque y muestra la versión clara.
 * - Sin emojis en asuntos ni botones; horas absolutas en la zona del restaurante.
 */
import { formatPrice } from '@/lib/utils';
import { travelMinutes, haversineKm } from '@/lib/orders/eta';

export interface CustomerEmailItem {
  qty: number;
  name: string;
  /** Variante / modificadores / extras en una línea gris. */
  detail?: string;
  lineTotal: number;
}

export interface CustomerEmailCtx {
  locale: string;
  restaurant: {
    name: string;
    address?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
    timezone?: string | null;
  };
  orderNumber: string;
  customerName: string;
  orderType: string;
  trackingUrl: string;
  menuUrl: string;
  mapsUrl?: string | null;
  paymentMethod?: string | null;
  paid: boolean;
  currency: string;
  items: CustomerEmailItem[];
  discount: number;
  tax: number;
  taxLabel?: string | null;
  taxRate?: number | null;
  taxIncluded?: boolean;
  tip: number;
  deliveryFee: number;
  total: number;
  deliveryAddress?: string | null;
  tableName?: string | null;
}

export interface BuiltEmail {
  subject: string;
  preheader: string;
  html: string;
}

// ── Tokens (identidad del Counter) ─────────────────────────────────────────
const T = {
  bg: '#F2F4F3', card: '#FFFFFE', ink: '#0E1412', sub: '#55605C', line: '#E1E6E3',
  btn: '#111816', btnFg: '#FFFFFE', green: '#05C8A7', greenInk: '#04241E', link: '#047A67',
  soft: '#F6F8F7', redBg: '#FDE8E8', red: '#B42318',
};
const DISPLAY = "'Bricolage Grotesque','Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY = "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// ── Utilidades ─────────────────────────────────────────────────────────────
export function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const isEn = (locale: string) => locale === 'en';

/** "ORD-261110-014" → "014": el número que se dice en el mostrador. */
export function shortOrderNumber(orderNumber: string): string {
  return orderNumber.split('-').pop() || orderNumber;
}

function firstName(name: string): string {
  return (name || '').trim().split(/\s+/)[0] || '';
}

/** Nombre limpio para el remitente: sin comillas, comas ni saltos de línea. */
export function cleanSenderName(name: string): string {
  return (name || 'MENIUS').replace(/["<>\r\n,;]/g, ' ').replace(/\s+/g, ' ').trim() || 'MENIUS';
}

export function fmtClock(ms: number, locale: string, timeZone?: string | null): string {
  const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  try {
    return new Date(ms).toLocaleTimeString(isEn(locale) ? 'en-US' : 'es-US', { ...opts, timeZone: timeZone || 'America/New_York' });
  } catch {
    return new Date(ms).toLocaleTimeString(isEn(locale) ? 'en-US' : 'es-US', opts);
  }
}

const FIVE_MIN = 5 * 60_000;
/** Misma ventana que el seguimiento: 10 min, empieza 4 min antes, redondeada a 5. */
export function arrivalWindow(arrivalMs: number): { start: number; end: number } {
  const start = Math.floor((arrivalMs - 4 * 60_000) / FIVE_MIN) * FIVE_MIN;
  return { start, end: start + 10 * 60_000 };
}

export function windowLabel(arrivalMs: number, locale: string, tz?: string | null): string {
  const { start, end } = arrivalWindow(arrivalMs);
  const a = fmtClock(start, locale, tz);
  const b = fmtClock(end, locale, tz);
  // "1:10 PM–1:20 PM" → "1:10–1:20 PM" cuando comparten AM/PM.
  const am = /\s?(AM|PM|a\. ?m\.|p\. ?m\.)$/i;
  const ma = a.match(am)?.[0];
  const mb = b.match(am)?.[0];
  const left = ma && mb && ma.trim().toLowerCase() === mb.trim().toLowerCase() ? a.replace(am, '') : a;
  return isEn(locale) ? `${left}–${b}` : `${left} y ${b}`;
}

/** Minutos de viaje del repartidor (misma fórmula que checkout y seguimiento). */
export function deliveryTravelMinutes(
  from: { lat?: number | null; lng?: number | null },
  to: { lat?: number | null; lng?: number | null },
): number {
  const ok = (v: unknown) => v != null && Number.isFinite(Number(v));
  const km = ok(from.lat) && ok(from.lng) && ok(to.lat) && ok(to.lng)
    ? haversineKm(Number(from.lat), Number(from.lng), Number(to.lat), Number(to.lng))
    : 2;
  return travelMinutes(km);
}

function money(ctx: CustomerEmailCtx, n: number): string {
  return formatPrice(Number(n) || 0, ctx.currency);
}

function itemCount(ctx: CustomerEmailCtx): number {
  return ctx.items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
}

function payLine(ctx: CustomerEmailCtx): string {
  const en = isEn(ctx.locale);
  if (ctx.paid) return en ? 'Paid online' : 'Pagado en línea';
  const cash = ctx.paymentMethod === 'cash';
  if (ctx.orderType === 'delivery') return cash ? (en ? 'Cash on delivery' : 'Pagas en efectivo al recibir') : (en ? 'Pay on delivery' : 'Pagas al recibir');
  if (ctx.orderType === 'dine_in') return en ? 'Pay at the table' : 'Pagas en la mesa';
  return cash ? (en ? 'Pay at pickup · Cash' : 'Pagas al recoger · Efectivo') : (en ? 'Pay at pickup' : 'Pagas al recoger');
}

function typeLabel(ctx: CustomerEmailCtx): string {
  const en = isEn(ctx.locale);
  if (ctx.orderType === 'delivery') return en ? 'Delivery' : 'Delivery';
  if (ctx.orderType === 'dine_in') return en ? 'Dine-in' : 'En mesa';
  return en ? 'Pickup' : 'Para recoger';
}

export type CustomerEmailKind = 'eta' | 'ready' | 'on_the_way' | 'cancelled';

/**
 * Qué email (si alguno) corresponde a un cambio de estado. El resto de los
 * estados solo se ven en el seguimiento y por push.
 */
export function customerEmailKind(status: string, orderType?: string | null): CustomerEmailKind | null {
  if (status === 'confirmed' || status === 'preparing') return 'eta';
  if (status === 'ready') return orderType === 'pickup' ? 'ready' : null;
  if (status === 'out_for_delivery') return orderType === 'delivery' ? 'on_the_way' : null;
  if (status === 'cancelled') return 'cancelled';
  return null;
}

// ── Bloques HTML ───────────────────────────────────────────────────────────
function preheaderHtml(text: string): string {
  // Relleno invisible para que el cliente de correo no "complete" el preview con el cuerpo.
  const pad = '&#847;&zwnj;&nbsp;'.repeat(40);
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(text)}${pad}</div>`;
}

function para(text: string, cls = 'sub', size = 15): string {
  return `<p class="${cls}" style="margin:0;font-family:${BODY};font-size:${size}px;line-height:1.5;color:${cls === 'ink' ? T.ink : T.sub};">${text}</p>`;
}

function heading(text: string, align: 'left' | 'center' = 'left'): string {
  return `<h1 class="ink" style="margin:0;font-family:${DISPLAY};font-size:26px;line-height:1.15;font-weight:800;letter-spacing:-0.3px;color:${T.ink};text-align:${align};">${text}</h1>`;
}

function pill(text: string, tone: 'green' | 'red' = 'green'): string {
  const bg = tone === 'red' ? T.redBg : T.green;
  const fg = tone === 'red' ? T.red : T.greenInk;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="${tone === 'red' ? 'pillred' : ''}" style="background:${bg};color:${fg};border-radius:999px;padding:5px 10px;font-family:${BODY};font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${esc(text)}</td></tr></table>`;
}

function button(href: string, text: string, ghost = false): string {
  const style = ghost
    ? `display:block;padding:13px 16px;border:1px solid ${T.line};border-radius:12px;font-family:${BODY};font-size:16px;font-weight:700;color:${T.ink};text-decoration:none;text-align:center;`
    : `display:block;padding:14px 16px;background:${T.btn};border-radius:12px;font-family:${BODY};font-size:16px;font-weight:700;color:${T.btnFg};text-decoration:none;text-align:center;`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="${ghost ? 'line' : 'btn'}" style="border-radius:12px;${ghost ? '' : `background:${T.btn};`}"><a href="${esc(href)}" class="${ghost ? 'ink' : 'btnfg'}" style="${style}">${esc(text)}</a></td></tr></table>`;
}

function hero(label: string, big: string, sub: string, tone: 'green' | 'ink' = 'green'): string {
  const bg = tone === 'ink' ? T.ink : T.green;
  const fg = tone === 'ink' ? T.card : T.greenInk;
  const cls = tone === 'ink' ? 'heroink' : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="${cls}" style="background:${bg};color:${fg};border-radius:16px;padding:16px 18px;">
<div class="${cls}" style="font-family:${BODY};font-size:13px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;color:${fg};opacity:0.85;">${label}</div>
<div class="${cls}" style="font-family:${DISPLAY};font-size:40px;line-height:1.05;font-weight:800;letter-spacing:-0.8px;color:${fg};padding:2px 0;">${big}</div>
<div class="${cls}" style="font-family:${BODY};font-size:14px;font-weight:600;color:${fg};">${sub}</div>
</td></tr></table>`;
}

function orderNumberBlock(ctx: CustomerEmailCtx): string {
  return `<div><span class="ink" style="font-family:${DISPLAY};font-size:30px;font-weight:800;letter-spacing:-0.3px;color:${T.ink};">#${esc(shortOrderNumber(ctx.orderNumber))}</span><span class="sub" style="font-family:${BODY};font-size:12.5px;color:${T.sub};padding-left:10px;">${esc(ctx.orderNumber)}</span></div>`;
}

function itemsBlock(ctx: CustomerEmailCtx): string {
  const rows = ctx.items.map((i) => `<tr>
<td class="sub" valign="top" style="width:30px;padding:5px 0;font-family:${BODY};font-size:14px;color:${T.sub};">${Number(i.qty) || 1}×</td>
<td class="ink" valign="top" style="padding:5px 8px 5px 0;font-family:${BODY};font-size:14px;color:${T.ink};">${esc(i.name)}${i.detail ? `<br><span class="sub" style="font-size:12.5px;color:${T.sub};">${esc(i.detail)}</span>` : ''}</td>
<td class="ink" valign="top" align="right" style="padding:5px 0;font-family:${BODY};font-size:14px;color:${T.ink};white-space:nowrap;">${money(ctx, i.lineTotal)}</td>
</tr>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="line" style="border-top:1px solid ${T.line};"><tr><td style="padding-top:10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr></table>`;
}

function totalsBlock(ctx: CustomerEmailCtx): string {
  const en = isEn(ctx.locale);
  const subtotal = ctx.items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);
  const line = (k: string, v: string) => `<tr><td class="sub" style="padding:2px 0;font-family:${BODY};font-size:14px;color:${T.sub};">${k}</td><td class="sub" align="right" style="padding:2px 0;font-family:${BODY};font-size:14px;color:${T.sub};white-space:nowrap;">${v}</td></tr>`;
  const rows: string[] = [line(en ? 'Subtotal' : 'Subtotal', money(ctx, subtotal))];
  if (ctx.discount > 0) rows.push(line(en ? 'Discount' : 'Descuento', `−${money(ctx, ctx.discount)}`));
  if (ctx.deliveryFee > 0) rows.push(line(en ? 'Delivery' : 'Envío', money(ctx, ctx.deliveryFee)));
  if (ctx.tax > 0) {
    const label = ctx.taxLabel || (en ? 'Tax' : 'Impuesto');
    const rate = ctx.taxRate ? ` (${Number(ctx.taxRate)}%)` : '';
    rows.push(line(ctx.taxIncluded ? `${esc(label)}${rate} ${en ? 'included' : 'incluido'}` : `${esc(label)}${rate}`, money(ctx, ctx.tax)));
  }
  if (ctx.tip > 0) rows.push(line(en ? 'Tip' : 'Propina', money(ctx, ctx.tip)));
  rows.push(`<tr><td class="ink" style="padding-top:6px;font-family:${BODY};font-size:17px;font-weight:800;color:${T.ink};">Total</td><td class="ink" align="right" style="padding-top:6px;font-family:${BODY};font-size:17px;font-weight:800;color:${T.ink};white-space:nowrap;">${money(ctx, ctx.total)}</td></tr>`);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="line" style="border-top:1px solid ${T.line};"><tr><td style="padding-top:10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table></td></tr></table>`;
}

function infoBlock(rows: { k?: string; v: string }[]): string {
  const inner = rows.map((r, idx) => `${r.k ? `<div class="sub" style="font-family:${BODY};font-size:11.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${T.sub};${idx > 0 ? 'padding-top:8px;' : ''}">${r.k}</div>` : ''}<div class="ink" style="font-family:${BODY};font-size:14px;line-height:1.5;color:${T.ink};${!r.k && idx > 0 ? 'padding-top:4px;' : ''}">${r.v}</div>`).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="soft" style="background:${T.soft};border-radius:14px;padding:12px 14px;">${inner}</td></tr></table>`;
}

function link(href: string, text: string): string {
  return `<a href="${esc(href)}" class="lnk" style="font-family:${BODY};color:${T.link};font-weight:600;text-decoration:none;">${esc(text)}</a>`;
}

function placeLine(ctx: CustomerEmailCtx): { k: string; v: string } | null {
  const en = isEn(ctx.locale);
  if (ctx.orderType === 'delivery') {
    return ctx.deliveryAddress ? { k: en ? 'Deliver to' : 'Entregar en', v: esc(ctx.deliveryAddress) } : null;
  }
  if (ctx.orderType === 'dine_in') {
    return ctx.tableName ? { k: en ? 'Table' : 'Mesa', v: esc(ctx.tableName) } : null;
  }
  if (!ctx.restaurant.address) return null;
  return {
    k: en ? 'Pickup at' : 'Recoger en',
    v: `${esc(ctx.restaurant.address)}${ctx.mapsUrl ? ` · ${link(ctx.mapsUrl, en ? 'Directions' : 'Cómo llegar')}` : ''}`,
  };
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** "+17184295188" → "(718) 429-5188"; otros formatos quedan como están. */
export function prettyPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  const us = d.length === 11 && d.startsWith('1') ? d.slice(1) : d.length === 10 ? d : null;
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : phone;
}

function footer(ctx: CustomerEmailCtx, extra?: string): string {
  const en = isEn(ctx.locale);
  const r = ctx.restaurant;
  const first = `<b class="ink" style="color:${T.ink};">${esc(r.name)}</b>${r.address ? ` · ${esc(r.address)}` : ''}`;
  const second = extra ?? [
    r.phone ? link(telHref(r.phone), prettyPhone(r.phone)) : '',
    en ? 'Reply to this email to reach the restaurant.' : 'Responde este email para hablar con el restaurante.',
  ].filter(Boolean).join(' · ');
  return `<tr><td class="line" style="border-top:1px solid ${T.line};padding:16px 20px 18px;">
<div class="sub" style="font-family:${BODY};font-size:12.5px;line-height:1.55;color:${T.sub};">${first}</div>
<div class="sub" style="font-family:${BODY};font-size:12.5px;line-height:1.55;color:${T.sub};padding-top:2px;">${second}</div>
</td></tr>`;
}

function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9À-ſ\s]/g, '').trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? 'M') + (words[1]?.[0] ?? '')).toUpperCase();
}

function header(ctx: CustomerEmailCtx): string {
  const r = ctx.restaurant;
  const logo = r.logoUrl
    ? `<img src="${esc(r.logoUrl)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border-radius:12px;border:0;background:#FFFFFF;">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="40" align="center" valign="middle" class="mono" style="width:40px;height:40px;border-radius:12px;background:${T.ink};color:#FFFFFE;font-family:${DISPLAY};font-size:15px;font-weight:800;">${esc(initials(r.name))}</td></tr></table>`;
  return `<tr><td style="padding:18px 20px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:10px;">${logo}</td>
<td valign="middle" class="ink" style="font-family:${DISPLAY};font-size:15px;font-weight:700;color:${T.ink};">${esc(r.name)}</td>
</tr></table></td></tr>`;
}

/** Bloques separados por 16 px (tablas, no márgenes: Outlook los ignora). */
function stack(blocks: string[]): string {
  return blocks.filter(Boolean).map((b, i) => `<tr><td style="padding:${i === 0 ? 0 : 16}px 0 0;">${b}</td></tr>`).join('');
}

function layout(ctx: CustomerEmailCtx, opts: { preheader: string; title: string; blocks: string[]; footerExtra?: string }): string {
  const en = isEn(ctx.locale);
  return `<!DOCTYPE html>
<html lang="${en ? 'en' : 'es'}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(opts.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{color-scheme:light dark;supported-color-schemes:light dark}
body{margin:0;padding:0;-webkit-text-size-adjust:100%}
a{text-decoration:none}
@media (prefers-color-scheme: dark){
  .bg{background:#0B0F0E !important}
  .card{background:#161B19 !important}
  .ink{color:#F1F4F2 !important}
  .sub{color:#A3ADA9 !important}
  .line{border-color:#2A322F !important}
  .soft{background:#1D2421 !important}
  .btn{background:#F1F4F2 !important}
  .btnfg{background:#F1F4F2 !important;color:#0E1412 !important}
  .lnk{color:#5BE3C9 !important}
  .pillred{background:#3A1717 !important;color:#FF9B91 !important}
  .heroink{background:#F1F4F2 !important;color:#161B19 !important}
  .mono{background:#F1F4F2 !important;color:#0E1412 !important}
}
[data-ogsc] .ink{color:#F1F4F2 !important}
[data-ogsc] .sub{color:#A3ADA9 !important}
[data-ogsc] .lnk{color:#5BE3C9 !important}
[data-ogsb] .bg{background:#0B0F0E !important}
[data-ogsb] .card{background:#161B19 !important}
[data-ogsb] .soft{background:#1D2421 !important}
</style>
</head>
<body class="bg" style="margin:0;padding:0;background:${T.bg};">
${preheaderHtml(opts.preheader)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:${T.bg};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td class="card" style="background:${T.card};border-radius:18px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${header(ctx)}
<tr><td style="padding:18px 20px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${stack(opts.blocks)}</table></td></tr>
${footer(ctx, opts.footerExtra)}
</table>
</td></tr>
<tr><td align="center" class="sub" style="padding:14px 0 0;font-family:${BODY};font-size:11px;color:${T.sub};">${en ? 'Online ordering by' : 'Pedidos en línea con'} <b>MENIUS</b></td></tr>
</table>
</td></tr></table>
</body>
</html>`;
}

// ── 1. Recibo (al hacer el pedido / al confirmarse el pago) ────────────────
export function buildReceiptEmail(ctx: CustomerEmailCtx): BuiltEmail {
  const en = isEn(ctx.locale);
  const n = shortOrderNumber(ctx.orderNumber);
  const name = firstName(ctx.customerName);
  const total = money(ctx, ctx.total);
  const subject = ctx.paid
    ? (en ? `Order #${n} paid — ${ctx.restaurant.name}` : `Pedido #${n} pagado — ${ctx.restaurant.name}`)
    : (en ? `Order #${n} received — ${ctx.restaurant.name}` : `Pedido #${n} recibido — ${ctx.restaurant.name}`);
  const preheader = `${typeLabel(ctx)} · ${payLine(ctx)} · ${total}`;
  const what = ctx.orderType === 'delivery'
    ? (en ? 'the delivery time' : 'la hora de entrega')
    : (en ? 'the pickup time' : 'la hora para recoger');
  const sub = ctx.orderType === 'dine_in'
    ? (en ? "The kitchen will start on it in a moment." : 'La cocina lo empieza en un momento.')
    : (en ? `The restaurant will confirm it in a moment and we'll email you ${what}.` : `El restaurante lo confirma en un momento y te mandamos ${what} por email.`);
  const place = placeLine(ctx);
  const blocks = [
    pill(ctx.paid ? (en ? 'Paid' : 'Pagado') : (en ? 'Received' : 'Recibido')),
    `${heading(name ? (en ? `Thanks, ${esc(name)}. We got your order.` : `Gracias, ${esc(name)}. Recibimos tu pedido.`) : (en ? 'Thanks. We got your order.' : 'Gracias. Recibimos tu pedido.'))}<div style="height:6px;line-height:6px;">&nbsp;</div>${para(esc(sub))}`,
    orderNumberBlock(ctx),
    button(ctx.trackingUrl, en ? 'Track your order' : 'Seguir mi pedido'),
    itemsBlock(ctx),
    totalsBlock(ctx),
    infoBlock([...(place ? [place] : []), { k: en ? 'Payment' : 'Pago', v: esc(payLine(ctx)) }]),
  ];
  return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks }) };
}

// ── 2. Hora exacta (al aceptar; y si la cocina se atrasa) ──────────────────
export function buildEtaEmail(ctx: CustomerEmailCtx, opts: { readyAtMs?: number | null; arrivalMs?: number | null; isUpdate?: boolean }): BuiltEmail {
  const en = isEn(ctx.locale);
  const n = shortOrderNumber(ctx.orderNumber);
  const tz = ctx.restaurant.timezone;
  const delivery = ctx.orderType === 'delivery';
  const total = money(ctx, ctx.total);
  const count = itemCount(ctx);
  const itemsTxt = en ? `${count} item${count === 1 ? '' : 's'}` : `${count} producto${count === 1 ? '' : 's'}`;

  let label: string;
  let big: string;
  let subject: string;
  if (delivery && opts.arrivalMs) {
    big = windowLabel(opts.arrivalMs, ctx.locale, tz);
    label = en ? 'Arrives' : 'Llega entre';
    subject = opts.isUpdate
      ? (en ? `New delivery time: ${big} — order #${n}` : `Nueva hora de entrega: ${big} — pedido #${n}`)
      : (en ? `Arrives ${big} — order #${n}` : `Llega entre ${big} — pedido #${n}`);
  } else if (opts.readyAtMs) {
    big = fmtClock(opts.readyAtMs, ctx.locale, tz);
    label = ctx.orderType === 'dine_in' ? (en ? 'Ready around' : 'Listo cerca de las') : (en ? 'Ready for pickup around' : 'Listo para recoger cerca de las');
    subject = opts.isUpdate
      ? (en ? `New pickup time: ${big} — order #${n}` : `Nueva hora: ${big} — pedido #${n}`)
      : (en ? `Ready around ${big} — order #${n}` : `Listo cerca de las ${big} — pedido #${n}`);
  } else {
    big = `#${n}`;
    label = en ? 'Order accepted' : 'Pedido aceptado';
    subject = en ? `Order #${n} accepted — ${ctx.restaurant.name}` : `Pedido #${n} aceptado — ${ctx.restaurant.name}`;
  }
  const heroSub = opts.isUpdate
    ? (en ? 'The kitchen needs a few more minutes. Sorry for the wait.' : 'La cocina necesita unos minutos más. Perdón por la espera.')
    : (en ? "We're making your order now." : 'Ya estamos preparando tu pedido.');
  const preheader = `${opts.isUpdate ? '' : (en ? "We're making it now · " : 'Ya lo estamos preparando · ')}${itemsTxt} · ${total}`;
  const place = placeLine(ctx);
  const blocks = [
    hero(esc(label), esc(big), esc(heroSub)),
    button(ctx.trackingUrl, en ? 'Track your order' : 'Seguir mi pedido'),
    infoBlock([
      { v: `#${esc(n)} · ${esc(itemsTxt)} · <b>${esc(total)}</b> · ${esc(payLine(ctx))}` },
      ...(place ? [{ v: place.v }] : []),
    ]),
  ];
  return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks }) };
}

// ── 3a. Listo para recoger (pickup) ───────────────────────────────────────
export function buildReadyEmail(ctx: CustomerEmailCtx): BuiltEmail {
  const en = isEn(ctx.locale);
  const n = shortOrderNumber(ctx.orderNumber);
  const total = money(ctx, ctx.total);
  const subject = en ? `Your order #${n} is ready — ${ctx.restaurant.name}` : `Tu pedido #${n} está listo — ${ctx.restaurant.name}`;
  const pay = ctx.paid ? (en ? 'Already paid' : 'Ya está pagado') : `${en ? 'Pay' : 'Pagas'} ${total}${ctx.paymentMethod === 'cash' ? (en ? ' cash' : ' en efectivo') : ''}`;
  const preheader = `${en ? `Show #${n} at the counter` : `Muestra el #${n} en el mostrador`} · ${pay}`;
  const place = placeLine(ctx);
  const blocks = [
    hero(en ? 'Ready now' : 'Listo ahora', `#${esc(n)}`, en ? 'Show this number at the counter.' : 'Muestra este número en el mostrador.', 'ink'),
    button(ctx.mapsUrl || ctx.trackingUrl, ctx.mapsUrl ? (en ? 'Get directions' : 'Cómo llegar') : (en ? 'View order' : 'Ver pedido')),
    infoBlock([
      ...(place ? [{ k: place.k, v: esc(ctx.restaurant.address ?? '') }] : []),
      { k: en ? 'Payment' : 'Pago', v: `${esc(payLine(ctx))}${ctx.paid ? '' : ` · <b>${esc(total)}</b>`}` },
    ]),
    ctx.mapsUrl ? `<div style="text-align:center;font-family:${BODY};font-size:14px;">${link(ctx.trackingUrl, en ? 'View order' : 'Ver pedido')}</div>` : '',
  ];
  return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks }) };
}

// ── 3b. En camino (delivery) ──────────────────────────────────────────────
export function buildOnTheWayEmail(ctx: CustomerEmailCtx, opts: { arrivalMs: number; driverName?: string | null }): BuiltEmail {
  const en = isEn(ctx.locale);
  const n = shortOrderNumber(ctx.orderNumber);
  const total = money(ctx, ctx.total);
  const win = windowLabel(opts.arrivalMs, ctx.locale, ctx.restaurant.timezone);
  const driver = firstName(opts.driverName ?? '');
  const subject = driver
    ? (en ? `${driver} is on the way — arrives ${win}` : `${driver} viene en camino — llega entre ${win}`)
    : (en ? `Your order is on the way — arrives ${win}` : `Tu pedido viene en camino — llega entre ${win}`);
  const cashDue = !ctx.paid && ctx.paymentMethod === 'cash';
  const heroSub = cashDue
    ? (en ? `Have ${total} in cash ready.` : `Ten listos ${total} en efectivo.`)
    : ctx.paid ? (en ? 'Already paid. Just meet the driver.' : 'Ya está pagado. Solo recibe al repartidor.') : (en ? `Total: ${total}.` : `Total: ${total}.`);
  const preheader = `${cashDue ? (en ? `Have ${total} cash ready` : `Ten ${total} en efectivo`) : (en ? 'On its way' : 'En camino')} · ${en ? 'Track live' : 'Síguelo en vivo'}`;
  const label = driver ? (en ? `${esc(driver)} is on the way · arrives` : `${esc(driver)} viene en camino · llega entre`) : (en ? 'On the way · arrives' : 'En camino · llega entre');
  const count = itemCount(ctx);
  const blocks = [
    hero(label, esc(win), esc(heroSub)),
    button(ctx.trackingUrl, en ? 'Track live' : 'Seguir en vivo'),
    infoBlock([
      ...(ctx.deliveryAddress ? [{ k: en ? 'Deliver to' : 'Entregar en', v: esc(ctx.deliveryAddress) }] : []),
      { k: en ? 'Order' : 'Pedido', v: `#${esc(n)} · ${count} ${en ? (count === 1 ? 'item' : 'items') : (count === 1 ? 'producto' : 'productos')} · ${esc(payLine(ctx))}` },
    ]),
  ];
  return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks }) };
}

// ── 4. Cancelado / reembolsado ────────────────────────────────────────────
export function buildCancelledEmail(ctx: CustomerEmailCtx, opts: { reason?: string | null; refunded: boolean }): BuiltEmail {
  const en = isEn(ctx.locale);
  const n = shortOrderNumber(ctx.orderNumber);
  const total = money(ctx, ctx.total);
  const name = firstName(ctx.customerName);
  const subject = opts.refunded
    ? (en ? `Order #${n} was cancelled — refund on the way` : `Pedido #${n} cancelado — te devolvemos el dinero`)
    : (en ? `Order #${n} was cancelled — ${ctx.restaurant.name}` : `Pedido #${n} cancelado — ${ctx.restaurant.name}`);
  const preheader = opts.refunded
    ? (en ? `${total} back to your card in 5–10 business days` : `${total} vuelven a tu tarjeta en 5 a 10 días hábiles`)
    : (en ? 'Call the restaurant if you have questions' : 'Llama al restaurante si tienes dudas');
  const reason = (opts.reason ?? '').trim();
  const showReason = reason && reason !== 'auto_closed';
  const blocks = [
    pill(en ? 'Cancelled' : 'Cancelado', 'red'),
    `${heading(name ? (en ? `Sorry, ${esc(name)}. Your order was cancelled.` : `Lo sentimos, ${esc(name)}. Tu pedido fue cancelado.`) : (en ? 'Sorry. Your order was cancelled.' : 'Lo sentimos. Tu pedido fue cancelado.'))}${showReason ? `<div style="height:6px;line-height:6px;">&nbsp;</div>${para(`${en ? 'Reason from the restaurant' : 'Motivo del restaurante'}: “${esc(reason)}”`)}` : ''}`,
    opts.refunded
      ? infoBlock([{ k: en ? 'Refund' : 'Reembolso', v: `<b>${esc(total)}</b> ${en ? 'back to your card' : 'vuelven a tu tarjeta'}` }, { v: en ? 'Usually arrives in 5–10 business days.' : 'Suele llegar en 5 a 10 días hábiles.' }])
      : '',
    ctx.restaurant.phone ? button(telHref(ctx.restaurant.phone), en ? `Call ${ctx.restaurant.name}` : `Llamar a ${ctx.restaurant.name}`) : '',
    button(ctx.menuUrl, en ? 'Order something else' : 'Pedir otra cosa', true),
  ];
  return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks }) };
}

// ── 5. ¿Qué tal estuvo? (reseña, una por cliente cada 7 días) ─────────────
export function buildReviewEmail(ctx: CustomerEmailCtx, opts: { reviewUrl: string; unsubscribeUrl?: string | null }): BuiltEmail {
  const en = isEn(ctx.locale);
  const name = firstName(ctx.customerName);
  const subject = en ? `How was your order from ${ctx.restaurant.name}?` : `¿Qué tal tu pedido de ${ctx.restaurant.name}?`;
  const preheader = en ? 'One tap to rate it · it helps the restaurant' : 'Un toque para calificar · ayuda al restaurante';
  const summary = ctx.items.slice(0, 3).map((i) => i.name).join(', ') + (ctx.items.length > 3 ? '…' : '');
  const sep = opts.reviewUrl.includes('?') ? '&' : '?';
  const stars = [1, 2, 3, 4, 5].map((r) => `<td style="padding:0 3px;"><a href="${esc(`${opts.reviewUrl}${sep}r=${r}`)}" aria-label="${r} ${en ? (r === 1 ? 'star' : 'stars') : (r === 1 ? 'estrella' : 'estrellas')}" class="line" style="display:block;width:46px;height:46px;line-height:46px;text-align:center;border:1px solid ${T.line};border-radius:12px;font-size:22px;color:#F5A524;text-decoration:none;">&#9733;</a></td>`).join('');
  const blocks = [
    `${heading(name ? (en ? `How was your order, ${esc(name)}?` : `¿Qué tal estuvo tu pedido, ${esc(name)}?`) : (en ? 'How was your order?' : '¿Qué tal estuvo tu pedido?'), 'center')}${summary ? `<div style="height:6px;line-height:6px;">&nbsp;</div><p class="sub" style="margin:0;text-align:center;font-family:${BODY};font-size:15px;color:${T.sub};">${esc(summary)}</p>` : ''}`,
    `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr>${stars}</tr></table>`,
    `<div style="text-align:center;font-family:${BODY};font-size:14px;">${link(ctx.trackingUrl, en ? 'Something wrong? Tell the restaurant privately' : '¿Algo salió mal? Díselo al restaurante en privado')}</div>`,
  ];
  const footerExtra = opts.unsubscribeUrl
    ? link(opts.unsubscribeUrl, en ? 'Unsubscribe from review requests' : 'No recibir más pedidos de reseña')
    : (en ? 'Reply to this email to reach the restaurant.' : 'Responde este email para hablar con el restaurante.');
  return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks, footerExtra }) };
}
