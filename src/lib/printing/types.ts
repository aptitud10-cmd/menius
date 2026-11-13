// ─── Print State Machine ──────────────────────────────────────────────────────

export type PrintState =
  | 'idle'
  | 'printing'
  | 'printed'
  | 'failed'
  | 'retrying';

export interface PrintJob {
  id: string;
  orderId: string;
  orderNumber: string;
  state: PrintState;
  attempts: number;
  maxAttempts: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// ─── Receipt data ─────────────────────────────────────────────────────────────

export interface ReceiptLineItem {
  qty: number;
  name: string;
  lineTotal: number;
  /** Una línea por opción. "texto	precio": el precio va a la derecha (lib/modifier-lines). */
  modifiers: string[];
  /** Precio del plato sin opciones. Si viene, el encabezado lo muestra y al final va "Item total". */
  basePrice?: number;
  notes?: string;
}

export interface ReceiptData {
  restaurantName: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  orderType?: string;
  tableName?: string;
  paymentMethod?: string;
  deliveryAddress?: string;
  items: ReceiptLineItem[];
  subtotal: number;
  deliveryFee?: number;
  discountAmount?: number;
  tip?: number;
  tax?: number;
  taxLabel?: string;
  taxIncluded?: boolean;
  total: number;
  notes?: string;
  etaMinutes?: number;
  currency: string;
  timestamp: Date;
  locale?: string;
  driverTrackingUrl?: string;
  driverQrDataUrl?: string;
}
