'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Minus, Plus, Pencil, Trash2, ShoppingCart, Clock, Check } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import type { Translations } from '@/lib/translations';
import type { Product } from '@/types';

interface CartPanelProps {
  fmtPrice: (n: number) => string;
  t: Translations;
  onEdit: (index: number) => void;
  onCheckout: () => void;
  estimatedMinutes?: number;
  deliveryFee?: number;
  locale?: string;
  suggestedProducts?: Product[];
  onSuggestAdd?: (product: Product) => void;
}

export function CartPanel({ fmtPrice, t, onEdit, onCheckout, estimatedMinutes, deliveryFee, locale = 'es', suggestedProducts, onSuggestAdd }: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const cartTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 py-16">
        <div className="w-24 h-24 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-5">
          <ShoppingCart className="w-9 h-9 text-gray-300" strokeWidth={1.5} />
        </div>
        <p className="font-semibold text-gray-700 text-base mb-1.5">{t.cartEmpty}</p>
        <p className="text-sm text-center text-gray-400 leading-relaxed max-w-[220px]">{t.cartEmptyDesc}</p>
        <div className="mt-6 w-full max-w-[200px] h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900">{t.myOrder}</h2>
        <span className="text-[11px] text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full tabular-nums font-medium">
          {items.reduce((s, i) => s + i.qty, 0)} {t.items}
        </span>
      </div>

      {/* Items — scrollable */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 space-y-2 pb-3">
        {items.map((item, idx) => (
          <div key={`${item.product.id}-${item.variant?.id ?? 'base'}-${idx}`} className="flex gap-3 p-3 rounded-xl bg-gray-50 border-2 border-gray-200">
            {/* Thumbnail */}
            {item.product.image_url ? (
              <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                <Image
                  src={item.product.image_url}
                  alt={item.product.name}
                  fill
                  sizes="56px"
                  className={`object-cover transition-opacity duration-300 ${loadedImages.has(`${item.product.id}-${idx}`) ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setLoadedImages(prev => new Set([...Array.from(prev), `${item.product.id}-${idx}`]))}
                />
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
                  {item.variant && (item.modifierSelections ?? []).length === 0 && (
                    <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] font-medium text-emerald-600">
                      {item.variant.name}
                    </span>
                  )}
                </div>
                {(item.variant || item.extras.length > 0 || (item.modifierSelections ?? []).length > 0) && (
                  <button
                    onClick={() => onEdit(idx)}
                    className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex-shrink-0 min-h-[44px] px-1"
                  >
                    <Pencil className="w-3 h-3" />
                    {t.edit}
                  </button>
                )}
              </div>

              {/* Modifier selections */}
              {(item.modifierSelections ?? []).length > 0 && (
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  {(item.modifierSelections ?? []).flatMap(ms => ms.selectedOptions.map(o => o.name)).join(', ')}
                </p>
              )}

              {/* Legacy extras fallback */}
              {(item.modifierSelections ?? []).length === 0 && item.extras.length > 0 && (
                <p className="text-[10px] text-gray-400 truncate mt-0.5">
                  +{item.extras.map((e) => e.name).join(', ')}
                </p>
              )}
              {item.notes && (
                <p className="text-[10px] text-gray-400 italic truncate">&quot;{item.notes}&quot;</p>
              )}

              {/* Qty + Price */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center bg-white rounded-xl border-2 border-gray-200">
                  <button
                    onClick={() => updateQty(idx, item.qty - 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-l-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                  <button
                    onClick={() => updateQty(idx, item.qty + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-r-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900 tabular-nums">
                    {fmtPrice(item.lineTotal)}
                  </span>
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upsell — "También te puede gustar" */}
      {suggestedProducts && suggestedProducts.length > 0 && (
        <div className="flex-shrink-0 border-t border-gray-100 pt-3 pb-1">
          <p className="px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            {locale === 'en' ? 'You may also like' : 'También te puede gustar'}
          </p>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-2">
            {suggestedProducts.slice(0, 5).map((p) => {
              const added = justAddedId === p.id;
              return (
                <div key={p.id} className="flex-shrink-0 w-[120px] bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                  {p.image_url && (
                    <div className="relative w-full h-[72px] bg-gray-100">
                      <Image src={p.image_url} alt={p.name} fill sizes="120px" className="object-cover" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight">{p.name}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[11px] font-bold text-gray-900 tabular-nums">{fmtPrice(Number(p.price))}</span>
                      <button
                        onClick={() => {
                          if (onSuggestAdd) {
                            onSuggestAdd(p);
                            setJustAddedId(p.id);
                            setTimeout(() => setJustAddedId(null), 1200);
                          }
                        }}
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90',
                          added ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'
                        )}
                      >
                        {added ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t-2 border-gray-200 px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex-shrink-0 space-y-3">
        {estimatedMinutes && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>~{estimatedMinutes} min</span>
          </div>
        )}
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-gray-500">{t.subtotal}</span>
          <span className="text-lg font-bold text-gray-900 tabular-nums">{fmtPrice(cartTotal)}</span>
        </div>
        {deliveryFee != null && deliveryFee > 0 && (
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-gray-400">{locale === 'es' ? 'Envío' : 'Delivery'}</span>
            <span className="text-gray-500 tabular-nums">+{fmtPrice(deliveryFee)}</span>
          </div>
        )}
        {deliveryFee != null && deliveryFee === 0 && (
          <div className="flex justify-between items-baseline text-sm">
            <span className="text-gray-400">{locale === 'es' ? 'Envío' : 'Delivery'}</span>
            <span className="text-emerald-500 font-medium">{locale === 'es' ? 'Gratis' : 'Free'}</span>
          </div>
        )}
        <button
          onClick={onCheckout}
          className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-extrabold text-base hover:bg-emerald-600 active:scale-[0.98] transition-all duration-150 shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
        >
          {t.checkout} →
        </button>

        {showClearConfirm ? (
          <div className="flex gap-2">
            <button
              onClick={() => { clearCart(); setShowClearConfirm(false); }}
              className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 active:bg-red-200 transition-colors"
            >
              {locale === 'es' ? 'Sí, vaciar' : 'Yes, clear'}
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="w-full text-center text-xs text-gray-400 hover:text-red-500 transition-colors py-0.5"
          >
            {t.clearCart}
          </button>
        )}
      </div>
    </div>
  );
}
