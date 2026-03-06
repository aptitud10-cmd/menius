/**
 * AutoAcceptService — smart auto-accept logic for incoming orders.
 *
 * Evaluates whether an incoming order should be automatically accepted
 * based on configurable thresholds. Config is persisted to localStorage
 * so it survives page refreshes without a DB round-trip.
 */

import type { Order } from '@/types';

export interface AutoAcceptConfig {
  enabled: boolean;
  maxConcurrentOrders: number;
  minOrderValue: number;
  defaultEtaMinutes: number;
}

const STORAGE_KEY = 'menius:auto-accept-config';

const DEFAULTS: AutoAcceptConfig = {
  enabled: false,
  maxConcurrentOrders: 10,
  minOrderValue: 0,
  defaultEtaMinutes: 15,
};

function loadConfig(): AutoAcceptConfig {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveConfig(config: AutoAcceptConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // storage full or unavailable — ignore
  }
}

class AutoAcceptServiceImpl {
  private _config: AutoAcceptConfig = loadConfig();
  private listeners: Set<(config: AutoAcceptConfig) => void> = new Set();

  get config(): AutoAcceptConfig {
    return { ...this._config };
  }

  update(patch: Partial<AutoAcceptConfig>) {
    this._config = { ...this._config, ...patch };
    saveConfig(this._config);
    this.listeners.forEach((fn) => fn(this.config));
  }

  subscribe(fn: (config: AutoAcceptConfig) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /**
   * Returns true if the order should be automatically accepted.
   *
   * Conditions (ALL must pass):
   *   1. Auto-accept is enabled
   *   2. Active order count is below maxConcurrentOrders
   *   3. Order total meets or exceeds minOrderValue
   */
  shouldAutoAccept(order: Order, allOrders: Order[]): boolean {
    if (!this._config.enabled) return false;

    const activeCount = allOrders.filter(
      (o) => o.id !== order.id && !['delivered', 'cancelled'].includes(o.status)
    ).length;

    if (activeCount >= this._config.maxConcurrentOrders) return false;
    if (order.total < this._config.minOrderValue) return false;

    return true;
  }
}

export const AutoAcceptService = new AutoAcceptServiceImpl();
