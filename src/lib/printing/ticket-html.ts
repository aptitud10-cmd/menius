/**
 * El ticket nuevo para imprimir desde el navegador (window.print → impresora de
 * la computadora). Es el MISMO diseño que el PNG de CloudPRNT (render-ticket.tsx)
 * y que la app Android (TicketV2.kt): un solo ticket, tres caminos.
 *
 * Medidas: el PNG mide 576 px sobre 72 mm imprimibles → 1 px = 0.125 mm. Acá se
 * usan los mismos números del PNG pasados a mm, así las proporciones no se
 * separan si alguien toca uno de los dos.
 *
 * Los fondos negros necesitan print-color-adjust: exact (sin eso el navegador
 * no imprime fondos y la franja saldría en blanco).
 */
import qrcode from 'qrcode-generator';
import { formatPrice } from '@/lib/utils';
import { ticketAmount, ticketStrings } from './ticket-i18n';
import type { TicketData, TicketItem } from './ticket-data';

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

function row(left: string, right: string | undefined, cls: string, indentPx = 0): string {
  const style = indentPx ? ` style="padding-left:${mm(10 + indentPx)}"` : '';
  return `<div class="row ${cls}"${style}><span class="l">${esc(left)}</span>${right ? `<span class="r">${esc(right)}</span>` : ''}</div>`;
}

function itemHtml(item: TicketItem, note: string, currency: string): string {
  return `<div class="item">
    ${row(`${item.qty}x ${item.name}`, ticketAmount(item.lineTotal, currency), 'item-head')}
    ${item.lines.map((l) => row(l.text, l.price > 0 ? ticketAmount(l.price, currency) : undefined, 'item-line', l.indent ? 56 : 32)).join('')}
    ${item.notes ? `<div class="boxed note item-note">${esc(`${note}: ${item.notes}`)}</div>` : ''}
  </div>`;
}

export function buildTicketHTML(d: TicketData): string {
  const t = ticketStrings(d.locale);
  const c = d.restaurant.currency;
  // Una fila por concepto, con el monto en la columna de los precios (como el PNG).
  const totalRows: [string, string][] = [
    [t.subtotal, ticketAmount(d.totals.subtotal, c)],
    ...(d.totals.tax > 0 ? [[d.restaurant.taxLabel, ticketAmount(d.totals.tax, c)] as [string, string]] : []),
    ...(d.totals.deliveryFee > 0 ? [[t.delivery, ticketAmount(d.totals.deliveryFee, c)] as [string, string]] : []),
    ...(d.totals.discount > 0 ? [[t.discount, `-${ticketAmount(d.totals.discount, c)}`] as [string, string]] : []),
    ...(d.totals.tip > 0 ? [[t.tip, ticketAmount(d.totals.tip, c)] as [string, string]] : []),
  ];
  // Etiqueta arriba y valor abajo: en una sola línea no entra al lado del número.
  const sideOfNumber = d.tableName ? [t.table, d.tableName] : d.readyAt ? [t.ready, d.readyAt] : null;

  const payment =
    d.payment.kind === 'paid' ? `<div class="boxed pay">${esc(t.paid)}</div>`
    : d.payment.kind === 'collect_cash' ? `<div class="inv pay-cash">${esc(t.collectCash(formatPrice(d.payment.amount, c)))}</div>`
    : `<div class="boxed thick pay">${esc(t.verifyPayment)}</div>`;

  // Delivery: dirección y teléfono arriba, debajo del número (Pedro 2026-11-18);
  // abajo queda solo el QR del repartidor.
  const delivery = d.delivery ? `
    <div class="address">${esc(d.delivery.address)}</div>
    ${d.delivery.phone ? `<div class="phone">${esc(prettyPhone(d.delivery.phone))}</div>` : ''}
    ${d.delivery.instructions ? `<div class="boxed note">${esc(d.delivery.instructions)}</div>` : ''}` : '';
  const driverQr = d.delivery?.driverUrl
    ? `<div class="rule"></div><div class="driver"><div class="driver-label">${esc(t.driverScan)}</div>${qrSvg(d.delivery.driverUrl)}</div>` : '';

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
  .name, .inv, .num, .side, .customer, .allergy, .scheduled, .item-head, .item-count, .total, .pay, .address, .driver-label { font-family: 'Arial Black', 'Arial Bold', Arial, Helvetica, sans-serif; }
  body { width: 72mm; font-family: Arial, Helvetica, sans-serif; font-weight: 700; padding: ${mm(8)} 0 ${mm(48)}; }
  .name { text-align: center; font-size: ${mm(40)}; font-weight: 900; line-height: 1.1; padding: 0 ${mm(10)} ${mm(10)}; }
  .inv { background: #000; color: #fff; font-weight: 900; padding: ${mm(4)} ${mm(16)}; line-height: 1.15; }
  .channel { font-size: ${mm(30)}; }
  .boxed { border: ${mm(3)} solid #000; margin: ${mm(8)} ${mm(10)}; padding: ${mm(6)} ${mm(12)}; font-weight: 900; line-height: 1.2; }
  .boxed.thick { border-width: ${mm(6)}; }
  .reprint { font-size: ${mm(26)}; }
  .num-block { background: #000; color: #fff; padding: ${mm(6)} ${mm(16)} ${mm(10)}; margin-top: ${mm(8)}; }
  .num-block.after-reprint { margin-top: 0; }
  .num-row { display: flex; align-items: center; }
  .num { flex: 1; font-size: ${mm(128)}; font-weight: 900; line-height: 1; }
  .side { font-size: ${mm(32)}; font-weight: 900; white-space: nowrap; text-align: right; line-height: 1.15; padding-left: ${mm(10)}; }
  .customer { font-size: ${mm(44)}; font-weight: 900; line-height: 1.1; }
  .allergy { display: flex; align-items: center; background: #000; color: #fff; font-size: ${mm(30)}; font-weight: 900; padding: ${mm(6)} ${mm(16)}; margin-top: ${mm(6)}; }
  .alert { width: ${mm(34)}; height: ${mm(34)}; margin-right: ${mm(10)}; flex: none; }
  .scheduled { font-size: ${mm(32)}; font-weight: 900; padding: ${mm(8)} ${mm(10)} 0; }
  .utensils { font-size: ${mm(24)}; padding: ${mm(8)} ${mm(10)} 0; }
  .rule { height: ${mm(3)}; background: #000; margin: ${mm(14)} ${mm(10)}; }
  .row { display: flex; padding: ${mm(1)} ${mm(10)}; line-height: 1.2; }
  .row .l { flex: 1; padding-right: ${mm(12)}; }
  .row .r { white-space: nowrap; }
  .item { margin-bottom: ${mm(6)}; break-inside: avoid; }
  .item-head { font-size: ${mm(26)}; font-weight: 900; }
  .item-line { font-size: ${mm(22)}; }
  .note { font-size: ${mm(22)}; }
  /* La nota cuelga del plato; línea fina entre platos (dos Deluxe distintas se leen como dos). */
  .item-note { margin-left: ${mm(42)}; }
  .item-sep { height: ${mm(2)}; background: #000; margin: ${mm(2)} ${mm(10)} ${mm(8)}; }
  .item-count { font-size: ${mm(26)}; font-weight: 900; padding: ${mm(4)} ${mm(10)} 0; }
  .totals { font-size: ${mm(24)}; }
  .total { font-size: ${mm(30)}; font-weight: 900; }
  .pay { font-size: ${mm(30)}; }
  .pay-cash { font-size: ${mm(34)}; margin-top: ${mm(8)}; }
  .address { font-size: ${mm(36)}; font-weight: 900; padding: ${mm(10)} ${mm(10)} 0; line-height: 1.15; }
  .phone { font-size: ${mm(30)}; font-family: 'Arial Black', Arial, Helvetica, sans-serif; padding: ${mm(4)} ${mm(10)} 0; }
  .driver { display: flex; flex-direction: column; align-items: center; margin-top: ${mm(14)}; break-inside: avoid; }
  .driver-label { font-size: ${mm(26)}; font-weight: 900; }
  .qr { width: 30mm; height: 30mm; margin-top: ${mm(6)}; }
  /* Pie como Uber: cuándo entró, para cuándo y las gracias. */
  .placed { font-size: ${mm(24)}; padding: 0 ${mm(10)}; }
  .due { font-size: ${mm(26)}; font-family: 'Arial Black', Arial, Helvetica, sans-serif; padding: ${mm(4)} ${mm(10)} 0; }
  .foot-sep { margin-top: ${mm(14)}; margin-bottom: ${mm(14)}; }
  .thanks { font-size: ${mm(24)}; text-align: center; padding: 0 ${mm(10)}; }
  .foot { text-align: center; padding: ${mm(6)} ${mm(10)} 0; }
  .foot.direct { font-size: ${mm(20)}; }
  .foot.powered { font-size: ${mm(16)}; padding-top: ${mm(10)}; }
</style>
</head>
<body>
  <div class="name">${esc(d.restaurant.name.toUpperCase())}</div>
  <div class="inv channel">${esc(`${t.channel[d.channel]} · ${t.orderType[d.orderType]}`)}</div>
  ${d.kind === 'reprint' ? `<div class="boxed thick reprint">${esc(`${t.reprint}  ${d.reprintedAt ?? ''}`)}</div>` : ''}
  <div class="num-block${d.kind === 'reprint' ? ' after-reprint' : ''}">
    <div class="num-row"><div class="num">#${esc(d.shortNumber)}</div>${sideOfNumber ? `<div class="side"><div>${esc(sideOfNumber[0])}</div><div>${esc(sideOfNumber[1])}</div></div>` : ''}</div>
    ${d.customerName ? `<div class="customer">${esc(d.customerName)}</div>` : ''}
  </div>
  ${d.allergy ? `<div class="allergy">${ALERT_ICON}<div>${esc(`${t.allergy}: ${d.allergy}`)}</div></div>` : ''}
  ${delivery}
  ${d.scheduledFor ? `<div class="scheduled">${esc(`${t.scheduled} ${d.scheduledFor}`)}</div>` : ''}
  <div class="utensils">${esc(t.utensils(d.includeUtensils))}</div>
  <div class="item-count">${esc(t.itemCount(d.itemCount))}</div>
  <div class="rule"></div>
  ${d.items.map((i, n) => (n > 0 ? '<div class="item-sep"></div>' : '') + itemHtml(i, t.note, c)).join('')}
  ${d.orderNotes ? `<div class="boxed note">${esc(`${t.note}: ${d.orderNotes}`)}</div>` : ''}
  <div class="rule"></div>
  ${totalRows.map(([label, value]) => row(label, value, 'totals')).join('')}
  ${row(t.total, ticketAmount(d.totals.total, c), 'total')}
  ${payment}
  ${driverQr}
  <div class="rule"></div>
  <div class="placed">${esc(`${t.placedAt} ${d.placedFull}`)}</div>
  ${d.dueFull ? `<div class="due">${esc(`${t.dueAt} ${d.dueFull}`)}</div>` : ''}
  <div class="item-sep foot-sep"></div>
  <div class="thanks">${esc(t.thanks(d.restaurant.name))}</div>
  ${d.restaurant.orderDirectUrl ? `<div class="foot direct">${esc(`${t.orderDirect}: ${d.restaurant.orderDirectUrl}`)}</div>` : ''}
  <div class="foot powered">${esc(`${d.orderNumber} · ${t.poweredBy}`)}</div>
</body>
</html>`;
}
