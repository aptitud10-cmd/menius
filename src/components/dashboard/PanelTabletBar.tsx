'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, BellRing } from 'lucide-react';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { isAwaitingOnlinePayment } from '@/lib/order-state';
import { PANEL_UNLOCK_MINUTES } from '@/lib/panel-pin-shared';

const TOUCH_EVERY_MS = 60_000;
const POLL_MS = 8_000;
const RING_MS = 4_000;

/**
 * Franja del panel abierto desde la tablet del Counter con el PIN del dueño.
 *
 *  - Se cierra sola tras 10 min sin tocar la pantalla (el servidor también la
 *    vence: si el navegador falla, el panel se bloquea igual).
 *  - Cada toque renueva los 10 min (a lo sumo una llamada por minuto).
 *  - Si entra un pedido, se pone roja y suena cada 4 s hasta que alguien lo
 *    acepte o rechace — el Counter no está a la vista y no se puede perder.
 */
export function PanelTabletBar({ restaurantId }: { restaurantId: string }) {
  const { locale } = useDashboardLocale();
  const en = locale === 'en';
  const [until, setUntil] = useState(() => Date.now() + PANEL_UNLOCK_MINUTES * 60_000);
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState(0);
  const lastTouch = useRef(0);
  const activity = useRef(false);
  const leaving = useRef(false);

  const backToCounter = useCallback(async () => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      await fetch('/api/devices/panel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
        keepalive: true,
      });
    } catch { /* la página del Counter la cierra igual al cargar */ }
    window.location.href = '/counter';
  }, []);

  const touch = useCallback(async () => {
    lastTouch.current = Date.now();
    activity.current = false;
    try {
      const res = await fetch('/api/devices/panel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'touch' }),
      });
      if (res.status === 403) { void backToCounter(); return; }
      const data = (await res.json().catch(() => ({}))) as { until?: string };
      if (data.until) setUntil(new Date(data.until).getTime());
    } catch { /* sin red: el reloj local sigue corriendo */ }
  }, [backToCounter]);

  // Al entrar: sincroniza el vencimiento con el servidor.
  useEffect(() => { void touch(); }, [touch]);

  // Actividad → renueva (como mucho una vez por minuto).
  useEffect(() => {
    const onActivity = () => {
      activity.current = true;
      if (Date.now() - lastTouch.current >= TOUCH_EVERY_MS) void touch();
    };
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    return () => {
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
    };
  }, [touch]);

  // Reloj: muestra cuánto falta y vuelve al Counter al vencer.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= until) void backToCounter();
      else if (activity.current && t - lastTouch.current >= TOUCH_EVERY_MS) void touch();
    }, 1000);
    return () => clearInterval(id);
  }, [until, backToCounter, touch]);

  // Pedidos sin aceptar (como el Counter: los online sin cobrar no cuentan).
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    let stop = false;
    const poll = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, status, payment_method, payment_status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'pending')
        .limit(20);
      if (!stop && data) setPending(data.filter(o => !isAwaitingOnlinePayment(o)).length);
    };
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => { stop = true; clearInterval(id); };
  }, [restaurantId]);

  useEffect(() => {
    if (pending === 0) return;
    const ring = () => {
      try { void new Audio('/sounds/new-order.mp3').play().catch(() => {}); } catch { /* sin audio */ }
    };
    ring();
    const id = setInterval(ring, RING_MS);
    return () => clearInterval(id);
  }, [pending]);

  const secs = Math.max(0, Math.ceil((until - now) / 1000));
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const alert = pending > 0;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-32px)] max-w-[640px] bottom-20 md:bottom-5"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      role={alert ? 'alert' : 'status'}
    >
      <div
        className={`flex items-center gap-3 rounded-2xl pl-4 pr-2 py-2 shadow-2xl ${alert ? 'ring-4 ring-red-300/70' : ''}`}
        style={{ background: alert ? '#C81E1E' : '#111816', color: '#fff' }}
      >
        {alert && <BellRing className="w-5 h-5 flex-none animate-pulse" />}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight">
            {alert
              ? (en ? `${pending} new ${pending === 1 ? 'order' : 'orders'} waiting` : `${pending} ${pending === 1 ? 'pedido nuevo' : 'pedidos nuevos'} esperando`)
              : (en ? 'Panel opened from the tablet' : 'Panel abierto desde la tablet')}
          </p>
          <p className="text-[13px] leading-tight opacity-80">
            {en ? `Locks in ${mmss} without use` : `Se cierra en ${mmss} sin uso`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void backToCounter()}
          className="flex-none h-12 px-4 rounded-xl inline-flex items-center gap-2 text-[15px] font-bold"
          style={{ background: '#fff', color: alert ? '#C81E1E' : '#111816' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span><span className="hidden sm:inline">{en ? 'Back to ' : 'Volver al '}</span>Counter</span>
        </button>
      </div>
    </div>
  );
}
