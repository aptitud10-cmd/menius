/**
 * ESC/POS thermal printer encoder.
 * Supports 80mm and 58mm thermal printers via:
 *   1. Web Bluetooth (Chrome Android — preferred for tablets)
 *   2. Web Serial / USB (Chrome desktop)
 *   3. Browser print dialog fallback (all browsers)
 */

// ── Web Serial typings ────────────────────────────────────────────────────────
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

// ── Web Bluetooth typings ─────────────────────────────────────────────────────
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: {
        filters?: Array<{ services?: string[] }>;
        optionalServices?: string[];
        acceptAllDevices?: boolean;
      }): Promise<BluetoothDevice>;
    };
  }

  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATTServer;
    name?: string;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  }

  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    writeValueWithoutResponse(value: ArrayBuffer): Promise<void>;
    writeValue(value: ArrayBuffer): Promise<void>;
  }
}

// ESC/POS printers expose a serial-port-like GATT service.
// These UUIDs cover the vast majority of generic BT thermal printers (Xprinter,
// GOOJPRT, MUNBYN, etc.). Epson and Star use the same service.
const BT_SERVICE_UUID        = '000018f0-0000-1000-8000-00805f9b34fb';
const BT_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Bluetooth MTU is typically 20-512 bytes; we chunk conservatively at 512.
const BT_CHUNK_SIZE = 512;

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

// ── USB / Web Serial ──────────────────────────────────────────────────────────
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

export async function disconnectPrinter(): Promise<void> {
  if (cachedPort) {
    try { await cachedPort.close(); } catch { /* ignore */ }
    cachedPort = null;
  }
}

export function isPrinterConnected(): boolean {
  return cachedPort !== null;
}

// ── Bluetooth ─────────────────────────────────────────────────────────────────
let cachedBtChar: BluetoothRemoteGATTCharacteristic | null = null;

export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export function isBluetoothPrinterConnected(): boolean {
  return cachedBtChar !== null;
}

export async function connectBluetoothPrinter(): Promise<BluetoothRemoteGATTCharacteristic | null> {
  if (!isWebBluetoothSupported()) return null;
  try {
    const device = await navigator.bluetooth!.requestDevice({
      filters: [{ services: [BT_SERVICE_UUID] }],
      optionalServices: [BT_SERVICE_UUID],
    });
    const server  = await device.gatt!.connect();
    const service = await server.getPrimaryService(BT_SERVICE_UUID);
    const char    = await service.getCharacteristic(BT_CHARACTERISTIC_UUID);
    cachedBtChar  = char;
    // Auto-clear cache when the device disconnects
    device.addEventListener('gattserverdisconnected', () => { cachedBtChar = null; });
    return char;
  } catch {
    return null;
  }
}

export async function disconnectBluetoothPrinter(): Promise<void> {
  cachedBtChar = null;
}

async function writeBluetooth(bytes: Uint8Array): Promise<void> {
  if (!cachedBtChar) throw new Error('No BT char');
  for (let offset = 0; offset < bytes.length; offset += BT_CHUNK_SIZE) {
    const chunk = bytes.slice(offset, offset + BT_CHUNK_SIZE);
    try {
      await cachedBtChar.writeValueWithoutResponse(chunk.buffer);
    } catch {
      // Some printers only support writeValue (with response)
      await cachedBtChar.writeValue(chunk.buffer);
    }
    // Small delay between chunks to avoid buffer overflow on slow printers
    if (offset + BT_CHUNK_SIZE < bytes.length) {
      await new Promise((r) => setTimeout(r, 20));
    }
  }
}

// ── Unified print entry point ─────────────────────────────────────────────────
export async function printReceipt(data: ReceiptData): Promise<{ success: boolean; method: 'bluetooth' | 'serial' | 'browser'; error?: string }> {
  const receiptBytes = buildReceipt(data);

  // 1. Cached Bluetooth
  if (cachedBtChar) {
    try {
      await writeBluetooth(receiptBytes);
      return { success: true, method: 'bluetooth' };
    } catch {
      cachedBtChar = null;
    }
  }

  // 2. Cached Serial (USB)
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

  // 3. Try new Bluetooth connection
  if (isWebBluetoothSupported()) {
    try {
      const char = await connectBluetoothPrinter();
      if (char) {
        await writeBluetooth(receiptBytes);
        return { success: true, method: 'bluetooth' };
      }
    } catch {
      cachedBtChar = null;
    }
  }

  // 4. Try new Serial connection
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
      // Fall through
    }
  }

  return { success: false, method: 'browser', error: 'no_printer' };
}
