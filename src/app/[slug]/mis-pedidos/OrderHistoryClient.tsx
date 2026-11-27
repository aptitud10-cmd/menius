'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, RotateCcw, Check } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { getTranslations } from '@/lib/translations';

interface OrderItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  variant: { price_delta?: number | null } | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  order_type: string;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

/** What the tracker saves on this phone for every order it opened. */
interface LocalOrder {
  id: string;
  number: string;
  status: string;
  total: number;
  date: string;
  items: number;
  t: string | null;
}

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  currency: string;
  locale?: string;
}

/**
 * "My orders" used to ask for an email and then refuse everyone without the
 * tracking token on that same phone ("For your privacy, open My orders from
 * the link…") — i.e. everyone on desktop, and everyone who typed an email.
 * Now it never asks: with the email + token this phone already has (checkout
 * and tracker save them) it loads the full history; otherwise it lists the
 * orders this phone opened; with neither, it says where the order lives.
 */
export function OrderHistoryClient({ restaurantId, restaurantName, restaurantSlug, currency, locale }: Props) {
  const en = locale === 'en';
  const t = getTranslations(locale ?? 'es');
  const fmtPrice = (n: number) => formatPrice(n, currency);
  const dateLocale = en ? 'en-US' : 'es-MX';

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let email = '';
    let token = '';
    let local: LocalOrder[] = [];
    try {
      const saved = JSON.parse(localStorage.getItem('menius-checkout') ?? 'null');
      email = String(saved?.state?.customer?.email ?? '').trim().toLowerCase();
      token = localStorage.getItem(`menius-track-token-${restaurantSlug}`) ?? '';
      const raw = JSON.parse(localStorage.getItem(`menius-history-${restaurantSlug}`) ?? '[]');
      if (Array.isArray(raw)) local = raw.filter((o) => o && o.id && o.number);
    } catch {}
    setLocalOrders(local);

    if (!email || !token) {
      setLoading(false);
      return;
    }
    fetch(
      `/api/orders/history?restaurant_id=${encodeURIComponent(restaurantId)}&email=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.orders) setOrders(data.orders as Order[]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, restaurantSlug]);

  const STATUS: Record<string, string> = {
    pending: t.statusPending,
    confirmed: t.statusConfirmed,
    preparing: t.statusPreparing,
    ready: t.statusReady,
    delivered: t.statusDelivered,
    cancelled: t.statusCancelled,
  };
  const statusDot = (s: string) =>
    s === 'cancelled' ? 'bg-[#c4321b]' : s === 'delivered' ? 'bg-gray-400' : 'bg-brand-500';
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' });
  const shortNum = (n: string) => n.split('-').pop() ?? n;
  const trackHref = (number: string, tok?: string | null) =>
    `/${restaurantSlug}/orden/${number}${tok ? `?t=${encodeURIComponent(tok)}` : ''}`;
  const localTokenFor = (id: string) => localOrders.find((o) => o.id === id)?.t ?? null;

  // Same mechanism as the tracker's "Order again": the menu rebuilds the cart
  // with today's products and flags the dishes that need their options again.
  const handleReorder = (order: Order) => {
    const saved = order.order_items
      .filter((it) => it.product_id)
      .map((it) => ({
        productId: it.product_id,
        productName: it.product_name ?? '',
        variantId: it.variant_id ?? null,
        variantName: it.variant_name ?? null,
        variantPriceDelta: it.variant?.price_delta ?? null,
        qty: Number(it.quantity) || 1,
      }));
    if (saved.length === 0) return;
    setReorderedId(order.id);
    useCartStore.setState({ lastOrder: { restaurantId, items: saved, date: new Date().toISOString() } });
    window.location.href = `/${restaurantSlug}?reorder=1`;
  };

  const header = (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-gray-200 pt-[env(safe-area-inset-top)]">
      <div className="max-w-lg mx-auto h-14 px-2 flex items-center gap-1">
        <Link
          href={`/${restaurantSlug}`}
          aria-label={en ? 'Back to the menu' : 'Volver al menú'}
          className="w-11 h-11 flex items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold text-gray-900 leading-tight">{t.myOrders}</h1>
          <p className="text-[13px] text-gray-600 truncate">{restaurantName}</p>
        </div>
      </div>
    </header>
  );

  const card = 'bg-white rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.05)]';

  let body: React.ReactNode;
  if (loading) {
    body = (
      <div className="space-y-3" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className={`${card} h-[104px] animate-pulse`} />
        ))}
      </div>
    );
  } else if (orders && orders.length > 0) {
    body = (
      <ul className="space-y-3">
        {orders.map((order) => (
          <li key={order.id} className={`${card} overflow-hidden`}>
            <Link
              href={trackHref(order.order_number, localTokenFor(order.id))}
              className="flex items-center gap-3 px-4 pt-3.5 pb-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-gray-900">
                  #{shortNum(order.order_number)}
                  <span className="ml-2 text-[14px] font-normal text-gray-600">{fmtDate(order.created_at)}</span>
                </p>
                <p className="mt-0.5 text-[14px] text-gray-700 truncate">
                  {order.order_items.map((it) => `${it.quantity}× ${it.product_name}`).join(', ')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            </Link>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-gray-100">
              <span className="inline-flex items-center gap-2 text-[14px] text-gray-700">
                <span className={`w-2 h-2 rounded-full ${statusDot(order.status)}`} aria-hidden="true" />
                {STATUS[order.status] ?? order.status}
                <span className="text-gray-600" aria-hidden="true">·</span>
                <span className="font-semibold text-gray-900 tabular-nums">{fmtPrice(order.total)}</span>
              </span>
              <button
                type="button"
                onClick={() => handleReorder(order)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-brand-500 text-[#04241E] text-[14px] font-semibold hover:bg-[#04b096] active:scale-[0.97] transition"
              >
                {reorderedId === order.id ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                )}
                {reorderedId === order.id ? t.orderReordered : t.orderReorder}
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  } else if (localOrders.length > 0) {
    body = (
      <ul className="space-y-3">
        {localOrders.map((o) => (
          <li key={o.id}>
            <Link
              href={trackHref(o.number, o.t)}
              className={`${card} flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-gray-900">
                  #{shortNum(o.number)}
                  <span className="ml-2 text-[14px] font-normal text-gray-600">{fmtDate(o.date)}</span>
                </p>
                <p className="mt-0.5 text-[14px] text-gray-700">
                  {o.items} {en ? (o.items === 1 ? 'item' : 'items') : o.items === 1 ? 'producto' : 'productos'}
                  {' · '}
                  <span className="tabular-nums">{fmtPrice(Number(o.total) || 0)}</span>
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div className="pt-10 text-center">
        <h2 className="font-menu text-[30px] leading-tight text-gray-900">
          {en ? 'No orders on this phone yet' : 'Todavía no hay pedidos en este teléfono'}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-600 max-w-xs mx-auto">
          {en
            ? 'Orders you place here will show up on this page. Ordered on another device? Open the link in your confirmation email.'
            : 'Los pedidos que hagas aquí van a aparecer en esta página. ¿Pediste desde otro dispositivo? Abre el enlace de tu email de confirmación.'}
        </p>
        <Link
          href={`/${restaurantSlug}`}
          className="mt-7 inline-flex h-12 items-center rounded-full bg-brand-500 px-6 text-[15px] font-semibold text-[#04241E] hover:bg-[#04b096] transition-colors"
        >
          {en ? 'Browse the menu' : 'Ver el menú'}
        </Link>
      </div>
    );
  }

  return (
    <div lang={en ? 'en' : 'es'} className="min-h-dvh bg-[#f5f5f3]">
      {header}
      <main className="max-w-lg mx-auto px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{body}</main>
    </div>
  );
}
