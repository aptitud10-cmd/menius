'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/browser';
import type { Order } from '@/types';
import { isAwaitingOnlinePayment, OPEN_ORDER_STATUSES, olderOpenOrdersFilter } from '@/lib/order-state';
import type { RealtimePostgresChangesPayload, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

interface UseRealtimeOrdersOptions {
  restaurantId: string;
  initialOrders: Order[];
  onNewOrder?: (order: Order) => void;
  onOrderUpdate?: (order: Order) => void;
}

export type RealtimeConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';

const POLL_INTERVAL_MS = 10_000; // fallback poll every 10 seconds

const ORDER_SELECT = `
  *,
  table:tables ( name ),
  order_items (
    id, qty, unit_price, line_total, notes,
    product:products ( id, name, image_url, dietary_tags, prep_time_minutes ),
    variant:product_variants ( name ),
    order_item_extras ( price, product_extras ( name ) ),
    order_item_modifiers ( group_name, option_name, price_delta )
  )
`;

export function useRealtimeOrders({
  restaurantId,
  initialOrders,
  onNewOrder,
  onOrderUpdate,
}: UseRealtimeOrdersOptions) {
  // Pedidos online sin cobrar no existen para el restaurante hasta que se
  // pagan (isAwaitingOnlinePayment). No entran a la lista ni a knownIds: cuando
  // el webhook los marca 'paid', el UPDATE/poll los trae como pedido NUEVO.
  const [orders, setOrders] = useState<Order[]>(() =>
    initialOrders.filter((o) => !isAwaitingOnlinePayment(o))
  );
  const ordersRef = useRef<Order[]>(orders);
  ordersRef.current = orders;
  const [rtStatus, setRtStatus] = useState<RealtimeConnectionStatus>('reconnecting');
  // Última vez que el sondeo de 10 s trajo datos. Si el canal en vivo se cae
  // pero el sondeo sigue respondiendo, los pedidos siguen llegando: no hay que
  // alarmar al operador con "sin conexión".
  const [lastSyncAt, setLastSyncAt] = useState<number>(() => Date.now());
  // Última vez que esta pantalla cambió cada pedido (updateOrderLocally).
  const touchedRef = useRef<Map<string, number>>(new Map());
  const knownIdsRef = useRef<Set<string>>(
    new Set(initialOrders.filter((o) => !isAwaitingOnlinePayment(o)).map((o) => o.id))
  );
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
    const startedAt = Date.now();
    const supabase = getSupabaseBrowser();
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const [{ data }, { data: scheduled }] = await Promise.all([
      supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('restaurant_id', restaurantId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(150),
      // Pedidos ABIERTOS creados hace más de 6 h (programados de ayer para hoy,
      // aceptados o no): sin esta consulta desaparecían del tablero al recargar.
      supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('restaurant_id', restaurantId)
        .in('status', OPEN_ORDER_STATUSES)
        .lt('created_at', since)
        .or(olderOpenOrdersFilter(since))
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (!data) return;
    setLastSyncAt(Date.now());

    const fetched: Order[] = [...data, ...(scheduled ?? [])]
      .map((o) => {
        const row = o as typeof o & { order_items?: unknown[] };
        return { ...o, items: row.order_items ?? [] } as unknown as Order;
      })
      .filter((o) => !isAwaitingOnlinePayment(o));

    setOrders(prev => {
      const fetchedMap = new Map(fetched.map(o => [o.id, o]));

      // Respuesta que salió ANTES de un cambio hecho en esta pantalla: para ese
      // pedido trae el estado viejo. Antes lo pisaba y la tarjeta "saltaba
      // hacia atrás" hasta el siguiente poll (30 s con realtime conectado).
      const staleForLocal = (id: string) => (touchedRef.current.get(id) ?? 0) > startedAt;

      for (const order of fetched) {
        if (staleForLocal(order.id)) continue;
        // New order detection — deduplicated via knownIdsRef
        if (!knownIdsRef.current.has(order.id)) {
          knownIdsRef.current.add(order.id);
          lastStatusRef.current.set(order.id, order.status);
          // Los de la segunda consulta (creados antes de la ventana de 6 h) se
          // incorporan EN SILENCIO: no son pedidos que acaban de llegar. Sin
          // esto el KDS (que carga solo 6 h) sonaba y reimprimía los de ayer.
          if (new Date(order.created_at).getTime() >= new Date(since).getTime()) {
            onNewOrderRef.current?.(order);
          }
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
      const merged = prev.map(o => (staleForLocal(o.id) ? o : fetchedMap.get(o.id) ?? o));
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
          if (!fullOrder || isAwaitingOnlinePayment(fullOrder)) return;

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
          // Ping de GPS del repartidor (cada ~2 s): solo cambian coordenadas.
          // Se aplican en el lugar sin volver a descargar el pedido con sus
          // ítems — antes cada ping costaba una consulta pesada por tablet.
          const row = payload.new as Record<string, unknown> & { id: string };
          const known = ordersRef.current.find((o) => o.id === row.id) as unknown as Record<string, unknown> | undefined;
          if (known && isGpsOnlyChange(known, row)) {
            setOrders((prev) => prev.map((o) => (o.id === row.id
              ? ({ ...o, driver_lat: row.driver_lat, driver_lng: row.driver_lng, driver_updated_at: row.driver_updated_at } as unknown as Order)
              : o)));
            return;
          }
          const fullOrder = await fetchFullOrder(row.id);
          if (!fullOrder || isAwaitingOnlinePayment(fullOrder)) return;

          // Una orden fuera de la lista (programada creada hace días, o que
          // quedó fuera de la ventana) se agrega en vez de descartarse. Si
          // está pendiente se trata como nueva: también cubre el UPDATE que
          // llega antes que su propio INSERT (si no, nunca sonaría).
          if (!knownIdsRef.current.has(fullOrder.id)) {
            knownIdsRef.current.add(fullOrder.id);
            lastStatusRef.current.set(fullOrder.id, fullOrder.status);
            setOrders((prev) =>
              prev.some((o) => o.id === fullOrder.id)
                ? prev.map((o) => (o.id === fullOrder.id ? fullOrder : o))
                : [fullOrder, ...prev].sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )
            );
            if (fullOrder.status === 'pending') onNewOrderRef.current?.(fullOrder);
            return;
          }
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

  // Con el canal en vivo conectado los cambios ya llegan por realtime: el sondeo
  // (dos consultas pesadas con joins) es solo respaldo → cada 30 s. Sin canal,
  // cada 10 s como antes.
  const pollMs = rtStatus === 'connected' ? 30_000 : POLL_INTERVAL_MS;
  useEffect(() => {
    const id = setInterval(pollOrders, pollMs);
    return () => clearInterval(id);
  }, [pollOrders, pollMs]);

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
    touchedRef.current.set(orderId, Date.now());
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
  }, []);

  return { orders, updateOrderLocally, rtStatus, lastSyncAt, refetch: pollOrders };
}

/** Campos que cambian con cada ping de GPS (trigger de order_location_latest). */
const GPS_FIELDS = new Set(['driver_lat', 'driver_lng', 'driver_updated_at']);

/**
 * true si el UPDATE solo trae coordenadas nuevas del repartidor: todos los
 * demás campos escalares que llegan en el evento coinciden con los que ya
 * tenemos. Cualquier otro cambio (estado, tiempos, repartidor, pago) → refetch.
 */
export function isGpsOnlyChange(known: Record<string, unknown>, row: Record<string, unknown>): boolean {
  let gpsChanged = false;
  for (const [k, v] of Object.entries(row)) {
    if (v !== null && typeof v === 'object') continue; // jsonb, etc.: no comparables
    if (GPS_FIELDS.has(k)) { if (known[k] !== v) gpsChanged = true; continue; }
    if (k === 'updated_at') continue;
    if (!(k in known)) continue;
    const kv = known[k];
    if (kv === v) continue;
    // timestamps/números pueden venir con otro formato: comparar normalizado
    if (typeof kv === 'string' && typeof v === 'string' && !Number.isNaN(Date.parse(v)) && Date.parse(kv) === Date.parse(v)) continue;
    if ((typeof kv === 'number' || typeof v === 'number') && kv != null && v != null && Number(kv) === Number(v)) continue;
    return false;
  }
  return gpsChanged;
}
