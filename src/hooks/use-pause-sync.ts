'use client';

import { useEffect, useRef } from 'react';
import type { BusyState } from '@/lib/busy-mode';

/**
 * Trae la pausa de pedidos del servidor cada 30 s y al volver la tablet a primer
 * plano, para que una pausa puesta en otra pantalla se vea en esta (antes cada
 * pantalla mostraba la suya hasta recargar; auditoría Counter 2026-11-21 §2.4).
 * `touch()` marca un cambio local: durante 10 s no se pisa con lo del servidor,
 * para que la respuesta de una pausa recién tocada no la "deshaga" a la vista.
 * También trae el modo ocupado (setBusy), que vive al lado en restaurants.
 */
export function usePauseSync(setPausedUntil: (ms: number | null) => void, setBusy?: (b: BusyState) => void) {
  const lastLocal = useRef(0);
  const setRef = useRef(setPausedUntil);
  setRef.current = setPausedUntil;
  const busyRef = useRef(setBusy);
  busyRef.current = setBusy;

  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (Date.now() - lastLocal.current < 10_000) return;
      try {
        const r = await fetch('/api/counter/pause', { cache: 'no-store' });
        if (!r.ok) return;
        const d = (await r.json()) as { pausedUntil?: string | null; busyExtra?: number; busyUntil?: string | null };
        if (!alive || Date.now() - lastLocal.current < 10_000) return;
        setRef.current(d.pausedUntil ? new Date(d.pausedUntil).getTime() : null);
        busyRef.current?.(d.busyExtra && d.busyUntil ? { extra: d.busyExtra, until: new Date(d.busyUntil).getTime() } : { extra: 0, until: null });
      } catch {
        // Sin red: se queda lo que hay; el siguiente intento lo corrige.
      }
    };
    const timer = setInterval(pull, 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void pull(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return { touch: () => { lastLocal.current = Date.now(); } };
}
