'use client';

import { useEffect, useRef } from 'react';

/**
 * Recarga la página cuando hay un deploy nuevo, en un momento tranquilo.
 *
 * Por qué (2026-11-24): el Counter queda abierto todo el día dentro de la app, así
 * que un arreglo promovido en Vercel no llegaba a la tablet hasta que alguien
 * cerraba la app. Se compara el id del deploy (/api/version) contra el que había
 * al cargar; si cambió, se espera a que nadie esté usando la pantalla.
 *
 * Solo para la app: en el navegador, recargar deja el sonido bloqueado hasta que
 * alguien toque la pantalla, y una tablet sin alarma de pedidos es peor que una
 * versión vieja.
 */

export const DEPLOY_POLL_MS = 5 * 60_000;
export const RELOAD_CHECK_MS = 30_000;
/** Sin toques en este tiempo = nadie está usando la tablet. */
export const IDLE_BEFORE_RELOAD_MS = 2 * 60_000;

export function shouldReloadForDeploy(s: {
  stale: boolean; visible: boolean; msSinceTouch: number; busy: boolean;
}): boolean {
  return s.stale && s.visible && !s.busy && s.msSinceTouch >= IDLE_BEFORE_RELOAD_MS;
}

/** Algo abierto o a medio escribir en pantalla (cualquier diálogo, un campo con foco). */
function screenInUse(): boolean {
  if (document.querySelector('[role="dialog"],[role="alertdialog"],[aria-modal="true"]')) return true;
  const el = document.activeElement;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
}

/**
 * @param enabled solo dentro de la app del Counter.
 * @param isBusy  true mientras haya algo que una recarga cortaría (pedidos sin
 *                aceptar, un "Deshacer" pendiente, una hoja abierta).
 */
export function useDeployReload(enabled: boolean, isBusy: () => boolean) {
  const busyRef = useRef(isBusy);
  busyRef.current = isBusy;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    let base: string | null = null;
    let stale = false;
    let lastTouch = Date.now();
    const onTouch = () => { lastTouch = Date.now(); };
    window.addEventListener('pointerdown', onTouch, { passive: true });
    window.addEventListener('keydown', onTouch, { passive: true });

    const poll = async () => {
      try {
        const r = await fetch('/api/version', { cache: 'no-store' });
        if (!r.ok) return;
        const { id } = (await r.json()) as { id?: unknown };
        if (!alive || typeof id !== 'string' || !id) return;
        if (base === null) base = id;
        else if (id !== base) stale = true;
      } catch {
        // Sin red: el próximo intento.
      }
    };
    void poll();
    const pollId = setInterval(poll, DEPLOY_POLL_MS);
    const checkId = setInterval(() => {
      const ok = shouldReloadForDeploy({
        stale,
        visible: document.visibilityState === 'visible',
        msSinceTouch: Date.now() - lastTouch,
        busy: busyRef.current() || screenInUse(),
      });
      if (ok) window.location.reload();
    }, RELOAD_CHECK_MS);

    return () => {
      alive = false;
      clearInterval(pollId);
      clearInterval(checkId);
      window.removeEventListener('pointerdown', onTouch);
      window.removeEventListener('keydown', onTouch);
    };
  }, [enabled]);
}
