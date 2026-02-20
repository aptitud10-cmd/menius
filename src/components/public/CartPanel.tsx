'use client';

import Image from 'next/image';
import { Minus, Plus, Pencil, Trash2, ShoppingCart } from 'lucide-react';
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
  const cartTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));

  const handleClear = () => {
    if (window.confirm(t.yourCart + ' — ¿Vaciar todo?')) {
      clearCart();
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-300 px-6 py-20">
        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
          <ShoppingCart className="w-7 h-7 opacity-30" />
        </div>
        <p className="font-semibold text-gray-500 text-sm mb-1">{t.cartEmpty}</p>
        <p className="text-xs text-center text-gray-400">{t.cartEmptyDesc}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900">Mi Pedido</h2>
        <span className="text-[11px] text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full tabular-nums font-medium">
          {items.reduce((s, i) => s + i.qty, 0)} {t.items}
        </span>
      </div>

      {/* Items — scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 space-y-2 pb-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            {/* Thumbnail */}
            {item.product.image_url ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                <Image src={item.product.image_url} alt={item.product.name} fill sizes="56px" className="object-cover" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg opacity-30">🍽️</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              {/* Name + Edit */}
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <h4 className="font-semibold text-xs text-gray-900 truncate">{item.product.name}</h4>
                  {item.variant && (
                    <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] font-medium text-emerald-600">
                      {item.variant.name}
                    </span>
                  )}
                </div>
                {(item.variant || item.extras.length > 0) && (
                  <button
                    onClick={() => onEdit(idx)}
                    className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex-shrink-0"
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    Editar
                  </button>
                )}
              </div>

              {item.extras.length > 0 && (
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  +{item.extras.map((e) => e.name).join(', ')}
                </p>
              )}
              {item.notes && (
                <p className="text-[10px] text-gray-400 italic truncate">&quot;{item.notes}&quot;</p>
              )}

              {/* Qty + Price */}
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
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 tabular-nums">
                    {fmtPrice(item.lineTotal)}
                  </span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-500">{t.subtotal}</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">{fmtPrice(cartTotal)}</span>
        </div>
        <button
          onClick={onCheckout}
          className="w-full py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all duration-150"
        >
          Ver pedido
        </button>
        <button
          onClick={handleClear}
          className="w-full text-center text-xs text-gray-400 hover:text-red-500 transition-colors py-0.5"
        >
          Vaciar carrito
        </button>
      </div>
    </div>
  );
}
