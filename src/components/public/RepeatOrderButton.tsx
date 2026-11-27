'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { RotateCcw, Loader2, AlertCircle, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { getTranslations } from '@/lib/translations';
import { formatPrice } from '@/lib/utils';
import { shortOrderNumber } from '@/lib/orders/short-number';

/** Per-restaurant dismissal, so saying "no" once actually sticks. */
const dismissKey = (restaurantId: string) => `menius_repeat_dismissed_${restaurantId}`;

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
  requires_customization: boolean;
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
  /** The menu's own "reorder" banner is showing, or was just dismissed: don't
   *  offer the same thing a second time as a floating pill. */
  suppressed?: boolean;
  /** Store currency: prices were a hard-coded "$", wrong for MXN/COP. */
  currency?: string;
}

export default function RepeatOrderButton({ restaurantId, locale, suppressed = false, currency }: Props) {
  const [data, setData] = useState<RepeatOrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [checked, setChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  // A customer who already started an order doesn't need a reorder prompt
  // floating over the menu.
  const cartCount = useCartStore((s) => s.items.length);

  const t = getTranslations(locale);

  const savedPhone = typeof window !== 'undefined'
    ? localStorage.getItem('menius_customer_phone')
    : null;

  const checkRepeatOrder = useCallback(async () => {
    if (!savedPhone || checked) return;
    // Respect a previous dismissal before spending a request on it.
    if (typeof window !== 'undefined' && localStorage.getItem(dismissKey(restaurantId))) {
      setChecked(true);
      setDismissed(true);
      return;
    }
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

    // Only auto-add items that don't need customization. Items with modifiers/
    // variants/extras can't be faithfully restored (the original selections aren't
    // stored reusably), so adding them raw would break checkout — the customer adds
    // those from the menu instead.
    for (const item of data.items) {
      if (item.requires_customization) continue;
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

  /** Hides the prompt for good on this device, for this restaurant. */
  const dismissForever = () => {
    try {
      localStorage.setItem(dismissKey(restaurantId), '1');
    } catch {
      // Private mode / storage full — at least hide it for this session.
    }
    setShowSheet(false);
    setDismissed(true);
  };

  if (suppressed || dismissed || cartCount > 0 || !data || data.items.length === 0) return null;

  return (
    <>
      {/* The pill sits above the cart bar and respects the iOS home indicator.
          It used to float mid-screen over the product cards with no way to get
          rid of it — hence the explicit dismiss control. */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-40 flex items-center rounded-full bg-brand-500 text-[#04241E] shadow-lg shadow-black/15"
        style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
      >
        <button
          type="button"
          onClick={() => setShowSheet(true)}
          className="flex items-center gap-2 pl-5 pr-3 py-3 rounded-l-full hover:bg-[#04b096] transition-colors active:scale-95"
          data-testid="repeat-order-btn"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          {/* whitespace-nowrap: without it "Repeat last order" wraps to two lines
              inside the pill and the shape goes lumpy. */}
          <span className="text-sm font-semibold whitespace-nowrap">
            {t.repeatLastOrder}
          </span>
        </button>
        <span className="w-px self-stretch my-2 bg-[#04241E]/20" aria-hidden />
        <button
          type="button"
          onClick={dismissForever}
          aria-label={t.repeatDismiss}
          title={t.repeatDismiss}
          className="flex items-center justify-center w-11 h-11 rounded-r-full hover:bg-[#04b096] transition-colors active:scale-95"
          data-testid="repeat-order-dismiss-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSheet(false)}
          />

          <div className="relative bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />

            {/* Always present. Before, when every item needed customization the
                sheet rendered no button at all, so the only way out was tapping
                the dim backdrop — which doesn't look tappable. */}
            <button
              type="button"
              onClick={() => setShowSheet(false)}
              aria-label={t.close}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
              data-testid="repeat-order-close-btn"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1 pr-12" data-testid="repeat-order-title">
              {t.repeatYourLastOrder}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {/* The short number staff and tickets use ("#042"), not ORD-261117-042. */}
              {t.repeatOrderNumber(shortOrderNumber(data.order_number))}
            </p>

            {data.some_unavailable && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-amber-50 text-amber-800 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {t.repeatSomeUnavailable}
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
                      <p className="text-xs text-gray-600">{item.variant_name}</p>
                    )}
                    {item.price_changed && (
                      <p className="text-xs text-amber-800">
                        {t.repeatPriceUpdated}
                      </p>
                    )}
                    {item.requires_customization && (
                      <p className="text-xs text-[#047a65] font-medium">
                        {t.repeatNeedsCustomization}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatPrice(item.current_price, currency ?? "USD")}</p>
                    <p className="text-xs text-gray-600">x{item.qty}</p>
                  </div>
                </div>
              ))}
            </div>

            {(() => {
              const addableCount = data.items.filter((i) => !i.requires_customization).length;

              // Nothing can be auto-added (every item has variants/modifiers we
              // can't faithfully restore). The sheet still needs a way forward:
              // send them to the menu, which is exactly what the item labels ask
              // for. Returning null here was the dead end.
              if (addableCount === 0) {
                return (
                  <button
                    type="button"
                    onClick={() => setShowSheet(false)}
                    className="w-full py-3.5 rounded-xl bg-brand-500 text-[#04241E] font-bold text-base hover:bg-[#04b096] transition-colors"
                    data-testid="repeat-order-browse-btn"
                  >
                    {t.repeatBrowseMenu}
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  onClick={handleRepeatAll}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-brand-500 text-[#04241E] font-bold text-base hover:bg-[#04b096] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="repeat-order-confirm-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      {t.repeatAddItemsToCart(addableCount)}
                    </>
                  )}
                </button>
              );
            })()}

            <button
              type="button"
              onClick={dismissForever}
              className="w-full mt-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              data-testid="repeat-order-never-btn"
            >
              {t.repeatDontShowAgain}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
