'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';

interface RepeatOrderItem {
  product_id: string;
  variant_id: string | null;
  qty: number;
  product_name: string;
  variant_name: string;
  current_price: number;
  original_price: number;
  image_url: string | null;
  notes: string;
  price_changed: boolean;
}

interface RepeatOrderData {
  found: boolean;
  order_number?: string;
  order_date?: string;
  items: RepeatOrderItem[];
  some_unavailable?: boolean;
}

interface Props {
  restaurantId: string;
  locale: 'es' | 'en';
}

export default function RepeatOrderButton({ restaurantId, locale }: Props) {
  const [data, setData] = useState<RepeatOrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [checked, setChecked] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const en = locale === 'en';

  const savedPhone = typeof window !== 'undefined'
    ? localStorage.getItem('menius_customer_phone')
    : null;

  const checkRepeatOrder = useCallback(async () => {
    if (!savedPhone || checked) return;
    setChecked(true);

    try {
      const res = await fetch(
        `/api/public/repeat-order?restaurant_id=${restaurantId}&phone=${encodeURIComponent(savedPhone)}`
      );
      if (res.ok) {
        const result = await res.json() as RepeatOrderData;
        if (result.found && result.items.length > 0) {
          setData(result);
        }
      }
    } catch {
      // Silent fail — not critical
    }
  }, [restaurantId, savedPhone, checked]);

  useEffect(() => {
    checkRepeatOrder();
  }, [checkRepeatOrder]);

  const handleRepeatAll = () => {
    if (!data) return;
    setLoading(true);

    for (const item of data.items) {
      const product = {
        id: item.product_id,
        name: item.product_name,
        price: item.current_price,
        image_url: item.image_url,
        description: null,
        category_id: '',
        restaurant_id: restaurantId,
        is_active: true,
        in_stock: true,
        is_featured: false,
        is_new: false,
        sort_order: 0,
        dietary_tags: [],
        prep_time_minutes: null,
        translations: null,
        created_at: '',
        has_modifiers: false,
        modifier_groups: [],
        variants: [],
        extras: [],
      } as unknown as Parameters<typeof addItem>[0];

      const variant = item.variant_id
        ? ({ id: item.variant_id, name: item.variant_name ?? '', price_delta: 0, sort_order: 0 } as Parameters<typeof addItem>[1])
        : null;

      addItem(product, variant, [], item.qty, item.notes ?? '');
    }

    setTimeout(() => {
      setLoading(false);
      setShowSheet(false);
      setData(null);
    }, 500);
  };

  if (!data || data.items.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setShowSheet(true)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 transition-all active:scale-95"
        data-testid="repeat-order-btn"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {en ? 'Repeat last order' : 'Pedir lo mismo'}
        </span>
      </button>

      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSheet(false)}
          />

          <div className="relative bg-white dark:bg-zinc-900 w-full max-w-lg rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />

            <h3 className="text-lg font-bold mb-1" data-testid="repeat-order-title">
              {en ? 'Your last order' : 'Tu último pedido'}
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              {en ? `Order #${data.order_number}` : `Pedido #${data.order_number}`}
            </p>

            {data.some_unavailable && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {en
                  ? 'Some items are no longer available'
                  : 'Algunos productos ya no están disponibles'}
              </div>
            )}

            <div className="space-y-3 mb-6">
              {data.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3" data-testid={`repeat-item-${i}`}>
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.product_name}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-zinc-500">{item.variant_name}</p>
                    )}
                    {item.price_changed && (
                      <p className="text-xs text-amber-600">
                        {en ? 'Price updated' : 'Precio actualizado'}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${item.current_price.toFixed(2)}</p>
                    <p className="text-xs text-zinc-500">x{item.qty}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleRepeatAll}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-600 text-white font-bold text-base hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              data-testid="repeat-order-confirm-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  {en
                    ? `Add ${data.items.length} items to cart`
                    : `Agregar ${data.items.length} productos al carrito`}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
