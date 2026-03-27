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
  modifiers: string[];
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
}
