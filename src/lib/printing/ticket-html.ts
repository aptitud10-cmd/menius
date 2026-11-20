/**
 * El ticket para imprimir desde el navegador (window.print → impresora de la
 * computadora). Es el MISMO diseño v4 que el PNG de CloudPRNT (render-ticket.tsx,
 * aprobado por Pedro 2026-11-19): si tocás uno, tocá el otro.
 *
 * Medidas: el PNG mide 576 px sobre 72 mm imprimibles → 1 px = 0.125 mm. Acá se
 * usan los mismos números del PNG pasados a mm, así las proporciones no se
 * separan si alguien toca uno de los dos.
 *
 * Los fondos negros necesitan print-color-adjust: exact (sin eso el navegador
 * no imprime fondos y el bloque saldría en blanco).
 */
import qrcode from 'qrcode-generator';
import { formatPrice } from '@/lib/utils';
import { ticketStrings, type TicketStrings } from './ticket-i18n';
import type { TicketData, TicketItem, TicketLine } from './ticket-data';

const mm = (px: number) => `${(px * 0.125).toFixed(2)}mm`;

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function prettyPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  const us = d.length === 11 && d.startsWith('1') ? d.slice(1) : d.length === 10 ? d : null;
  return us ? `(${us.slice(0, 3)}) ${us.slice(3, 6)}-${us.slice(6)}` : phone;
}

/** QR en SVG (módulos negros, corrección M): nítido en cualquier impresora. */
export function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const quiet = 2;
  let path = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
  const vb = n + quiet * 2;
  return `<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" shape-rendering="crispEdges"><rect width="${vb}" height="${vb}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}

const ALERT_ICON = `<svg class="alert" viewBox="0 0 24 24"><path d="M12 2 L23 21 L1 21 Z" fill="#fff"/><rect x="10.8" y="8" width="2.4" height="7" fill="#000"/><rect x="10.8" y="16.6" width="2.4" height="2.4" fill="#000"/></svg>`;

/** "No onions" / "Sin cebolla": la palabra que quita va en negrita (igual que el PNG). */
const REMOVAL = /^(no|sin)\s+/i;

function modLine(l: TicketLine, money: (n: number) => string): string {
  const m = REMOVAL.exec(l.text);
  const text = m ? `<b>${esc(m[1].toUpperCase())}</b> ${esc(l.text.slice(m[0].length))}` : esc(l.text);
  return `<div class="mod${l.indent ? ' sub' : ''}"><span class="l">${l.indent ? '<b>›</b> ' : ''}${text}</span>${l.price > 0 ? `<span class="r">+${esc(money(l.price))}</span>` : ''}</div>`;
}

function itemHtml(item: TicketItem, t: TicketStrings, money: (n: number) => string, first: boolean): string {
  return `<div class="item">
    ${first ? '' : '<div class="item-sep"></div>'}
    <div class="item-head"><span class="qty${item.qty > 1 ? ' many' : ''}">${item.qty}</span><span class="item-name">${esc(item.name)}</span><span class="item-price">${esc(money(item.lineTotal))}</span></div>
    ${item.lines.length ? `<div class="mods">${item.lines.map((l) => modLine(l, money)).join('')}</div>` : ''}
    ${item.notes ? `<div class="box item-note"><span class="lbl">${esc(t.noteLabel)}</span> ${esc(item.notes)}</div>` : ''}
  </div>`;
}

export function buildTicketHTML(d: TicketData): string {
  const t = ticketStrings(d.locale);
  const money = (n: number) => formatPrice(n, d.restaurant.currency);
  // Una fila por concepto; envío, descuento y propina solo si el pedido los tiene.
  const totalRows: [string, string][] = [
    [t.subtotal, money(d.totals.subtotal)],
    ...(d.totals.tax > 0 ? [[d.restaurant.taxLabel, money(d.totals.tax)] as [string, string]] : []),
    ...(d.totals.deliveryFee > 0 ? [[t.delivery, money(d.totals.deliveryFee)] as [string, string]] : []),
    ...(d.totals.discount > 0 ? [[t.discount, `-${money(d.totals.discount)}`] as [string, string]] : []),
    ...(d.totals.tip > 0 ? [[t.tip, money(d.totals.tip)] as [string, string]] : []),
  ];
  // A la derecha del bloque negro: mesa, programado o la hora de listo.
  const side = d.tableName ? [t.table, d.tableName]
    : d.scheduledDay && d.scheduledTime ? [d.scheduledDay, d.scheduledTime]
    : d.readyAt ? [t.readyBy, d.readyAt] : null;

  // Cobro: caja gruesa = cobrar; fina = ya está pago.
  const payment =
    d.payment.kind === 'collect_cash'
      ? `<div class="pay cash"><div class="pay-l"><div class="pay-title nowrap">${esc(t.collectCashTitle)}</div><div class="pay-sub">${esc(t.cashWho[d.orderType])}</div></div><div class="pay-amount">${esc(money(d.payment.amount))}</div></div>`
      : d.payment.kind === 'paid'
        ? `<div class="pay paid"><div class="pay-title">${esc(t.paidTitle)}</div><div class="pay-sub">${esc(t.doNotCharge)}</div></div>`
        : `<div class="pay verify"><div class="pay-title">${esc(t.verifyPayment)}</div></div>`;

  // Delivery: dirección, teléfono, indicaciones y QR arriba (Pedro 2026-11-18).
  const delivery = d.delivery ? `<div class="delivery">
    <div class="lbl big">${esc(t.deliverTo)}</div>
    <div class="address">${esc(d.delivery.address)}</div>
    ${d.delivery.phone ? `<div class="phone">${esc(prettyPhone(d.delivery.phone))}</div>` : ''}
    ${d.delivery.instructions ? `<div class="box"><div class="lbl">${esc(t.instructions)}</div><div class="box-text">${esc(d.delivery.instructions)}</div></div>` : ''}
    ${d.delivery.driverUrl ? `<div class="driver">${qrSvg(d.delivery.driverUrl)}<div class="driver-text"><div class="driver-title">${esc(t.driverTitle)}</div><div class="driver-hint">${esc(t.driverHint)}</div></div></div>` : ''}
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="${d.locale}">
<head>
<meta charset="UTF-8" />
<title>#${esc(d.shortNumber)} · ${esc(d.restaurant.name)}</title>
<style>
  @page { size: 80mm auto; margin: 0 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff; color: #000; }
  /* La térmica imprime pálido lo fino: lo grande va en Arial Black (Windows y Mac la traen). */
  .meta-name, .type, .side, .sched, .num, .customer, .allergy, .lbl, .address, .box-text, .item-note, .driver-title, .count, .item-name, .qty, .mod .r, .tot-total, .pay-title, .pay-amount, .direct, b, .yes, .no, .reprint {
    font-family: 'Arial Black', 'Arial Bold', Arial, Helvetica, sans-serif; font-weight: 900;
  }
  body { width: 72mm; font-family: Arial, Helvetica, sans-serif; font-weight: 700; padding: ${mm(12)} 0 ${mm(40)}; line-height: 1.15; }
  .nowrap { white-space: nowrap; }
  .meta { display: flex; align-items: flex-end; justify-content: space-between; padding: 0 ${mm(14)} ${mm(10)}; }
  .meta-name { font-size: ${mm(26)}; flex: 1; padding-right: ${mm(12)}; }
  .meta-via { font-size: ${mm(22)}; white-space: nowrap; }
  .reprint { border: ${mm(6)} solid #000; margin: 0 ${mm(8)} ${mm(8)}; padding: ${mm(6)} ${mm(12)}; font-size: ${mm(26)}; }
  /* v5: franja negra fina arriba (tipo + hora) y abajo (pide directo); el número en negro sobre blanco. */
  .hero { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; background: #000; color: #fff; padding: ${mm(6)} ${mm(18)}; margin: 0 ${mm(8)}; }
  .hero-l { display: flex; align-items: center; }
  .type { font-size: ${mm(38)}; letter-spacing: ${mm(1)}; }
  .sched { margin-left: ${mm(12)}; border: ${mm(3)} solid #fff; padding: 0 ${mm(8)}; font-size: ${mm(20)}; }
  .side { display: flex; align-items: baseline; white-space: nowrap; margin-left: auto; padding-left: ${mm(12)}; }
  .side-k { font-size: ${mm(20)}; margin-right: ${mm(10)}; }
  .side-v { font-size: ${mm(38)}; }
  .num { font-size: ${mm(130)}; line-height: 1; padding: ${mm(6)} ${mm(14)} 0; letter-spacing: ${mm(-2)}; }
  .customer { font-size: ${mm(56)}; line-height: 1.05; padding: ${mm(12)} ${mm(14)} 0; }
  .allergy { display: flex; align-items: center; background: #000; color: #fff; padding: ${mm(8)} ${mm(18)}; margin: ${mm(12)} ${mm(8)} 0; }
  .allergy .k { font-size: ${mm(22)}; letter-spacing: ${mm(1)}; }
  .allergy .v { font-size: ${mm(30)}; }
  .alert { width: ${mm(38)}; height: ${mm(38)}; margin-right: ${mm(12)}; flex: none; }
  .lbl { font-size: ${mm(20)}; letter-spacing: ${mm(1)}; }
  .lbl.big { font-size: ${mm(22)}; }
  .delivery { margin: ${mm(14)} ${mm(14)} 0; }
  .address { font-size: ${mm(34)}; margin-top: ${mm(2)}; }
  .phone { font-size: ${mm(30)}; margin-top: ${mm(4)}; }
  .box { border: ${mm(3)} solid #000; padding: ${mm(6)} ${mm(10)}; margin-top: ${mm(10)}; }
  .box-text { font-size: ${mm(26)}; }
  .driver { display: flex; align-items: center; margin-top: ${mm(12)}; break-inside: avoid; }
  .qr { width: 22mm; height: 22mm; flex: none; }
  .driver-text { margin-left: ${mm(14)}; }
  .driver-title { font-size: ${mm(30)}; }
  .driver-hint { font-size: ${mm(24)}; margin-top: ${mm(4)}; }
  .count { font-size: ${mm(32)}; padding: ${mm(18)} ${mm(14)} 0; }
  .rule { height: ${mm(3)}; background: #000; margin: ${mm(10)} ${mm(14)}; }
  .rule.mid { margin: ${mm(14)} ${mm(14)}; }
  .rule.thin { height: ${mm(2)}; margin: ${mm(16)} ${mm(14)}; }
  .item { break-inside: avoid; }
  .item-sep { height: ${mm(2)}; background: #000; margin: ${mm(10)} ${mm(14)} ${mm(10)} ${mm(76)}; }
  .item-head { display: flex; align-items: flex-start; padding: 0 ${mm(14)}; }
  .qty { display: flex; align-items: center; flex: none; width: ${mm(46)}; height: ${mm(42)}; margin-right: ${mm(16)}; font-size: ${mm(32)}; }
  .qty.many { background: #000; color: #fff; justify-content: center; }
  .item-name { flex: 1; font-size: ${mm(30)}; padding: ${mm(4)} ${mm(12)} 0 0; }
  .item-price { font-size: ${mm(26)}; padding-top: ${mm(6)}; white-space: nowrap; }
  .mods { margin-top: ${mm(4)}; }
  .mod { display: flex; font-size: ${mm(24)}; line-height: 1.2; padding: ${mm(2)} ${mm(14)} ${mm(2)} ${mm(76)}; }
  .mod.sub { padding-left: ${mm(102)}; }
  .mod .l { flex: 1; padding-right: ${mm(12)}; }
  .mod .r { white-space: nowrap; }
  .item-note { margin: ${mm(8)} ${mm(14)} 0 ${mm(76)}; font-size: ${mm(26)}; }
  .order-note { margin: ${mm(14)} ${mm(14)} 0; }
  .utensils { display: flex; align-items: center; justify-content: space-between; padding: 0 ${mm(14)}; font-size: ${mm(26)}; }
  .yes { background: #000; color: #fff; padding: ${mm(2)} ${mm(14)}; font-size: ${mm(30)}; }
  .no { font-size: ${mm(30)}; padding-right: ${mm(14)}; }
  .totals { display: flex; flex-direction: column; align-items: flex-end; padding: 0 ${mm(14)}; margin-top: ${mm(4)}; }
  .totals .sep { align-self: stretch; height: ${mm(2)}; background: #000; margin: ${mm(14)} 0 ${mm(12)}; }
  .tot { display: flex; width: ${mm(330)}; justify-content: space-between; font-size: ${mm(24)}; padding: ${mm(1)} 0; }
  .tot-line { width: ${mm(330)}; height: ${mm(3)}; background: #000; margin: ${mm(8)} 0; }
  .tot-total { display: flex; width: ${mm(330)}; justify-content: space-between; align-items: baseline; font-size: ${mm(30)}; }
  .tot-total .v { font-size: ${mm(36)}; }
  .pay { margin: ${mm(16)} ${mm(14)} 0; padding: ${mm(8)} ${mm(14)}; break-inside: avoid; }
  .pay.cash { display: flex; align-items: center; justify-content: space-between; border: ${mm(6)} solid #000; }
  .pay.paid { border: ${mm(3)} solid #000; }
  .pay.verify { border: ${mm(6)} solid #000; }
  .pay-l { flex: 1; }
  .pay-title { font-size: ${mm(30)}; }
  .pay.paid .pay-title { font-size: ${mm(34)}; }
  .pay-sub { font-size: ${mm(22)}; margin-top: ${mm(2)}; }
  .pay-amount { font-size: ${mm(46)}; white-space: nowrap; margin-left: ${mm(12)}; }
  .placed { display: flex; justify-content: space-between; padding: 0 ${mm(14)}; font-size: ${mm(22)}; }
  .foot { text-align: center; padding: 0 ${mm(14)}; margin-top: ${mm(20)}; }
  .thanks { font-size: ${mm(24)}; }
  .powered { font-size: ${mm(20)}; margin-top: ${mm(6)}; }
  .direct { text-align: center; background: #000; color: #fff; font-size: ${mm(28)}; margin: ${mm(14)} ${mm(8)} 0; padding: ${mm(8)} ${mm(14)}; }
</style>
</head>
<body>
  <div class="meta"><div class="meta-name">${esc(d.restaurant.name.toUpperCase())}</div><div class="meta-via">${esc(t.orderVia[d.channel])}</div></div>
  ${d.kind === 'reprint' ? `<div class="reprint">${esc(`${t.reprint}  ${d.reprintedAt ?? ''}`)}</div>` : ''}
  <div class="hero">
    <div class="hero-l"><span class="type">${esc(t.orderType[d.orderType])}</span>${d.scheduledDay ? `<span class="sched">${esc(t.scheduled)}</span>` : ''}</div>
    ${side ? `<div class="side"><span class="side-k">${esc(side[0])}</span><span class="side-v">${esc(side[1])}</span></div>` : ''}
  </div>
  <div class="num">#${esc(d.shortNumber)}</div>
  ${d.customerName ? `<div class="customer">${esc(d.customerName)}</div>` : ''}
  ${d.allergy ? `<div class="allergy">${ALERT_ICON}<div><div class="k">${esc(t.allergy)}</div><div class="v">${esc(d.allergy)}</div></div></div>` : ''}
  ${delivery}
  <div class="count">${esc(t.itemCount(d.itemCount))}</div>
  <div class="rule"></div>
  ${d.items.map((i, n) => itemHtml(i, t, money, n === 0)).join('')}
  ${d.orderNotes ? `<div class="box order-note"><div class="lbl">${esc(t.orderNote)}</div><div class="box-text">${esc(d.orderNotes)}</div></div>` : ''}
  <div class="rule mid"></div>
  <div class="utensils"><span>${esc(t.utensilsLabel)}</span>${d.includeUtensils ? `<span class="yes">${esc(t.yes)}</span>` : `<span class="no">${esc(t.no)}</span>`}</div>
  <div class="totals">
    <div class="sep"></div>
    ${totalRows.map(([label, value]) => `<div class="tot"><span>${esc(label)}</span><span>${esc(value)}</span></div>`).join('')}
    <div class="tot-line"></div>
    <div class="tot-total"><span>${esc(t.total)}</span><span class="v">${esc(money(d.totals.total))}</span></div>
  </div>
  ${payment}
  <div class="rule thin"></div>
  <div class="placed"><span>${esc(`${t.placed} ${d.placedShort}`)}</span><span>${esc(d.orderNumber)}</span></div>
  <div class="foot">
    <div class="thanks">${esc(t.thanks(d.restaurant.name))}</div>
    <div class="powered">${esc(t.poweredBy)}</div>
  </div>
  ${d.restaurant.orderDirectUrl ? `<div class="direct">${esc(`${t.orderDirect}: ${d.restaurant.orderDirectUrl}`)}</div>` : ''}
</body>
</html>`;
}
