/**
 * PrinterConfig — browser-side printer routing config.
 * Stored in localStorage per device.
 * Each tablet/PC configures its own printers independently.
 */

const KEY = 'menius:printer-config';

export interface PrinterConfigData {
  receiptEnabled: boolean;   // main customer receipt
  kitchenEnabled: boolean;   // kitchen/prep ticket (items only, no prices)
}

const DEFAULTS: PrinterConfigData = {
  receiptEnabled: true,
  kitchenEnabled: false,
};

function load(): PrinterConfigData {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(config: PrinterConfigData) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY, JSON.stringify(config)); } catch { /* ignore */ }
}

type Listener = (config: PrinterConfigData) => void;

class PrinterConfigImpl {
  private _config = load();
  private listeners = new Set<Listener>();

  get config(): PrinterConfigData { return { ...this._config }; }

  update(patch: Partial<PrinterConfigData>) {
    this._config = { ...this._config, ...patch };
    save(this._config);
    this.listeners.forEach(fn => fn(this.config));
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const PrinterConfig = new PrinterConfigImpl();
