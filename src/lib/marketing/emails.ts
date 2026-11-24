/**
 * Los 3 emails de marketing por comportamiento (lib/marketing/lifecycle).
 *
 * Mismo diseño que los emails del pedido (emailKit de customer-email): el
 * cliente reconoce al restaurante, no a "una campaña". Reglas de copy:
 *  - Asunto corto, concreto y verdadero; sin emojis, sin MAYÚSCULAS, sin "¡¡".
 *  - Habla de SU pedido (lo que de verdad pidió), no de "nuestras ofertas".
 *  - Un solo botón principal; repetir el pedido es UN toque (?repeat=).
 *  - Pie con dirección física, por qué le llega y baja en un toque (CAN-SPAM).
 */
import { emailKit, esc, cleanSenderName, type CustomerEmailCtx, type BuiltEmail } from '@/lib/notifications/customer-email';
import type { LifecycleKind } from './lifecycle';

const { T, BODY, layout, heading, para, button, link, firstName, money } = emailKit;

export interface MarketingDish {
  name: string;
  price: number | null;
  imageUrl: string | null;
}

export interface LifecycleEmailInput {
  kind: LifecycleKind;
  locale: 'es' | 'en';
  restaurant: {
    name: string;
    address: string | null;
    phone: string | null;
    logoUrl: string | null;
    timezone: string | null;
    brandColor: string | null;
    currency: string;
    canReply: boolean;
  };
  customerName: string;
  menuUrl: string;
  /** Menú con ?repeat=…: vuelve a armar su último pedido en el carrito. */
  repeatUrl: string;
  unsubscribeUrl: string;
  /** Su último pedido, en una línea por plato. */
  lastItems: { qty: number; name: string }[];
  /** El plato de su último pedido que mejor se ve (con foto), si hay. */
  heroDish: MarketingDish | null;
  /** Hasta 3 sugerencias que no pidió (populares o nuevas). */
  picks: MarketingDish[];
  /** Las sugerencias son platos nuevos desde su último pedido. */
  picksAreNew: boolean;
}

function ctxFor(input: LifecycleEmailInput): CustomerEmailCtx {
  const r = input.restaurant;
  return {
    locale: input.locale,
    restaurant: { name: r.name, address: r.address, phone: r.phone, logoUrl: r.logoUrl, timezone: r.timezone, brandColor: r.brandColor },
    orderNumber: '',
    customerName: input.customerName,
    orderType: 'pickup',
    trackingUrl: input.menuUrl,
    menuUrl: input.menuUrl,
    paid: false,
    currency: r.currency,
    items: [],
    discount: 0,
    tax: 0,
    tip: 0,
    deliveryFee: 0,
    total: 0,
    canReply: r.canReply,
  };
}

/** "Cheeseburger Deluxe y 2 más" — el plato que nombra el asunto. */
function dishPhrase(items: { qty: number; name: string }[], en: boolean): string {
  const first = items[0]?.name ?? '';
  const rest = items.length - 1;
  if (!first) return en ? 'your order' : 'tu pedido';
  if (rest <= 0) return first;
  return en ? `${first} and ${rest} more` : `${first} y ${rest} más`;
}

function itemsLine(items: { qty: number; name: string }[]): string {
  return items
    .slice(0, 4)
    .map((i) => `${i.qty > 1 ? `${i.qty}× ` : ''}${esc(i.name)}`)
    .join(' · ') + (items.length > 4 ? ' · …' : '');
}

function heroDishBlock(dish: MarketingDish, href: string): string {
  if (!dish.imageUrl) return '';
  return `<a href="${esc(href)}" style="display:block;text-decoration:none;"><img src="${esc(dish.imageUrl)}" width="440" alt="${esc(dish.name)}" style="display:block;width:100%;max-width:440px;height:auto;border:0;border-radius:14px;"></a>`;
}

function lastOrderCard(input: LifecycleEmailInput, en: boolean): string {
  const label = en ? 'Your last order' : 'Tu último pedido';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="soft" style="background:${T.soft};border-radius:14px;padding:12px 14px;">
<div class="sub" style="font-family:${BODY};font-size:11.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${T.sub};">${label}</div>
<div class="ink" style="font-family:${BODY};font-size:15px;line-height:1.5;font-weight:600;color:${T.ink};padding-top:3px;">${itemsLine(input.lastItems)}</div>
</td></tr></table>`;
}

function picksBlock(input: LifecycleEmailInput, ctx: CustomerEmailCtx, title: string): string {
  if (input.picks.length === 0) return '';
  const rows = input.picks.slice(0, 3).map((d, i) => {
    const img = d.imageUrl
      ? `<td width="84" valign="middle" style="width:84px;padding-right:12px;"><a href="${esc(input.menuUrl)}" style="text-decoration:none;"><img src="${esc(d.imageUrl)}" width="84" alt="" style="display:block;width:84px;height:auto;border:0;border-radius:10px;"></a></td>`
      : '';
    return `<tr><td style="padding:${i === 0 ? 0 : 10}px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${img}<td valign="middle">
<a href="${esc(input.menuUrl)}" class="ink" style="font-family:${BODY};font-size:15px;font-weight:600;line-height:1.35;color:${T.ink};text-decoration:none;">${esc(d.name)}</a>
${d.price != null && d.price > 0 ? `<div class="sub" style="font-family:${BODY};font-size:13.5px;color:${T.sub};padding-top:2px;">${money(ctx, d.price)}</div>` : ''}
</td></tr></table></td></tr>`;
  }).join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="line" style="border-top:1px solid ${T.line};"><tr><td style="padding-top:16px;">
<div class="sub" style="font-family:${BODY};font-size:11.5px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${T.sub};padding-bottom:10px;">${title}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
</td></tr></table>`;
}

function footerExtra(input: LifecycleEmailInput, en: boolean, note?: string): string {
  const name = esc(input.restaurant.name);
  const why = en
    ? `You're getting this because you asked for offers from ${name} when you ordered.`
    : `Te llega porque pediste recibir ofertas de ${name} al hacer tu pedido.`;
  const unsub = link(input.unsubscribeUrl, en ? 'Unsubscribe' : 'Darme de baja');
  return [note, `${why} ${unsub}`].filter(Boolean).join('<br>');
}

export function buildLifecycleEmail(input: LifecycleEmailInput): BuiltEmail {
  const en = input.locale === 'en';
  const ctx = ctxFor(input);
  const r = cleanSenderName(input.restaurant.name);
  const name = firstName(input.customerName);
  const dish = dishPhrase(input.lastItems, en);
  // En el asunto, un solo plato: "your Chorizo & Eggs is one tap away".
  const mainDish = input.heroDish?.name || input.lastItems[0]?.name || (en ? 'order' : 'pedido');
  const hero = input.heroDish ? heroDishBlock(input.heroDish, input.repeatUrl) : '';
  const popularTitle = input.picksAreNew
    ? (en ? 'New since your last visit' : 'Nuevo desde tu última visita')
    : input.kind === 'winback'
      ? (en ? 'Popular right now' : 'Lo más pedido ahora')
      : (en ? 'Also popular here' : 'También se pide mucho');

  if (input.kind === 'second_visit') {
    const subject = name
      ? (en ? `${name}, your ${mainDish} is one tap away` : `${name}, tu ${mainDish} está a un toque`)
      : (en ? `Your ${mainDish} is one tap away` : `Tu ${mainDish} está a un toque`);
    const preheader = en
      ? 'Order it again just the way you made it — no need to choose everything again.'
      : 'Pídelo otra vez tal como lo armaste, sin volver a elegir todo.';
    const blocks = [
      hero,
      `${heading(name ? (en ? `Glad you tried us, ${esc(name)}` : `Qué bueno que nos probaste, ${esc(name)}`) : (en ? 'Glad you tried us' : 'Qué bueno que nos probaste'))}<div style="height:8px;line-height:8px;">&nbsp;</div>${para(en
        ? `Thanks for your first order at ${esc(input.restaurant.name)}. We saved it just the way you made it — when you're hungry again, one tap puts it back in your cart.`
        : `Gracias por tu primer pedido en ${esc(input.restaurant.name)}. Lo guardamos tal como lo armaste: cuando te dé hambre otra vez, un toque y vuelve a tu carrito.`)}`,
      lastOrderCard(input, en),
      button(input.repeatUrl, en ? 'Order the same again' : 'Pedir lo mismo otra vez'),
      picksBlock(input, ctx, popularTitle),
    ];
    return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks, footerExtra: footerExtra(input, en) }) };
  }

  if (input.kind === 'usual') {
    const subject = en ? `Your usual from ${r}?` : `¿Lo de siempre de ${r}?`;
    const preheader = en
      ? `${dish} — back in your cart with one tap.`
      : `${dish}: de vuelta en tu carrito con un toque.`;
    const blocks = [
      hero,
      `${heading(name ? (en ? `The usual, ${esc(name)}?` : `¿Lo de siempre, ${esc(name)}?`) : (en ? 'The usual?' : '¿Lo de siempre?'))}<div style="height:8px;line-height:8px;">&nbsp;</div>${para(en
        ? 'Your last order is saved with every choice you made. One tap and it\'s back in your cart — you can still change anything before you pay.'
        : 'Tu último pedido está guardado con todo lo que elegiste. Un toque y vuelve a tu carrito; antes de pagar puedes cambiar lo que quieras.')}`,
      lastOrderCard(input, en),
      button(input.repeatUrl, en ? 'Order my usual' : 'Pedir lo de siempre'),
      `<div style="text-align:center;font-family:${BODY};font-size:14px;">${link(input.menuUrl, en ? 'Or see the full menu' : 'O ver el menú completo')}</div>`,
    ];
    return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks, footerExtra: footerExtra(input, en) }) };
  }

  // winback
  const subject = en ? `We miss you at ${r}` : `Te extrañamos en ${r}`;
  const preheader = input.picksAreNew
    ? (en ? 'A few new dishes since your last visit.' : 'Hay platos nuevos desde tu última visita.')
    : (en ? "Here's what everyone's ordering lately." : 'Esto es lo que más se está pidiendo.');
  const blocks = [
    hero,
    `${heading(name ? (en ? `It's been a while, ${esc(name)}` : `Hace tiempo que no te vemos, ${esc(name)}`) : (en ? "It's been a while" : 'Hace tiempo que no te vemos'))}<div style="height:8px;line-height:8px;">&nbsp;</div>${para(en
      ? `Everyone at ${esc(input.restaurant.name)} hopes you're doing well. Your last order is still saved if you'd like it again — or take a look at what's new.`
      : `En ${esc(input.restaurant.name)} esperamos que estés muy bien. Tu último pedido sigue guardado por si lo quieres otra vez, o mira lo que hay de nuevo.`)}`,
    picksBlock(input, ctx, popularTitle),
    button(input.menuUrl, en ? 'See the menu' : 'Ver el menú'),
    button(input.repeatUrl, en ? 'Repeat my last order' : 'Repetir mi último pedido', true),
  ];
  const note = en
    ? "This is the only reminder we'll send — we won't write again unless you order."
    : 'Es el único recordatorio que te enviamos: no volvemos a escribirte salvo que pidas.';
  return { subject, preheader, html: layout(ctx, { preheader, title: subject, blocks, footerExtra: footerExtra(input, en, note) }) };
}
