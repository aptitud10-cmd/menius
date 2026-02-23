'use client';

import { useRef, useState } from 'react';
import { Printer, X, Usb, Check, Loader2 } from 'lucide-react';
import {
  printReceipt,
  isWebSerialSupported,
  connectPrinter,
  isPrinterConnected,
  disconnectPrinter,
  type ReceiptData,
} from '@/lib/thermal-printer';
import { formatPrice, cn } from '@/lib/utils';
import type { Order } from '@/types';

interface OrderReceiptProps {
  order: Order;
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  currency: string;
  onClose: () => void;
}

function buildReceiptData(
  order: Order,
  restaurantName: string,
  restaurantPhone: string | undefined,
  restaurantAddress: string | undefined,
  currency: string,
): ReceiptData {
  const items = (order.items ?? []).map((item) => {
    const prod = item.product as { name: string } | undefined;
    return {
      name: prod?.name ?? 'Producto',
      qty: item.qty,
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
      notes: item.notes || undefined,
    };
  });

  return {
    restaurantName,
    restaurantPhone: restaurantPhone || undefined,
    restaurantAddress: restaurantAddress || undefined,
    orderNumber: order.order_number,
    date: new Date(order.created_at).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    }),
    customerName: order.customer_name || '',
    customerPhone: order.customer_phone || undefined,
    orderType: order.order_type || undefined,
    tableName: order.table?.name || undefined,
    items,
    subtotal: Number(order.total),
    total: Number(order.total),
    notes: order.notes || undefined,
    currency,
  };
}

export function OrderReceipt({
  order,
  restaurantName,
  restaurantPhone,
  restaurantAddress,
  currency,
  onClose,
}: OrderReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [printing, setPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<string | null>(null);
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());

  const fmtPrice = (n: number) => formatPrice(n, currency);

  const orderTypeLabels: Record<string, string> = {
    dine_in: 'En local',
    pickup: 'Para llevar',
    delivery: 'Delivery',
  };

  const handleThermalPrint = async () => {
    setPrinting(true);
    setPrintResult(null);
    const data = buildReceiptData(order, restaurantName, restaurantPhone, restaurantAddress, currency);
    const result = await printReceipt(data);

    if (result.success) {
      setPrintResult('thermal');
      setPrinterConnected(true);
    } else {
      handleBrowserPrint();
    }
    setPrinting(false);
  };

  const handleBrowserPrint = () => {
    const content = receiptRef.current;
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Orden #${order.order_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 4mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .big { font-size: 16px; }
          .line { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; }
          .item-note { font-size: 10px; color: #666; padding-left: 16px; }
          .mt { margin-top: 4px; }
          .mb { margin-bottom: 4px; }
          @media print {
            body { width: 80mm; margin: 0; padding: 2mm; }
            @page { size: 80mm auto; margin: 0; }
          }
        </style>
      </head>
      <body>
        ${content.innerHTML}
        <script>
          window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleConnect = async () => {
    const port = await connectPrinter();
    setPrinterConnected(!!port);
  };

  const handleDisconnect = async () => {
    await disconnectPrinter();
    setPrinterConnected(false);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-50"
        onClick={onClose}
      />

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-gray-500" />
            <h3 className="font-semibold text-sm text-gray-900">Imprimir ticket</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt preview */}
        <div className="max-h-[50vh] overflow-y-auto p-5">
          <div
            ref={receiptRef}
            className="font-mono text-[11px] leading-relaxed bg-white border border-gray-100 rounded-lg p-4 shadow-inner"
          >
            <div className="center bold big mb">{restaurantName}</div>
            {restaurantAddress && <div className="center">{restaurantAddress}</div>}
            {restaurantPhone && <div className="center">Tel: {restaurantPhone}</div>}

            <div className="line" />

            <div className="center bold big">ORDEN #{order.order_number}</div>
            <div className="center mt">
              {new Date(order.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
            </div>

            <div className="line" />

            {order.customer_name && (
              <div className="row"><span>Cliente:</span><span>{order.customer_name}</span></div>
            )}
            {order.customer_phone && (
              <div className="row"><span>Tel:</span><span>{order.customer_phone}</span></div>
            )}
            {order.order_type && (
              <div className="row"><span>Tipo:</span><span>{orderTypeLabels[order.order_type] || order.order_type}</span></div>
            )}

            <div className="line" />

            {(order.items ?? []).map((item, i) => {
              const prod = item.product as { name: string } | undefined;
              return (
                <div key={i} className="mb">
                  <div className="bold">{item.qty}x {prod?.name ?? 'Producto'}</div>
                  <div className="row">
                    <span>&nbsp;&nbsp;{fmtPrice(Number(item.unit_price))} c/u</span>
                    <span>{fmtPrice(Number(item.line_total))}</span>
                  </div>
                  {item.notes && <div className="item-note">&gt; {item.notes}</div>}
                </div>
              );
            })}

            <div className="line" />

            <div className="row bold big">
              <span>TOTAL</span>
              <span>{fmtPrice(Number(order.total))}</span>
            </div>

            {order.notes && (
              <>
                <div className="line" />
                <div>Notas: {order.notes}</div>
              </>
            )}

            <div className="line" />
            <div className="center mt">¡Gracias por tu compra!</div>
            <div className="center" style={{ fontSize: '9px', color: '#999' }}>Powered by MENIUS</div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-gray-200 space-y-2">
          {/* Printer connection */}
          {isWebSerialSupported() && (
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-1.5">
                <Usb className="w-3 h-3 text-gray-400" />
                <span className={printerConnected ? 'text-emerald-600 font-medium' : 'text-gray-500'}>
                  {printerConnected ? 'Impresora conectada' : 'Sin impresora USB'}
                </span>
              </div>
              <button
                onClick={printerConnected ? handleDisconnect : handleConnect}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  printerConnected
                    ? 'text-red-500 hover:bg-red-50'
                    : 'text-indigo-600 hover:bg-indigo-50',
                )}
              >
                {printerConnected ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
          )}

          {printResult === 'thermal' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mb-2">
              <Check className="w-3.5 h-3.5" /> Enviado a impresora
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleBrowserPrint}
              className="flex-1 dash-btn-secondary justify-center"
            >
              <Printer className="w-4 h-4" /> Imprimir (navegador)
            </button>
            {isWebSerialSupported() && (
              <button
                onClick={handleThermalPrint}
                disabled={printing}
                className="flex-1 dash-btn-primary justify-center"
              >
                {printing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                ) : (
                  <><Usb className="w-4 h-4" /> Impresora térmica</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** Standalone function to quick-print without modal */
export async function quickPrintOrder(
  order: Order,
  restaurantName: string,
  restaurantPhone: string | undefined,
  restaurantAddress: string | undefined,
  currency: string,
): Promise<void> {
  const data = buildReceiptData(order, restaurantName, restaurantPhone, restaurantAddress, currency);
  const result = await printReceipt(data);
  if (!result.success) {
    const receiptHtml = buildBrowserReceiptHtml(data);
    const printWindow = window.open('', '_blank', 'width=320,height=600');
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
    }
  }
}

function buildBrowserReceiptHtml(data: ReceiptData): string {
  const fmt = (n: number) => {
    try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: data.currency }).format(n); }
    catch { return `$${n.toFixed(2)}`; }
  };

  const orderTypeLabels: Record<string, string> = { dine_in: 'En local', pickup: 'Para llevar', delivery: 'Delivery' };

  const itemsHtml = data.items.map(item => `
    <div style="margin-bottom:4px">
      <b>${item.qty}x ${item.name}</b>
      <div style="display:flex;justify-content:space-between">
        <span>&nbsp;&nbsp;${fmt(item.unitPrice)} c/u</span>
        <span>${fmt(item.lineTotal)}</span>
      </div>
      ${item.notes ? `<div style="font-size:10px;color:#666;padding-left:16px">&gt; ${item.notes}</div>` : ''}
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Orden #${data.orderNumber}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:4mm}
    .c{text-align:center}.b{font-weight:bold}.bg{font-size:16px}.ln{border-top:1px dashed #000;margin:6px 0}
    .r{display:flex;justify-content:space-between}.mt{margin-top:4px}
    @media print{body{width:80mm;margin:0;padding:2mm}@page{size:80mm auto;margin:0}}</style></head>
    <body>
    <div class="c b bg">${data.restaurantName}</div>
    ${data.restaurantAddress ? `<div class="c">${data.restaurantAddress}</div>` : ''}
    ${data.restaurantPhone ? `<div class="c">Tel: ${data.restaurantPhone}</div>` : ''}
    <div class="ln"></div>
    <div class="c b bg">ORDEN #${data.orderNumber}</div>
    <div class="c mt">${data.date}</div>
    <div class="ln"></div>
    ${data.customerName ? `<div class="r"><span>Cliente:</span><span>${data.customerName}</span></div>` : ''}
    ${data.customerPhone ? `<div class="r"><span>Tel:</span><span>${data.customerPhone}</span></div>` : ''}
    ${data.orderType ? `<div class="r"><span>Tipo:</span><span>${orderTypeLabels[data.orderType] || data.orderType}</span></div>` : ''}
    ${data.tableName ? `<div class="r"><span>Mesa:</span><span>${data.tableName}</span></div>` : ''}
    <div class="ln"></div>
    ${itemsHtml}
    <div class="ln"></div>
    <div class="r b bg"><span>TOTAL</span><span>${fmt(data.total)}</span></div>
    ${data.notes ? `<div class="ln"></div><div>Notas: ${data.notes}</div>` : ''}
    <div class="ln"></div>
    <div class="c mt">¡Gracias por tu compra!</div>
    <div class="c" style="font-size:9px;color:#999">Powered by MENIUS</div>
    <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}</script>
    </body></html>`;
}
