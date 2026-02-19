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

  const fetchFullOrder = useCallback(async (orderId: string): Promise<Order | null> => {
    const supabase = getSupabaseBrowser();
    const { data } = await supabase
      .from('orders')
      .select(`
        id, restaurant_id, table_id, order_number, status, customer_name, customer_phone, notes, total, created_at,
        order_items ( id, qty, unit_price, line_total, notes, products ( name ) )
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (!data) return null;

    return {
      ...data,
      items: (data as any).order_items ?? [],
    } as unknown as Order;
  }, []);

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

  const updateOrderLocally = useCallback((orderId: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } : o))
    );
  }, []);

  return { orders, updateOrderLocally };
}
