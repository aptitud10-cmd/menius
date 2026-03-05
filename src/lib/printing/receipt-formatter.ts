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

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatOrderType(type?: string): string {
  const map: Record<string, string> = {
    delivery: 'Delivery',
    pickup: 'Para recoger',
    dine_in: 'En mesa',
  };
  return type ? (map[type] ?? type) : '';
}

function formatPayment(method?: string): string {
  if (!method) return '';
  return method === 'cash' ? 'Efectivo' : 'En línea';
}

function renderItem(item: ReceiptLineItem, currency: string): string {
  const price = formatCurrency(item.lineTotal, currency);
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
    paymentMethod,
    deliveryAddress,
    items,
    total,
    notes,
    etaMinutes,
    currency,
    timestamp,
  } = data;

  const itemsHTML = items
    .map((item) => {
      const price = formatCurrency(item.lineTotal, currency);
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

  const typeLabel = formatOrderType(orderType);
  const payLabel = formatPayment(paymentMethod);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Orden #${orderNumber}</title>
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
    <span class="bold">ORDEN:</span>
    <span class="large">#${orderNumber}</span>
  </div>
  <div class="meta-row">
    <span>Cliente:</span>
    <span class="bold">${customerName || 'Invitado'}</span>
  </div>
  ${customerPhone ? `<div class="meta-row"><span>Tel:</span><span>${customerPhone}</span></div>` : ''}
  ${typeLabel ? `<div class="meta-row"><span>Tipo:</span><span>${typeLabel}</span></div>` : ''}
  ${payLabel ? `<div class="meta-row"><span>Pago:</span><span>${payLabel}</span></div>` : ''}
  ${deliveryAddress ? `<div class="meta-row"><span>Dir:</span><span style="text-align:right;max-width:55mm;">${deliveryAddress}</span></div>` : ''}
  <div class="meta-row">
    <span>Fecha:</span>
    <span>${formatDate(timestamp)}</span>
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
    <tr class="total-row">
      <td class="label">TOTAL</td>
      <td class="value">${formatCurrency(total, currency)}</td>
    </tr>
  </table>

  ${notes ? `
  <div class="divider"></div>
  <div class="notes-box">
    <div class="notes-label">Notas del cliente</div>
    <div>${notes}</div>
  </div>` : ''}

  <div class="divider"></div>

  <!-- ETA -->
  ${etaMinutes ? `<div class="eta">⏱ Lista en: ${etaMinutes} min</div>` : ''}

  <!-- FOOTER -->
  <div class="footer">
    ¡Gracias por su pedido!<br/>
    Powered by MENIUS
  </div>

  <div class="spacer"></div>

</body>
</html>`;
}

// ─── Plain text receipt (fallback / logging) ─────────────────────────────────

export function buildReceiptText(data: ReceiptData): string {
  const lines: string[] = [
    divider('='),
    center(data.restaurantName.toUpperCase()),
    divider('='),
    pad('Orden:', `#${data.orderNumber}`),
    pad('Cliente:', data.customerName || 'Invitado'),
  ];

  if (data.customerPhone) lines.push(pad('Tel:', data.customerPhone));
  if (data.orderType) lines.push(pad('Tipo:', formatOrderType(data.orderType)));
  if (data.paymentMethod) lines.push(pad('Pago:', formatPayment(data.paymentMethod)));
  lines.push(pad('Fecha:', formatDate(data.timestamp)));

  lines.push(divider());

  for (const item of data.items) {
    lines.push(renderItem(item, data.currency));
  }

  lines.push(divider());
  lines.push(pad('TOTAL:', formatCurrency(data.total, data.currency)));
  lines.push(divider());

  if (data.notes) {
    lines.push('Notas: ' + data.notes);
    lines.push(divider());
  }

  if (data.etaMinutes) {
    lines.push(center(`⏱ Lista en: ${data.etaMinutes} min`));
  }

  lines.push(center('¡Gracias por su pedido!'));
  lines.push(center('Powered by MENIUS'));
  lines.push(divider('='));

  return lines.join('\n');
}
