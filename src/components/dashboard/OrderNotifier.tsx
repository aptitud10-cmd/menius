'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, X, ShoppingBag } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useNotifications } from '@/hooks/use-notifications';
import { formatPrice } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';
import { isAwaitingOnlinePayment } from '@/lib/order-state';

type OrderLite = {
  id: string; order_number: string; customer_name: string; total: number;
  status?: string | null; payment_method?: string | null; payment_status?: string | null;
  updated_at?: string | null;
};

interface OrderNotifierProps {
  restaurantId: string;
  currency: string;
}

interface OrderToast {
  id: string;
  orderNumber: string;
  customerName: string;
  total: string;
  timestamp: number;
}

/**
 * En el Counter (/app/counter/...) no se monta: el Counter tiene su propia
 * alerta y sonido, y este aviso sonaba encima y tapaba la pantalla con toasts.
 */
export function OrderNotifier(props: OrderNotifierProps) {
  const pathname = usePathname();
  if (pathname?.startsWith('/app/counter')) return null;
  return <OrderNotifierInner {...props} />;
}

function OrderNotifierInner({ restaurantId, currency }: OrderNotifierProps) {
  const { t } = useDashboardLocale();
  const {
    hasPermission,
    requestPermission,
    notifyNewOrder,
  } = useNotifications({ defaultTitle: 'MENIUS Dashboard' });

  const [toasts, setToasts] = useState<OrderToast[]>([]);
  const [showPermBanner, setShowPermBanner] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => setShowPermBanner(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const rtConnectedRef = useRef(false);
  const lastPollRef = useRef<string | null>(null);
  const pollNowRef = useRef<(() => void) | null>(null);
  const backoffRef = useRef(15_000); // current poll interval when RT is down

  const handleNewOrder = useCallback((order: OrderLite) => {
    // Pedido online sin cobrar: el restaurante no lo ve hasta que se paga (igual
    // que el Counter). No se marca como conocido: cuando el pago entra, el UPDATE
    // lo trae y entonces sí suena.
    if (isAwaitingOnlinePayment(order)) return;
    if (knownIdsRef.current.has(order.id)) return;
    knownIdsRef.current.add(order.id);

    const total = formatPrice(Number(order.total || 0), currency);
    notifyNewOrder(order.order_number || '?', total);

    setToasts((prev) => [
      {
        id: order.id,
        orderNumber: order.order_number || '?',
        customerName: order.customer_name || '',
        total,
        timestamp: Date.now(),
      },
      ...prev,
    ].slice(0, 5));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== order.id));
    }, 15000);
  }, [currency, notifyNewOrder]);

  // Polling fallback — fires periodically AND on demand when Realtime errors.
  // Uses browser Supabase client (respects RLS via session cookie) instead of
  // a dedicated API route to keep this self-contained.
  useEffect(() => {
    const poll = async () => {
      try {
        const supabase = getSupabaseBrowser();
        const since = lastPollRef.current ?? new Date(Date.now() - 60_000).toISOString();
        const startedAt = new Date(Date.now() - 30_000).toISOString(); // margen por reloj desfasado; knownIds evita repetir
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, customer_name, total, created_at, updated_at, status, payment_method, payment_status')
          .eq('restaurant_id', restaurantId)
          // updated_at: un pedido online que se cobró recién (el webhook fija
          // updated_at) se creó antes de `since` y si no, nunca sonaba.
          .or(`created_at.gt.${since},and(status.eq.pending,payment_status.eq.paid,updated_at.gt.${since})`)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!data) return;
        for (const o of data) handleNewOrder(o as OrderLite);
        // Hora de la consulta (no el created_at más nuevo): así un pago que entra
        // sobre un pedido viejo sigue cayendo en la ventana siguiente.
        lastPollRef.current = startedAt;
      } catch { /* silent — best effort */ }
    };

    pollNowRef.current = () => { if (!rtConnectedRef.current) poll(); };

    // Periodic poll with exponential backoff — only fires when RT is down.
    // Backoff: 15s → 30s → 60s → 120s (cap), resets to 15s on RT reconnect.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const schedulePoll = () => {
      timeoutId = setTimeout(async () => {
        if (!rtConnectedRef.current) {
          await poll();
          backoffRef.current = Math.min(backoffRef.current * 2, 120_000);
          schedulePoll();
        }
        // If RT reconnected, don't reschedule — the subscribe callback resets backoff
      }, backoffRef.current);
    };
    schedulePoll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      pollNowRef.current = null;
    };
  }, [restaurantId, handleNewOrder]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`global-orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: RealtimePostgresChangesPayload<OrderLite>) => {
          handleNewOrder(payload.new as OrderLite);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: RealtimePostgresChangesPayload<OrderLite>) => {
          // Pedido online que se acaba de cobrar: recién ahora es "nuevo" para el restaurante.
          // updated_at reciente = el webhook acaba de marcarlo pagado (no otra
          // edición de un pedido viejo que esta pestaña no conocía).
          const o = payload.new as OrderLite;
          const fresh = !!o.updated_at && Date.now() - Date.parse(o.updated_at) < 120_000;
          if (o.status === 'pending' && o.payment_status === 'paid' && fresh) handleNewOrder(o);
        }
      )
      .subscribe((status: string) => {
        const wasConnected = rtConnectedRef.current;
        rtConnectedRef.current = status === 'SUBSCRIBED';

        if (status === 'SUBSCRIBED') {
          // RT back online — reset backoff so next outage starts fresh
          backoffRef.current = 15_000;
        } else if (!wasConnected && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED')) {
          // Newly disconnected — poll immediately then let the backoff loop take over
          setTimeout(() => pollNowRef.current?.(), 2000);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, handleNewOrder]);

  return (
    <>
      {/* Notification permission banner */}
      {showPermBanner && !hasPermission && (
        <div className="fixed top-4 right-4 z-[80] max-w-sm animate-in slide-in-from-right">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{t.notif_enable}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.notif_enableDesc}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    await requestPermission();
                    setShowPermBanner(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
                >
                  {t.notif_activate}
                </button>
                <button
                  onClick={() => setShowPermBanner(false)}
                  className="px-3 py-1.5 rounded-lg text-gray-500 text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  {t.notif_notNow}
                </button>
              </div>
            </div>
            <button onClick={() => setShowPermBanner(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Order toasts */}
      <div className="fixed top-4 right-4 z-[80] flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white rounded-xl border border-gray-200 shadow-xl p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">
                {t.notif_newOrder} #{toast.orderNumber}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {toast.customerName && <span>{toast.customerName} · </span>}
                {toast.total}
              </p>
              <Link
                href="/app/orders"
                className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-2 transition-colors"
              >
                {t.notif_viewOrders} →
              </Link>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
