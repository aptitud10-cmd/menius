'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { Order } from '@/types';

interface UseRealtimeOrdersOptions {
  restaurantId: string;
  initialOrders: Order[];
  onNewOrder?: (order: Order) => void;
  onOrderUpdate?: (order: Order) => void;
}

const POLL_INTERVAL_MS = 10_000; // fallback poll every 10 seconds

export function useRealtimeOrders({
  restaurantId,
  initialOrders,
  onNewOrder,
  onOrderUpdate,
}: UseRealtimeOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const knownIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  const onNewOrderRef = useRef(onNewOrder);
  const onOrderUpdateRef = useRef(onOrderUpdate);

  onNewOrderRef.current = onNewOrder;
  onOrderUpdateRef.current = onOrderUpdate;

  // ── Full order query (used by both realtime and polling) ──────────────────

  const fetchFullOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables ( name ),
        order_items (
          id, qty, unit_price, line_total, notes,
          product:products ( id, name, image_url, dietary_tags ),
          variant:product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) ),
          order_item_modifiers ( group_name, option_name, price_delta )
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (!data) return null;

    return {
      ...data,
      items: (data as any).order_items ?? [],
    } as unknown as Order;
  }, []);

  // ── Polling fallback — fetches last 24h orders every 10 seconds ───────────
  // This guarantees orders arrive even when WebSocket is unavailable.

  const pollOrders = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables ( name ),
        order_items (
          id, qty, unit_price, line_total, notes,
          product:products ( id, name, image_url, dietary_tags ),
          variant:product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) ),
          order_item_modifiers ( group_name, option_name, price_delta )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(150);

    if (!data) return;

    const fetched: Order[] = data.map((o: any) => ({
      ...o,
      items: o.order_items ?? [],
    }));

    setOrders(prev => {
      // Detect new orders for notification
      const prevIds = new Set(prev.map(o => o.id));
      for (const order of fetched) {
        if (!prevIds.has(order.id) && !knownIdsRef.current.has(order.id)) {
          knownIdsRef.current.add(order.id);
          onNewOrderRef.current?.(order);
        }
      }
      // Detect updated orders
      for (const order of fetched) {
        const existing = prev.find(o => o.id === order.id);
        if (existing && existing.status !== order.status) {
          onOrderUpdateRef.current?.(order);
        }
      }
      return fetched;
    });
  }, [restaurantId]);

  // ── Supabase Realtime subscription ────────────────────────────────────────

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const fullOrder = await fetchFullOrder(payload.new.id);
          if (!fullOrder) return;

          if (!knownIdsRef.current.has(fullOrder.id)) {
            knownIdsRef.current.add(fullOrder.id);
            setOrders((prev) =>
              [fullOrder, ...prev].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
            );
            onNewOrderRef.current?.(fullOrder);
          }
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
        async (payload) => {
          const fullOrder = await fetchFullOrder(payload.new.id);
          if (!fullOrder) return;

          setOrders((prev) =>
            prev.map((o) => (o.id === fullOrder.id ? fullOrder : o))
          );
          onOrderUpdateRef.current?.(fullOrder);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchFullOrder]);

  // ── Polling interval (runs regardless of WebSocket state) ─────────────────

  useEffect(() => {
    const id = setInterval(pollOrders, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pollOrders]);

  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
  }, []);

  return { orders, updateOrderLocally };
}
