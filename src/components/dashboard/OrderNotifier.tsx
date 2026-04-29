'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, X, ShoppingBag } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useNotifications } from '@/hooks/use-notifications';
import { formatPrice } from '@/lib/utils';
import { useDashboardLocale } from '@/hooks/use-dashboard-locale';

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

export function OrderNotifier({ restaurantId, currency }: OrderNotifierProps) {
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

  const handleNewOrder = useCallback((order: { id: string; order_number: string; customer_name: string; total: number }) => {
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
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, customer_name, total, created_at')
          .eq('restaurant_id', restaurantId)
          .gt('created_at', since)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!data) return;
        for (const o of data) handleNewOrder(o as { id: string; order_number: string; customer_name: string; total: number });
        if (data.length > 0) lastPollRef.current = data[0].created_at as string;
      } catch { /* silent — best effort */ }
    };

    pollNowRef.current = () => { if (!rtConnectedRef.current) poll(); };

    // Periodic poll only fires when RT is down — saves DB hits in normal state.
    const periodic = async () => {
      if (rtConnectedRef.current) return;
      await poll();
    };
    const id = setInterval(periodic, 15_000);
    return () => {
      clearInterval(id);
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
        (payload: RealtimePostgresChangesPayload<{ id: string; order_number: string; customer_name: string; total: number }>) => {
          handleNewOrder(payload.new as { id: string; order_number: string; customer_name: string; total: number });
        }
      )
      .subscribe((status: string) => {
        rtConnectedRef.current = status === 'SUBSCRIBED';
        // On disconnect/error/timeout: poll immediately so the owner doesn't
        // miss orders during the gap. The 15s periodic poll keeps covering
        // until Supabase auto-reconnects.
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
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
