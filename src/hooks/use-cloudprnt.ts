'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PrintersStatusResponse } from '@/lib/printing/printer-status';

/** SPEC impresión §1b regla 3: al montar y cada 2 min. */
const EVERY_MS = 2 * 60_000;

export interface CloudPrntState {
  /** Hay impresora CloudPRNT activa: la tablet NO imprime por su cuenta (CA-17). */
  active: boolean;
  /** Al menos una impresora activa sin poll en 60 s. */
  offline: boolean;
  /** Tickets que ya deberían haber salido y siguen en cola. */
  queued: number;
  /** Fallidos de las últimas 12 h. */
  failed: number;
  refresh: () => Promise<void>;
}

/**
 * Estado de las impresoras CloudPRNT del restaurante, para el Counter y el
 * panel de pedidos. Si la consulta falla, se mantiene el último estado
 * conocido: un corte de red no reactiva la impresión local (imprimiría doble).
 *
 * `cacheKey` (el id del restaurante): guarda si hay CloudPRNT en la tablet. Al
 * abrir el Counter, hasta que responde la primera consulta, `active` sale de
 * ahí y no de "no sé" = false: un pedido que entraba en ese segundo se
 * imprimía en la tablet Y en la impresora del mostrador.
 */
export function useCloudPrnt(enabled = true, cacheKey?: string): CloudPrntState {
  const storageKey = cacheKey ? `menius:cloudprnt-active:${cacheKey}` : null;
  const [status, setStatus] = useState<PrintersStatusResponse | null>(null);
  const [cachedActive] = useState<boolean>(() => {
    if (!storageKey || typeof window === 'undefined') return false;
    try { return window.localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/printers/status', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as PrintersStatusResponse;
      if (!alive.current) return;
      setStatus(data);
      if (storageKey) {
        try { window.localStorage.setItem(storageKey, data.cloudprntActive ? '1' : '0'); } catch { /* modo privado */ }
      }
    } catch { /* sin red: queda el último estado */ }
  }, [storageKey]);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return () => { alive.current = false; };
    void refresh();
    const id = setInterval(refresh, EVERY_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive.current = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  const printers = status?.printers ?? [];
  return {
    active: status ? Boolean(status.cloudprntActive) : cachedActive,
    offline: printers.some((p) => p.state === 'offline'),
    queued: printers.reduce((n, p) => n + p.queuedCount, 0),
    failed: printers.reduce((n, p) => n + p.failedCount, 0),
    refresh,
  };
}
