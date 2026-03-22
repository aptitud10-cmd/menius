import type { ReceiptData, ReceiptLineItem } from './types';

// 80mm thermal printer — ~42 chars per line at 12px monospace
const LINE_WIDTH = 42;

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
    tip,
    total,
    notes,
    etaMinutes,
    currency,
    timestamp,
    locale,
  } = data;

  const L = getLabels(locale);
  const htmlLang = isEn(locale) ? 'en' : 'es';

  const itemsHTML = items
    .map((item) => {
      const price = formatCurrency(item.lineTotal, currency, locale);
      const name =
        item.name.length > 26 ? item.name.slice(0, 23) + '...' : item.name;
      return `
        <tr class="item-row">
          <td class="item-qty">${item.qty}x</td>
          <td class="item-name">
            <span>${name}</span>
            ${item.modifiers.map((m) => `<div class="mod">— ${m}</div>`).join('')}
            ${item.notes ? `<div class="item-note">★ ${item.notes}</div>` : ''}
          </td>
          <td class="item-price">${price}</td>
        </tr>`;
    })
    .join('');

  const typeLabel = formatOrderType(orderType, locale);
  const payLabel = formatPayment(paymentMethod, locale);

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
    .large    { font-size: 14px; font-weight: bold; }
    .xlarge   { font-size: 18px; font-weight: bold; }
    .divider  { border-top: 1px dashed #000; margin: 5px 0; }
    .spacer   { height: 4px; }

    /* Restaurant header */
    .header { text-align: center; margin-bottom: 4px; }
    .restaurant-name { font-size: 15px; font-weight: bold; letter-spacing: 0.5px; }

    /* Order meta */
    .meta-row { display: flex; justify-content: space-between; font-size: 10px; }
    .meta-row + .meta-row { margin-top: 2px; }

    /* Items table */
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .item-row td { vertical-align: top; padding: 2px 0; }
    .item-qty  { width: 20px; white-space: nowrap; }
    .item-name { padding: 0 4px; }
    .item-price { text-align: right; white-space: nowrap; }
    .mod  { color: #333; font-size: 10px; padding-left: 8px; }
    .item-note { color: #555; font-size: 10px; padding-left: 8px; font-style: italic; }

    /* Totals */
    .totals { width: 100%; }
    .totals td { padding: 1px 0; }
    .totals .label { }
    .totals .value { text-align: right; }
    .totals .total-row td { font-size: 15px; font-weight: bold; padding-top: 4px; }

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
    .table-badge { font-size: 20px; font-weight: 900; text-align: center; border: 3px solid #000; padding: 4px 0; margin: 4px 0; letter-spacing: 1px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="restaurant-name">${restaurantName.toUpperCase()}</div>
  </div>

  <div class="divider"></div>

  <!-- ORDER META -->
  <div class="meta-row">
    <span class="bold">${L.order}:</span>
    <span class="large">#${orderNumber}</span>
  </div>
  ${tableName ? `<div class="table-badge">🍽 ${tableName.toUpperCase()}</div>` : ''}
  <div class="meta-row">
    <span>${L.customer}:</span>
    <span class="bold">${customerName || L.guest}</span>
  </div>
  ${customerPhone ? `<div class="meta-row"><span>${L.phone}:</span><span>${customerPhone}</span></div>` : ''}
  ${typeLabel ? `<div class="meta-row"><span>${L.type}:</span><span>${typeLabel}</span></div>` : ''}
  ${payLabel ? `<div class="meta-row"><span>${L.payment}:</span><span>${payLabel}</span></div>` : ''}
  ${deliveryAddress ? `<div class="meta-row"><span>${L.address}:</span><span style="text-align:right;max-width:55mm;">${deliveryAddress}</span></div>` : ''}
  <div class="meta-row">
    <span>${L.date}:</span>
    <span>${formatDate(timestamp, locale)}</span>
  </div>

  <div class="divider"></div>

  <!-- ITEMS -->
  <table>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="divider"></div>

  <!-- TOTALS -->
  <table class="totals">
    ${tip && tip > 0 ? `
    <tr>
      <td class="label">${isEn(locale) ? 'Tip' : 'Propina'}</td>
      <td class="value">${formatCurrency(tip, currency, locale)}</td>
    </tr>` : ''}
    <tr class="total-row">
      <td class="label">${L.total}</td>
      <td class="value">${formatCurrency(total, currency, locale)}</td>
    </tr>
  </table>

  ${notes ? `
  <div class="divider"></div>
  <div class="notes-box">
    <div class="notes-label">${L.notes}</div>
    <div>${notes}</div>
  </div>` : ''}

  <div class="divider"></div>

  <!-- ETA -->
  ${etaMinutes ? `<div class="eta">⏱ ${L.eta}: ${etaMinutes} min</div>` : ''}

  <!-- FOOTER -->
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
  lines.push(pad(`${L.total}:`, formatCurrency(data.total, data.currency, data.locale)));
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
    const name = item.name.length > 30 ? item.name.slice(0, 27) + '...' : item.name;
    return `
      <div class="item">
        <span class="qty">${item.qty}x</span>
        <div class="name">
          <strong>${name}</strong>
          ${item.modifiers.map(m => `<div class="mod">— ${m}</div>`).join('')}
          ${item.notes ? `<div class="note">★ ${item.notes}</div>` : ''}
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
  <div class="center bold" style="font-size:13px;">${restaurantName.toUpperCase()}</div>
  <div class="tag">${isEn(locale) ? 'KITCHEN TICKET' : 'TICKET DE COCINA'}</div>
  <div class="divider"></div>
  <div class="order-num">#${orderNumber}</div>
  ${tableName ? `<div class="table-name">🍽 ${tableName.toUpperCase()}</div>` : typeLabel ? `<div class="tag">${typeLabel.toUpperCase()}</div>` : ''}
  <div class="divider"></div>
  ${itemsHTML}
  <div class="divider"></div>
  ${notes ? `<div class="notes-box">⚠️ ${notes}</div>` : ''}
  ${etaMinutes ? `<div class="eta">⏱ ${etaMinutes} min</div>` : ''}
</body>
</html>`;
}
