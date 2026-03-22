'use client';

import Image from 'next/image';
import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Pencil, Trash2, ShoppingCart, Clock, RotateCcw, X } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import type { Translations } from '@/lib/translations';

interface LastOrderSummaryItem {
  qty: number;
  productName: string;
}

interface CartPanelProps {
  fmtPrice: (n: number) => string;
  t: Translations;
  onEdit: (index: number) => void;
  onCheckout: () => void;
  estimatedMinutes?: number;
  deliveryFee?: number;
  locale?: string;
  lastOrder?: { items: LastOrderSummaryItem[] } | null;
  onReorder?: () => void;
}

// ── Swipeable cart item ──────────────────────────────────────────────────────
function SwipeableItem({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Red delete background revealed on swipe */}
      <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-5 rounded-xl">
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.05}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60 || info.velocity.x < -300) {
            onRemove();
          }
        }}
        style={{ touchAction: 'pan-y' }}
        className="relative z-10 bg-white rounded-xl"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ── Main CartPanel ────────────────────────────────────────────────────────────
export function CartPanel({
  fmtPrice,
  t,
  onEdit,
  onCheckout,
  estimatedMinutes,
  deliveryFee,
  lastOrder,
  onReorder,
}: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const cartTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));

  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  // idx of item awaiting remove confirmation (qty=1 then tap -)
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 2-step clear cart: first tap shows icon red, second tap clears
  const [clearStep, setClearStep] = useState(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMinusTap = useCallback((idx: number, qty: number) => {
    if (qty > 1) {
      updateQty(idx, qty - 1);
      return;
    }
    // qty === 1: need confirmation
    if (confirmRemoveIdx === idx) {
      // second tap → remove
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirmRemoveIdx(null);
      removeItem(idx);
    } else {
      setConfirmRemoveIdx(idx);
      confirmTimer.current = setTimeout(() => setConfirmRemoveIdx(null), 2000);
    }
  }, [confirmRemoveIdx, updateQty, removeItem]);

  const handleClearTap = useCallback(() => {
    if (clearStep === 0) {
      setClearStep(1);
      clearTimer.current = setTimeout(() => setClearStep(0), 2000);
    } else {
      if (clearTimer.current) clearTimeout(clearTimer.current);
      setClearStep(0);
      clearCart();
    }
  }, [clearStep, clearCart]);

  const markImageLoaded = useCallback((key: string) => {
    setLoadedImages((prev) => {
      if (prev.has(key)) return prev;
      return new Set([...Array.from(prev), key]);
    });
  }, []);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 py-12">
        <div className="w-20 h-20 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
          <ShoppingCart className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
        </div>
        <p className="font-semibold text-gray-700 text-sm mb-1">{t.cartEmpty}</p>
        <p className="text-xs text-center text-gray-400 leading-relaxed max-w-[200px]">{t.cartEmptyDesc}</p>

        {/* Reorder — only shown if there's a previous order from this restaurant */}
        {lastOrder && lastOrder.items.length > 0 && onReorder && (
          <button
            onClick={onReorder}
            className="mt-6 w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 active:bg-emerald-100 transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-emerald-800">
                {t.reorderLastOrder}
              </p>
              <p className="text-[10px] text-emerald-600 truncate mt-0.5">
                {lastOrder.items.slice(0, 3).map((i) => `${i.qty}× ${i.productName}`).join(' · ')}
              </p>
            </div>
          </button>
        )}
      </div>
    );
  }

  // ── Filled cart ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* ── Header: compact with clear-cart icon ── */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900">{t.myOrder}</h2>
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full tabular-nums font-medium">
            {items.reduce((s, i) => s + i.qty, 0)} {t.items}
          </span>
        </div>
        <button
          onClick={handleClearTap}
          title={t.clearCart}
          className={cn(
            'p-2 rounded-lg transition-all duration-150',
            clearStep === 1
              ? 'bg-red-50 text-red-500'
              : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable items only ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-3 min-h-0">
        <AnimatePresence initial={false}>
        {items.map((item, idx) => {
          const imgKey = `${item.product.id}-${idx}`;
          const isPendingRemove = confirmRemoveIdx === idx;
          return (
              <motion.div
                key={item.uid ?? `${item.product.id}-${item.variant?.id ?? 'base'}-${idx}`}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-2"
              >
                <SwipeableItem onRemove={() => removeItem(idx)}>
                  <div className="flex gap-3 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl">
                    {/* Thumbnail */}
                    {item.product.image_url ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          fill
                          sizes="56px"
                          className={cn('object-cover transition-opacity duration-300', loadedImages.has(imgKey) ? 'opacity-100' : 'opacity-0')}
                          onLoad={() => markImageLoaded(imgKey)}
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-base opacity-30">🍽️</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Name + Edit */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-xs text-gray-900 truncate leading-tight">{item.product.name}</h4>
                          {item.variant && (item.modifierSelections ?? []).length === 0 && (
                            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] font-medium text-emerald-600">
                              {item.variant.name}
                            </span>
                          )}
                        </div>
                        {(item.variant || item.extras.length > 0 || (item.modifierSelections ?? []).length > 0) && (
                          <button
                            onClick={() => onEdit(idx)}
                            className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 font-medium flex-shrink-0 min-h-[40px] px-1"
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
                      {(item.modifierSelections ?? []).length === 0 && item.extras.length > 0 && (
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          +{item.extras.map((e) => e.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[10px] text-gray-400 italic truncate">&quot;{item.notes}&quot;</p>
                      )}

                      {/* Qty stepper + Price */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                          <button
                            onClick={() => handleMinusTap(idx, item.qty)}
                            className={cn(
                              'w-9 h-9 flex items-center justify-center transition-all duration-150',
                              isPendingRemove
                                ? 'bg-red-50 text-red-500'
                                : 'hover:bg-gray-50 active:bg-gray-100 text-gray-600'
                            )}
                          >
                            {isPendingRemove ? (
                              <X className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <span className="w-6 text-center text-xs font-bold tabular-nums">{item.qty}</span>
                          <button
                            onClick={() => updateQty(idx, item.qty + 1)}
                            className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-gray-900 tabular-nums">
                            {fmtPrice(item.lineTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Confirm remove hint */}
                      {isPendingRemove && (
                        <p className="text-[9px] text-red-400 mt-1">
                          {t.tapToRemove}
                        </p>
                      )}
                    </div>
                  </div>
                </SwipeableItem>
              </motion.div>
          );
        })}
        </AnimatePresence>
      </div>

      {/* ── Footer: subtotal + checkout only ── */}
      <div className="border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex-shrink-0">
        {!!estimatedMinutes && estimatedMinutes > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2">
            <Clock className="w-3.5 h-3.5" />
            <span>~{estimatedMinutes} min</span>
          </div>
        )}
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs text-gray-500">{t.subtotal}</span>
          <span className="text-base font-bold text-gray-900 tabular-nums">{fmtPrice(cartTotal)}</span>
        </div>
        {deliveryFee != null && deliveryFee > 0 && (
          <div className="flex justify-between items-baseline text-xs mb-2">
            <span className="text-gray-400">{t.delivery}</span>
            <span className="text-gray-500 tabular-nums">+{fmtPrice(deliveryFee)}</span>
          </div>
        )}
        {deliveryFee != null && deliveryFee === 0 && (
          <div className="flex justify-between items-baseline text-xs mb-2">
            <span className="text-gray-400">{t.delivery}</span>
            <span className="text-emerald-500 font-medium">{t.freeDelivery}</span>
          </div>
        )}
        <button
          onClick={onCheckout}
          className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-extrabold text-sm hover:bg-emerald-600 active:scale-[0.98] transition-all duration-150 shadow-[0_4px_16px_rgba(16,185,129,0.3)] flex items-center justify-between px-5"
        >
          <span>{t.placeOrder}</span>
          <span className="tabular-nums">{fmtPrice(cartTotal + (deliveryFee && deliveryFee > 0 ? deliveryFee : 0))}</span>
        </button>
      </div>
    </div>
  );
}
