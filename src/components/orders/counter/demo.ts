'use client';

// Modo demo del Counter (para vender): pedidos FALSOS que viven solo en la
// memoria de esta pestaña. Nunca se escriben en Supabase, no imprimen, no
// mandan push/email ni pasan por Stripe y no aparecen en reportes: CounterView
// corta toda acción de servidor para los ids que empiezan con DEMO_PREFIX.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Order } from '@/types';

export const DEMO_PREFIX = 'demo-';
export const isDemoId = (id: string | null | undefined): boolean => !!id && id.startsWith(DEMO_PREFIX);

/** En demo el urgente salta a los 10 s (en vivo, a los urgent_after_seconds). */
export const DEMO_URGENT_AFTER_SECONDS = 10;
const FIRST_ORDER_MS = 2000;
const SECOND_ORDER_AFTER_ACCEPT_MS = 4000;
const THIRD_ORDER_AFTER_SECOND_MS = 5000;
// Eventos con sonido (2026-11-19), para que se oigan en el demo como en vivo:
// la cocina marca listo el pickup, después el cliente toca "I'm here", y el
// cliente del delivery cancela.
const KITCHEN_READY_AFTER_ACCEPT_MS = 6000;
const CUSTOMER_CANCELS_AFTER_ACCEPT_MS = 9000;
const DONE_STATUSES = ['delivered', 'completed', 'served', 'cancelled'];
/** Nadie deja una prueba abierta en pleno servicio: a los 10 min se cierra sola. */
export const DEMO_MAX_MS = 10 * 60_000;

/**
 * 'test': UN pedido de prueba (pickup), como el "test order" de DoorDash o
 * Grubhub — para entrenar al personal y probar sonido e impresora.
 * 'sales': la tanda de 3 para mostrarle el Counter a un dueño.
 */
export type DemoMode = 'test' | 'sales';

/** Lo que el ticket de un pedido de prueba dice en grande (va en las notas: sale en cualquier impresora). */
export const testOrderNote = (en: boolean) => (en ? '*** TEST ORDER - DO NOT MAKE ***' : '*** PEDIDO DE PRUEBA - NO PREPARAR ***');

type Line = [text: string, price?: number, indent?: boolean];

function item(id: string, qty: number, name: string, unit: number, lines: Line[] = [], notes = '') {
  return {
    id, order_id: '', product_id: id, variant_id: null, qty,
    unit_price: unit, line_total: unit * qty, notes,
    product: { id, name },
    variant: null,
    order_item_extras: [],
    order_item_modifiers: [],
    modifier_lines: lines.map(([text, price, indent]) => ({ text, price: price ?? 0, indent: !!indent })),
  };
}

type DemoInput = Omit<Partial<Order>, 'items'> & { items: unknown[] };

function demoOrder(n: number, o: DemoInput, en: boolean): Order {
  return {
    restaurant_id: 'demo', table_id: null, status: 'pending', notes: '', payment_method: 'cash',
    payment_status: 'pending', include_utensils: true, created_at: new Date().toISOString(),
    customer_name: en ? 'Guest' : 'Cliente',
    ...o,
    id: `${DEMO_PREFIX}${n}`,
    order_number: `DEMO-00${n}`,
  } as unknown as Order;
}

/** Las 3 órdenes del guion: mesa ($38.50), recoger ($31.25), delivery ($42.25) = $112. */
export function demoScript(en: boolean): Order[] {
  return [
    demoOrder(1, {
      order_type: 'dine_in', table_name: en ? 'Table 4' : 'Mesa 4', customer_name: 'Ana Ruiz', total: 38.5,
      items: [
        item('dp1', 2, 'Classic Burger', 13.5, [['Medium'], ['French Fries'], ['No onions']]),
        item('dp2', 1, 'Vanilla Milkshake', 11.5),
      ],
    }, en),
    demoOrder(2, {
      order_type: 'pickup', customer_name: 'James Lee', total: 31.25,
      items: [
        item('dp3', 1, 'Chicken Parm Hero', 14.25, [['Extra cheese', 1.5]]),
        item('dp4', 2, 'Mozzarella Sticks', 8.5, [], en ? 'ALLERGY: no nuts' : 'ALERGIA: sin nueces'),
      ],
    }, en),
    demoOrder(3, {
      order_type: 'delivery', customer_name: 'María González', total: 42.25,
      delivery_address: '32-15 94th St, East Elmhurst, NY',
      items: [
        item('dp5', 1, 'Porterhouse Steak', 32.95, [['Medium rare'], ['Mashed Potatoes']]),
        item('dp6', 1, 'Caesar Salad', 9.3),
      ],
    }, en),
  ];
}

/** El pedido de prueba: el pickup del guion, a nombre de "Prueba" y con la nota NO PREPARAR. */
export function testOrder(en: boolean): Order {
  const base = demoScript(en)[1];
  return { ...base, customer_name: en ? 'Test' : 'Prueba', notes: testOrderNote(en) } as Order;
}

export interface DemoState {
  active: boolean;
  mode: DemoMode;
  orders: Order[];
  /** Llegaron todos y ninguno sigue pendiente (ni con el cliente esperando). */
  finished: boolean;
  start: (mode?: DemoMode) => void;
  exit: () => void;
  update: (id: string, patch: Partial<Order>) => void;
}

/**
 * Guion del demo: a los 2 s entra la mesa; al aceptarla (o rechazarla), a los
 * 4 s entra la de recoger y 5 s después la de delivery. `onArrive` hace sonar
 * la alerta y abre la tarjeta como un pedido real.
 */
export function useCounterDemo(en: boolean, onArrive: (o: Order) => void): DemoState {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<DemoMode>('test');
  const [orders, setOrders] = useState<Order[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onArriveRef = useRef(onArrive);
  onArriveRef.current = onArrive;
  const queuedSecond = useRef(false);
  /** Guion de eventos ya programado por pedido (que no se programe dos veces). */
  const scripted = useRef<Set<string>>(new Set());
  /** Pasos del guion que todavía no ocurrieron: el resumen espera a que terminen. */
  const [scriptPending, setScriptPending] = useState(0);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const arrive = useCallback((o: Order) => {
    const fresh = { ...o, created_at: new Date().toISOString() } as Order;
    setOrders((prev) => (prev.some((x) => x.id === fresh.id) ? prev : [fresh, ...prev]));
    onArriveRef.current(fresh);
  }, []);

  const start = useCallback((m: DemoMode = 'test') => {
    clearTimers();
    queuedSecond.current = m === 'test'; // la prueba es un solo pedido: no entran más
    scripted.current = new Set();
    setScriptPending(0);
    setOrders([]);
    setMode(m);
    setActive(true);
    const first = m === 'test' ? testOrder(en) : demoScript(en)[0];
    timers.current.push(setTimeout(() => arrive(first), FIRST_ORDER_MS));
  }, [en, arrive]);

  const exit = useCallback(() => {
    clearTimers();
    queuedSecond.current = false;
    scripted.current = new Set();
    setScriptPending(0);
    setOrders([]);
    setActive(false);
  }, []);

  const update = useCallback((id: string, patch: Partial<Order>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? ({ ...o, ...patch } as Order) : o)));
  }, []);

  // Al resolver la primera, entran las otras dos.
  useEffect(() => {
    if (!active || queuedSecond.current) return;
    const first = orders.find((o) => o.id === `${DEMO_PREFIX}1`);
    if (!first || first.status === 'pending') return;
    queuedSecond.current = true;
    const [, second, third] = demoScript(en);
    timers.current.push(setTimeout(() => arrive(second), SECOND_ORDER_AFTER_ACCEPT_MS));
    timers.current.push(setTimeout(() => arrive(third), SECOND_ORDER_AFTER_ACCEPT_MS + THIRD_ORDER_AFTER_SECOND_MS));
  }, [active, orders, en, arrive]);

  // Un paso del guion: espera, y aplica el cambio solo si el pedido sigue en
  // un estado donde tiene sentido (si el usuario ya lo entregó o lo rechazó, no).
  const step = useCallback((ms: number, id: string, ok: (o: Order) => boolean, patch: () => Partial<Order>) => {
    setScriptPending((n) => n + 1);
    timers.current.push(setTimeout(() => {
      setOrders((prev) => prev.map((o) => (o.id === id && ok(o) ? ({ ...o, ...patch() } as Order) : o)));
      setScriptPending((n) => Math.max(0, n - 1));
    }, ms));
  }, []);

  // Pickup aceptado → la cocina lo marca listo (suena "listo").
  // Delivery aceptado → el cliente cancela.
  useEffect(() => {
    if (!active) return;
    for (const o of orders) {
      if (o.status === 'pending' || DONE_STATUSES.includes(o.status) || scripted.current.has(o.id)) continue;
      if (o.order_type === 'pickup') {
        scripted.current.add(o.id);
        step(KITCHEN_READY_AFTER_ACCEPT_MS, o.id, (x) => !DONE_STATUSES.includes(x.status), () => ({ status: 'ready' }));
      } else if (o.order_type === 'delivery') {
        scripted.current.add(o.id);
        step(CUSTOMER_CANCELS_AFTER_ACCEPT_MS, o.id, (x) => !DONE_STATUSES.includes(x.status) && x.status !== 'out_for_delivery',
          () => ({ status: 'cancelled' }));
      }
    }
  }, [active, orders, step]);

  useEffect(() => () => clearTimers(), []);

  // El resumen sale cuando ya ocurrió todo el guion y no quedó un pickup listo
  // sin entregar: hay que tocar "Recogido", como en vivo.
  const finished = active && orders.length === (mode === 'test' ? 1 : 3) && scriptPending === 0
    && orders.every((o) => o.status !== 'pending')
    && !orders.some((o) => o.order_type === 'pickup' && o.status === 'ready');
  return { active, mode, orders, finished, start, exit, update };
}
