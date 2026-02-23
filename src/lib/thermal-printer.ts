/**
 * ESC/POS thermal printer encoder + Web Serial API connection.
 * Supports 80mm and 58mm thermal printers via USB (Web Serial).
 * Falls back to browser print dialog with receipt-optimized CSS.
 */

declare global {
  interface Navigator {
    serial?: {
      requestPort(): Promise<SerialPort>;
    };
  }

  interface SerialPort {
    open(options: { baudRate: number }): Promise<void>;
    close(): Promise<void>;
    writable: WritableStream | null;
  }
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export interface ReceiptData {
  restaurantName: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  orderNumber: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  orderType?: string;
  tableName?: string;
  items: {
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    notes?: string;
  }[];
  subtotal: number;
  total: number;
  notes?: string;
  currency: string;
}

class ESCPOSEncoder {
  private buffer: number[] = [];

  private append(...bytes: number[]) {
    this.buffer.push(...bytes);
    return this;
  }

  text(str: string) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    for (let i = 0; i < encoded.length; i++) {
      this.buffer.push(encoded[i]);
    }
    return this;
  }

  init() {
    return this.append(ESC, 0x40);
  }

  newline() {
    return this.append(LF);
  }

  feed(lines = 1) {
    for (let i = 0; i < lines; i++) this.newline();
    return this;
  }

  alignCenter() {
    return this.append(ESC, 0x61, 1);
  }

  alignLeft() {
    return this.append(ESC, 0x61, 0);
  }

  alignRight() {
    return this.append(ESC, 0x61, 2);
  }

  bold(on: boolean) {
    return this.append(ESC, 0x45, on ? 1 : 0);
  }

  doubleHeight(on: boolean) {
    return this.append(ESC, 0x21, on ? 0x10 : 0x00);
  }

  line(char = '-', width = 32) {
    return this.text(char.repeat(width)).newline();
  }

  row(left: string, right: string, width = 32) {
    const gap = width - left.length - right.length;
    const padded = left + ' '.repeat(Math.max(gap, 1)) + right;
    return this.text(padded).newline();
  }

  cut() {
    return this.feed(3).append(GS, 0x56, 0x00);
  }

  openCashDrawer() {
    return this.append(ESC, 0x70, 0x00, 0x19, 0xfa);
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.buffer);
  }
}

function fmtMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function buildReceipt(data: ReceiptData): Uint8Array {
  const e = new ESCPOSEncoder();
  const fmt = (n: number) => fmtMoney(n, data.currency);

  e.init();

  e.alignCenter().bold(true).doubleHeight(true);
  e.text(data.restaurantName).newline();
  e.doubleHeight(false).bold(false);

  if (data.restaurantAddress) {
    e.text(data.restaurantAddress).newline();
  }
  if (data.restaurantPhone) {
    e.text(`Tel: ${data.restaurantPhone}`).newline();
  }

  e.feed(1).line('=');

  e.alignCenter().bold(true);
  e.text(`ORDEN #${data.orderNumber}`).newline();
  e.bold(false);
  e.text(data.date).newline();

  e.line('-');
  e.alignLeft();

  if (data.customerName) {
    e.row('Cliente:', data.customerName);
  }
  if (data.customerPhone) {
    e.row('Tel:', data.customerPhone);
  }
  if (data.orderType) {
    const typeLabel: Record<string, string> = {
      dine_in: 'En local',
      pickup: 'Para llevar',
      delivery: 'Delivery',
    };
    e.row('Tipo:', typeLabel[data.orderType] || data.orderType);
  }
  if (data.tableName) {
    e.row('Mesa:', data.tableName);
  }

  e.line('=');

  for (const item of data.items) {
    e.bold(true);
    e.text(`${item.qty}x ${item.name}`).newline();
    e.bold(false);
    e.row(`   ${fmt(item.unitPrice)} c/u`, fmt(item.lineTotal));
    if (item.notes) {
      e.text(`   > ${item.notes}`).newline();
    }
  }

  e.line('-');
  e.bold(true);
  e.row('TOTAL', fmt(data.total));
  e.bold(false);

  if (data.notes) {
    e.feed(1);
    e.text(`Notas: ${data.notes}`).newline();
  }

  e.feed(1).line('-');
  e.alignCenter();
  e.text('¡Gracias por tu compra!').newline();
  e.text('Powered by MENIUS').newline();

  e.cut();

  return e.toUint8Array();
}

let cachedPort: SerialPort | null = null;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
}

export async function connectPrinter(): Promise<SerialPort | null> {
  if (!isWebSerialSupported()) return null;

  try {
    const port = await navigator.serial!.requestPort();
    await port.open({ baudRate: 9600 });
    cachedPort = port;
    return port;
  } catch {
    return null;
  }
}

export async function printReceipt(data: ReceiptData): Promise<{ success: boolean; method: 'serial' | 'browser'; error?: string }> {
  const receiptBytes = buildReceipt(data);

  if (cachedPort) {
    try {
      const writer = cachedPort.writable?.getWriter();
      if (writer) {
        await writer.write(receiptBytes);
        writer.releaseLock();
        return { success: true, method: 'serial' };
      }
    } catch {
      cachedPort = null;
    }
  }

  if (isWebSerialSupported()) {
    try {
      const port = await connectPrinter();
      if (port) {
        const writer = port.writable?.getWriter();
        if (writer) {
          await writer.write(receiptBytes);
          writer.releaseLock();
          return { success: true, method: 'serial' };
        }
      }
    } catch {
      // Fall through to browser print
    }
  }

  return { success: false, method: 'browser', error: 'no_serial' };
}

export async function disconnectPrinter(): Promise<void> {
  if (cachedPort) {
    try {
      await cachedPort.close();
    } catch {
      // ignore
    }
    cachedPort = null;
  }
}

export function isPrinterConnected(): boolean {
  return cachedPort !== null;
}
