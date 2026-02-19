'use client';

import Image from 'next/image';
import { ShoppingBag, Minus, Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import type { Translations } from '@/lib/translations';

interface CartPanelProps {
  fmtPrice: (n: number) => string;
  t: Translations;
  onEdit: (index: number) => void;
  onCheckout: () => void;
  estimatedMinutes?: number;
}

export function CartPanel({ fmtPrice, t, onEdit, onCheckout, estimatedMinutes }: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore((s) => s.totalPrice);

  const handleClear = () => {
    if (window.confirm(t.yourCart + ' — ¿Vaciar todo?')) {
      clearCart();
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-300 px-6 py-20">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <ShoppingBag className="w-7 h-7 opacity-40" />
        </div>
        <p className="font-semibold text-gray-500 text-sm mb-1">{t.cartEmpty}</p>
        <p className="text-xs text-center text-gray-400">{t.cartEmptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-3 flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900">{t.yourCart}</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums">
          {items.reduce((s, i) => s + i.qty, 0)} {t.items}
        </span>
      </div>

      {/* Items — scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 space-y-2.5 pb-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            {item.product.image_url ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                <Image src={item.product.image_url} alt={item.product.name} fill sizes="48px" className="object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-base opacity-30">🍽️</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <h4 className="font-semibold text-xs text-gray-900 truncate">{item.product.name}</h4>
                <span className="text-xs font-bold text-gray-900 flex-shrink-0 tabular-nums">
                  {fmtPrice(item.lineTotal)}
                </span>
              </div>
              {item.variant && (
                <p className="text-[10px] text-gray-400 mt-0.5">{item.variant.name}</p>
              )}
              {item.extras.length > 0 && (
                <p className="text-[10px] text-gray-400 truncate">
                  +{item.extras.map((e) => e.name).join(', ')}
                </p>
              )}
              {item.notes && (
                <p className="text-[10px] text-gray-400 italic truncate">&quot;{item.notes}&quot;</p>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center bg-white rounded-lg border border-gray-200">
                  <button
                    onClick={() => updateQty(idx, item.qty - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-l-lg hover:bg-gray-50 transition-colors"
                  >
                    <Minus className="w-3 h-3 text-gray-500" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold tabular-nums">{item.qty}</span>
                  <button
                    onClick={() => updateQty(idx, item.qty + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-r-lg hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  {(item.variant || item.extras.length > 0) && (
                    <button
                      onClick={() => onEdit(idx)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-white transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer — sticky */}
      <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0 space-y-3">
        {estimatedMinutes && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>~{estimatedMinutes} min</span>
          </div>
        )}
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-500">{t.total}</span>
          <span className="text-xl font-bold text-gray-900 tabular-nums">{fmtPrice(totalPrice())}</span>
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-3 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 active:scale-[0.98] transition-all duration-150"
        >
          {t.checkout}
        </button>
        <button
          onClick={handleClear}
          className={cn(
            'w-full text-center text-xs text-gray-400 hover:text-red-500 transition-colors py-1'
          )}
        >
          Vaciar carrito
        </button>
      </div>
    </div>
  );
}
