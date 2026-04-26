'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { Order } from '@/types';
import type { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

interface UseRealtimeOrdersOptions {
  restaurantId: string;
  initialOrders: Order[];
  onNewOrder?: (order: Order) => void;
  onOrderUpdate?: (order: Order) => void;
}

export type RealtimeConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

const POLL_INTERVAL_MS = 10_000; // fallback poll every 10 seconds

export function useRealtimeOrders({
  restaurantId,
  initialOrders,
  onNewOrder,
  onOrderUpdate,
}: UseRealtimeOrdersOptions) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [rtStatus, setRtStatus] = useState<RealtimeConnectionStatus>('reconnecting');
  const knownIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)));
  // Tracks the last-seen status per order to deduplicate UPDATE notifications
  // fired by both realtime and polling for the same transition.
  const lastStatusRef = useRef<Map<string, string>>(
    new Map(initialOrders.map((o) => [o.id, o.status]))
  );
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
          product:products ( id, name, image_url, dietary_tags, prep_time_minutes ),
          variant:product_variants ( name ),
          order_item_extras ( price, product_extras ( name ) ),
          order_item_modifiers ( group_name, option_name, price_delta )
        )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (!data) return null;

    const row = data as typeof data & { order_items?: unknown[] };
    return {
      ...data,
      items: row.order_items ?? [],
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
          product:products ( id, name, image_url, dietary_tags, prep_time_minutes ),
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

    const fetched: Order[] = data.map((o) => {
      const row = o as typeof o & { order_items?: unknown[] };
      return { ...o, items: row.order_items ?? [] } as unknown as Order;
    });

    setOrders(prev => {
      const fetchedMap = new Map(fetched.map(o => [o.id, o]));

      for (const order of fetched) {
        // New order detection — deduplicated via knownIdsRef
        if (!knownIdsRef.current.has(order.id)) {
          knownIdsRef.current.add(order.id);
          lastStatusRef.current.set(order.id, order.status);
          onNewOrderRef.current?.(order);
        }
        // Update detection — only notify if status actually changed since last notification
        // This prevents realtime + poll from firing the same callback twice.
        const lastSeen = lastStatusRef.current.get(order.id);
        if (lastSeen !== undefined && lastSeen !== order.status) {
          lastStatusRef.current.set(order.id, order.status);
          onOrderUpdateRef.current?.(order);
        }
      }

      // Merge: update orders within the poll window, keep orders outside it unchanged
      // This prevents older orders (loaded at initial page load) from disappearing.
      const merged = prev.map(o => fetchedMap.get(o.id) ?? o);
      const existingIds = new Set(prev.map(o => o.id));
      for (const o of fetched) {
        if (!existingIds.has(o.id)) merged.push(o);
      }
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return merged;
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
        async (payload: RealtimePostgresChangesPayload<{ id: string }>) => {
          const fullOrder = await fetchFullOrder((payload.new as { id: string }).id);
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
        async (payload: RealtimePostgresChangesPayload<{ id: string }>) => {
          const fullOrder = await fetchFullOrder((payload.new as { id: string }).id);
          if (!fullOrder) return;

          setOrders((prev) =>
            prev.map((o) => (o.id === fullOrder.id ? fullOrder : o))
          );
          // Only notify if this status transition hasn't been seen yet (dedup with polling)
          const lastSeen = lastStatusRef.current.get(fullOrder.id);
          if (lastSeen !== fullOrder.status) {
            lastStatusRef.current.set(fullOrder.id, fullOrder.status);
            onOrderUpdateRef.current?.(fullOrder);
          }
        }
      )
      .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
        // Track WebSocket channel health so the UI can show a real connection indicator.
        // The 10-second polling fallback keeps data fresh even when disconnected.
        if (status === 'SUBSCRIBED') {
          setRtStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRtStatus('disconnected');
        } else {
          setRtStatus('reconnecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, fetchFullOrder]);

  // ── Polling interval (runs regardless of WebSocket state) ─────────────────

  useEffect(() => {
    const id = setInterval(pollOrders, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pollOrders]);

  // ── Immediate re-poll when tab becomes visible again ──────────────────────
  // Covers: tablet waking from sleep, user switching back from another tab,
  // or the app returning to the foreground on iPad Safari.

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') pollOrders();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [pollOrders]);

  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
  }, []);

  return { orders, updateOrderLocally, rtStatus, refetch: pollOrders };
}
