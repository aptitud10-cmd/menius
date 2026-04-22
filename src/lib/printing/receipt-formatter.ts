import type { ReceiptData, ReceiptLineItem } from './types';

// 80mm thermal printer — ~42 chars per line at 12px monospace
const LINE_WIDTH = 42;

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pad(left: string, right: string, width = LINE_WIDTH): string {
  const gap = width - left.length - right.length;
  return gap > 0 ? `${left}${' '.repeat(gap)}${right}` : `${left} ${right}`;
}

function center(text: string, width = LINE_WIDTH): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function divider(char = '-', width = LINE_WIDTH): string {
  return char.repeat(width);
}

// ─── i18n labels ─────────────────────────────────────────────────────────────

function isEn(locale?: string) {
  return locale?.startsWith('en') ?? false;
}

function getLabels(locale?: string) {
  const en = isEn(locale);
  return {
    order:    en ? 'ORDER'         : 'ORDEN',
    customer: en ? 'Customer'      : 'Cliente',
    guest:    en ? 'Guest'         : 'Invitado',
    phone:    en ? 'Phone'         : 'Tel',
    type:     en ? 'Type'          : 'Tipo',
    payment:  en ? 'Payment'       : 'Pago',
    address:  en ? 'Address'       : 'Dir',
    date:     en ? 'Date'          : 'Fecha',
    total:    en ? 'TOTAL'         : 'TOTAL',
    notes:    en ? 'Customer notes': 'Notas del cliente',
    eta:      en ? 'Ready in'      : 'Lista en',
    thanks:   en ? 'Thank you for your order!' : '¡Gracias por su pedido!',
  };
}

function formatCurrency(amount: number, currency: string, locale?: string): string {
  const intlLocale = isEn(locale) ? 'en-US' : 'es-MX';
  try {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(date: Date, locale?: string): string {
  const intlLocale = isEn(locale) ? 'en-US' : 'es-MX';
  return date.toLocaleString(intlLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: isEn(locale),
  });
}

function formatOrderType(type?: string, locale?: string): string {
  const en = isEn(locale);
  const map: Record<string, { es: string; en: string }> = {
    delivery: { es: 'Delivery',       en: 'Delivery' },
    pickup:   { es: 'Para recoger',   en: 'Pickup' },
    dine_in:  { es: 'En mesa',        en: 'Dine-in' },
  };
  if (!type) return '';
  const entry = map[type];
  if (!entry) return type;
  return en ? entry.en : entry.es;
}

function formatPayment(method?: string, locale?: string): string {
  if (!method) return '';
  const en = isEn(locale);
  if (method === 'cash') return en ? 'Cash' : 'Efectivo';
  return en ? 'Online' : 'En línea';
}

function renderItem(item: ReceiptLineItem, currency: string, locale?: string): string {
  const price = formatCurrency(item.lineTotal, currency, locale);
  const nameTruncated = item.name.length > 28 ? item.name.slice(0, 25) + '...' : item.name;
  const lines: string[] = [pad(`${item.qty}x ${nameTruncated}`, price)];

  for (const mod of item.modifiers) {
    lines.push(`   - ${mod}`);
  }
  if (item.notes) {
    lines.push(`   * ${item.notes}`);
  }
  return lines.join('\n');
}

// ─── HTML receipt (iframe print) ─────────────────────────────────────────────

export function buildReceiptHTML(data: ReceiptData): string {
  const {
    restaurantName,
    orderNumber,
    customerName,
    customerPhone,
    orderType,
    tableName,
    paymentMethod,
    deliveryAddress,
    items,
    subtotal,
    deliveryFee,
    discountAmount,
    tip,
    tax,
    taxLabel,
    taxIncluded,
    total,
    notes,
    etaMinutes,
    currency,
    timestamp,
    locale,
    driverTrackingUrl,
    driverQrDataUrl,
  } = data;

  const L = getLabels(locale);
  const en = isEn(locale);
  const htmlLang = en ? 'en' : 'es';

  // ── A: Order type banner label ──
  const typeBannerLabel = (() => {
    if (tableName) return en ? `DINE-IN — ${tableName.toUpperCase()}` : `EN MESA — ${tableName.toUpperCase()}`;
    if (orderType === 'delivery') return 'DELIVERY';
    if (orderType === 'pickup') return en ? 'PICKUP' : 'PARA RECOGER';
    if (orderType === 'dine_in') return en ? 'DINE-IN' : 'EN LOCAL';
    return null;
  })();

  // ── B: Prepaid badge ──
  const isPrepaid = paymentMethod && paymentMethod !== 'cash';
  const prepaidLabel = en ? '★ PREPAID — DO NOT CHARGE ★' : '★ PREPAGADO — NO COBRAR ★';

  const fmt = (n: number) => formatCurrency(n, currency, locale);

  const itemsHTML = items
    .map((item) => {
      const linePriceStr = fmt(item.lineTotal);
      const rawName = item.name.length > 26 ? item.name.slice(0, 23) + '...' : item.name;
      const name = esc(rawName);
      const unitPriceLine = item.qty > 1
        ? `<div class="unit-price">${fmt(item.lineTotal / item.qty)} ${en ? 'ea.' : 'c/u'}</div>`
        : '';
      return `
        <tr class="item-row">
          <td class="item-qty">${esc(String(item.qty))}x</td>
          <td class="item-name">
            <span>${name}</span>
            ${unitPriceLine}
            ${item.modifiers.map((m) => `<div class="mod">— ${esc(m)}</div>`).join('')}
            ${item.notes ? `<div class="item-note">★ ${esc(item.notes)}</div>` : ''}
          </td>
          <td class="item-price">${linePriceStr}</td>
        </tr>`;
    })
    .join('');

  const payLabel = formatPayment(paymentMethod, locale);

  // ── E+F: Totals rows ──
  const totalsRows = [
    `<tr><td class="label">Subtotal</td><td class="value">${fmt(subtotal)}</td></tr>`,
    discountAmount && discountAmount > 0
      ? `<tr><td class="label">${en ? 'Discount' : 'Descuento'}</td><td class="value">-${fmt(discountAmount)}</td></tr>`
      : '',
    deliveryFee && deliveryFee > 0
      ? `<tr><td class="label">${en ? 'Delivery fee' : 'Envío'}</td><td class="value">${fmt(deliveryFee)}</td></tr>`
      : '',
    tip && tip > 0
      ? `<tr><td class="label">${en ? 'Tip' : 'Propina'}</td><td class="value">${fmt(tip)}</td></tr>`
      : '',
    // F: tax included → italic note, no amount line; tax excluded → amount line
    tax && tax > 0
      ? taxIncluded
        ? `<tr><td colspan="2" class="tax-inc-note">* ${taxLabel ?? 'Tax'} ${en ? 'included' : 'incluido'}</td></tr>`
        : `<tr><td class="label">${taxLabel ?? 'Tax'}</td><td class="value">${fmt(tax)}</td></tr>`
      : '',
    `<tr class="total-row"><td class="label">${L.total}</td><td class="value">${fmt(total)}</td></tr>`,
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8" />
  <title>${L.order} #${orderNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm 4mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      background: #fff;
      width: 72mm;
    }
    .center   { text-align: center; }
    .bold     { font-weight: bold; }
    .divider  { border-top: 1px dashed #000; margin: 5px 0; }
    .spacer   { height: 4px; }

    /* Restaurant header */
    .header { text-align: center; margin-bottom: 4px; }
    .restaurant-name { font-size: 16px; font-weight: bold; letter-spacing: 0.5px; }

    /* A: Order type banner — inverse black/white */
    .type-banner {
      background: #000;
      color: #fff;
      text-align: center;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 2px;
      padding: 5px 0;
      margin: 5px 0;
    }

    /* C: Order number XXL */
    .order-num {
      text-align: center;
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 2px;
      margin: 4px 0 2px;
    }
    .order-label {
      text-align: center;
      font-size: 9px;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #555;
    }

    /* B: Prepaid badge */
    .prepaid-badge {
      text-align: center;
      font-size: 11px;
      font-weight: 900;
      border: 2px solid #000;
      padding: 3px 0;
      margin: 4px 0;
      letter-spacing: 1px;
    }

    /* Order meta */
    .meta-row { display: flex; justify-content: space-between; font-size: 10px; }
    .meta-row + .meta-row { margin-top: 2px; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .item-row td { vertical-align: top; padding: 2px 0; }
    .item-qty  { width: 20px; white-space: nowrap; }
    .item-name { padding: 0 4px; }
    .item-price { text-align: right; white-space: nowrap; }
    /* D: unit price sublínea */
    .unit-price { font-size: 9px; color: #555; padding-left: 0; font-style: italic; }
    .mod  { color: #333; font-size: 10px; padding-left: 8px; }
    .item-note { color: #555; font-size: 10px; padding-left: 8px; font-style: italic; }

    /* Totals */
    .totals { width: 100%; }
    .totals td { padding: 1px 0; }
    .totals .value { text-align: right; }
    .totals .total-row td { font-size: 15px; font-weight: bold; padding-top: 4px; }
    /* F: tax included note */
    .tax-inc-note { font-size: 9px; font-style: italic; color: #555; padding-top: 2px; }

    /* ETA */
    .eta {
      text-align: center;
      font-size: 13px;
      font-weight: bold;
      padding: 6px 0;
      letter-spacing: 0.5px;
    }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 9px;
      color: #555;
      margin-top: 6px;
    }

    /* Notes */
    .notes-box {
      border: 1px solid #000;
      padding: 4px 6px;
      margin: 4px 0;
      font-size: 10px;
    }
    .notes-label { font-weight: bold; font-size: 9px; letter-spacing: 0.5px; text-transform: uppercase; }

    /* Driver QR section */
    .driver-section { border: 2px dashed #000; padding: 6px 4px; margin: 6px 0; text-align: center; }
    .driver-title { font-size: 11px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 4px; }
    .driver-qr img { width: 120px; height: 120px; display: block; margin: 0 auto 4px; }
    .driver-url { font-size: 7px; word-break: break-all; color: #333; }
    .driver-hint { font-size: 9px; color: #555; margin-top: 2px; }
  </style>
</head>
<body>

  <!-- HEADER: Restaurant name (primary brand) -->
  <div class="header">
    <div class="restaurant-name">${esc(restaurantName).toUpperCase()}</div>
  </div>

  <!-- A: Order type banner — inverse black/white, scannable at a glance -->
  ${typeBannerLabel ? `<div class="type-banner">${esc(typeBannerLabel)}</div>` : '<div class="divider"></div>'}

  <!-- C: Order number XXL -->
  <div class="order-label">${L.order}</div>
  <div class="order-num">#${esc(orderNumber)}</div>

  <!-- B: Prepaid badge -->
  ${isPrepaid ? `<div class="prepaid-badge">${prepaidLabel}</div>` : ''}

  <div class="divider"></div>

  <!-- ORDER META -->
  <div class="meta-row">
    <span>${L.customer}:</span>
    <span class="bold">${esc(customerName) || L.guest}</span>
  </div>
  ${customerPhone ? `<div class="meta-row"><span>${L.phone}:</span><span>${esc(customerPhone)}</span></div>` : ''}
  ${payLabel ? `<div class="meta-row"><span>${L.payment}:</span><span>${esc(payLabel)}</span></div>` : ''}
  ${deliveryAddress ? `<div class="meta-row"><span>${L.address}:</span><span style="text-align:right;max-width:55mm;">${esc(deliveryAddress)}</span></div>` : ''}
  <div class="meta-row">
    <span>${L.date}:</span>
    <span>${formatDate(timestamp, locale)}</span>
  </div>

  <div class="divider"></div>

  <!-- ITEMS (D: unit price sublínea when qty > 1) -->
  <table>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="divider"></div>

  <!-- TOTALS (E: subtotal + delivery fee + discount; F: tax-included as note) -->
  <table class="totals">
    ${totalsRows}
  </table>

  ${notes ? `
  <div class="divider"></div>
  <div class="notes-box">
    <div class="notes-label">${L.notes}</div>
    <div>${esc(notes)}</div>
  </div>` : ''}

  <div class="divider"></div>

  <!-- ETA -->
  ${etaMinutes ? `<div class="eta">⏱ ${L.eta}: ${etaMinutes} min</div>` : ''}

  <!-- DRIVER TRACKING QR (delivery orders only) -->
  ${driverTrackingUrl ? `
  <div class="driver-section">
    <div class="driver-title">🛵 ${en ? 'Driver / Tracking' : 'Repartidor / Rastreo'}</div>
    <div class="driver-qr">
      <img src="${driverQrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=120x120&ecc=M&data=${encodeURIComponent(driverTrackingUrl)}`}" alt="QR tracking" />
    </div>
    <div class="driver-url">${driverTrackingUrl}</div>
    <div class="driver-hint">${en ? 'Scan to share live location with customer' : 'Escanea para compartir ubicación en tiempo real'}</div>
  </div>` : ''}

  <!-- FOOTER: MENIUS branding secondary (footer, small — does not compete with restaurant) -->
  <div class="footer">
    ${L.thanks}<br/>
    Powered by MENIUS
  </div>

  <div class="spacer"></div>

</body>
</html>`;
}

// ─── Plain text receipt (fallback / logging) ─────────────────────────────────

export function buildReceiptText(data: ReceiptData): string {
  const L = getLabels(data.locale);
  const lines: string[] = [
    divider('='),
    center(data.restaurantName.toUpperCase()),
    divider('='),
    pad(`${L.order}:`, `#${data.orderNumber}`),
    pad(`${L.customer}:`, data.customerName || L.guest),
  ];

  if (data.customerPhone) lines.push(pad(`${L.phone}:`, data.customerPhone));
  if (data.orderType) lines.push(pad(`${L.type}:`, formatOrderType(data.orderType, data.locale)));
  if (data.paymentMethod) lines.push(pad(`${L.payment}:`, formatPayment(data.paymentMethod, data.locale)));
  lines.push(pad(`${L.date}:`, formatDate(data.timestamp, data.locale)));

  lines.push(divider());

  for (const item of data.items) {
    lines.push(renderItem(item, data.currency, data.locale));
  }

  lines.push(divider());
  const txtEn = isEn(data.locale);
  const txtFmt = (n: number) => formatCurrency(n, data.currency, data.locale);
  lines.push(pad('Subtotal:', txtFmt(data.subtotal)));
  if (data.discountAmount && data.discountAmount > 0) {
    lines.push(pad(txtEn ? 'Discount:' : 'Descuento:', `-${txtFmt(data.discountAmount)}`));
  }
  if (data.deliveryFee && data.deliveryFee > 0) {
    lines.push(pad(txtEn ? 'Delivery fee:' : 'Envío:', txtFmt(data.deliveryFee)));
  }
  if (data.tip && data.tip > 0) {
    lines.push(pad(txtEn ? 'Tip:' : 'Propina:', txtFmt(data.tip)));
  }
  if (data.tax && data.tax > 0) {
    if (data.taxIncluded) {
      lines.push(`* ${data.taxLabel ?? 'Tax'} ${txtEn ? 'included' : 'incluido'}`);
    } else {
      lines.push(pad(`${data.taxLabel ?? 'Tax'}:`, txtFmt(data.tax)));
    }
  }
  lines.push(pad(`${L.total}:`, txtFmt(data.total)));
  lines.push(divider());

  if (data.notes) {
    lines.push(`${L.notes}: ` + data.notes);
    lines.push(divider());
  }

  if (data.etaMinutes) {
    lines.push(center(`⏱ ${L.eta}: ${data.etaMinutes} min`));
  }

  lines.push(center(L.thanks));
  lines.push(center('Powered by MENIUS'));
  lines.push(divider('='));

  return lines.join('\n');
}

// ─── Kitchen ticket (items only, no prices) ──────────────────────────────────

export function buildKitchenHTML(data: ReceiptData): string {
  const { restaurantName, orderNumber, orderType, tableName, items, notes, etaMinutes, locale } = data;
  const L = getLabels(locale);
  const htmlLang = isEn(locale) ? 'en' : 'es';
  const typeLabel = formatOrderType(orderType, locale);

  const itemsHTML = items.map(item => {
    const rawName = item.name.length > 30 ? item.name.slice(0, 27) + '...' : item.name;
    const name = esc(rawName);
    return `
      <div class="item">
        <span class="qty">${esc(String(item.qty))}x</span>
        <div class="name">
          <strong>${name}</strong>
          ${item.modifiers.map(m => `<div class="mod">— ${esc(m)}</div>`).join('')}
          ${item.notes ? `<div class="note">★ ${esc(item.notes)}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8" />
  <title>KITCHEN #${orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.5; width: 72mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .divider { border-top: 2px dashed #000; margin: 6px 0; }
    .order-num { font-size: 28px; font-weight: 900; text-align: center; letter-spacing: 2px; margin: 6px 0; }
    .tag { font-size: 11px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
    .item { display: flex; gap: 6px; padding: 4px 0; border-bottom: 1px dotted #ccc; }
    .qty { font-size: 14px; font-weight: 900; min-width: 22px; }
    .name { flex: 1; }
    .name strong { font-size: 13px; }
    .mod { font-size: 10px; color: #444; padding-left: 8px; }
    .note { font-size: 10px; color: #222; padding-left: 8px; font-style: italic; font-weight: bold; }
    .eta { font-size: 16px; font-weight: bold; text-align: center; margin: 8px 0; }
    .notes-box { border: 2px solid #000; padding: 5px 8px; margin: 6px 0; font-size: 11px; font-weight: bold; }
    .table-name { font-size: 22px; font-weight: 900; text-align: center; border: 3px solid #000; padding: 4px 0; margin: 4px 0; letter-spacing: 1px; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:13px;">${esc(restaurantName).toUpperCase()}</div>
  <div class="tag">${isEn(locale) ? 'KITCHEN TICKET' : 'TICKET DE COCINA'}</div>
  <div class="divider"></div>
  <div class="order-num">#${esc(orderNumber)}</div>
  ${tableName ? `<div class="table-name">🍽 ${esc(tableName).toUpperCase()}</div>` : typeLabel ? `<div class="tag">${esc(typeLabel).toUpperCase()}</div>` : ''}
  <div class="divider"></div>
  ${itemsHTML}
  <div class="divider"></div>
  ${notes ? `<div class="notes-box">⚠️ ${esc(notes)}</div>` : ''}
  ${etaMinutes ? `<div class="eta">⏱ ${etaMinutes} min</div>` : ''}
</body>
</html>`;
}
