'use client';

import Image from 'next/image';
import { useState, useCallback, useRef, useEffect } from 'react';
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
  onClose?: () => void;
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
  onClose,
  estimatedMinutes,
  deliveryFee,
  locale = 'es',
  lastOrder,
  onReorder,
}: CartPanelProps) {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const cartTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));

  // Use a ref (not state) so image-load events don't trigger re-renders of the whole panel.
  const loadedImagesRef = useRef<Set<string>>(new Set());
  // idx of item awaiting remove confirmation (qty=1 then tap -)
  const [confirmRemoveIdx, setConfirmRemoveIdx] = useState<number | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 2-step clear cart: first tap shows icon red, second tap clears
  const [clearStep, setClearStep] = useState(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending timers on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      if (clearTimer.current) clearTimeout(clearTimer.current);
    };
  }, []);

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

  // Mark image as loaded directly on the <img> element — zero re-renders.
  const markImageLoaded = useCallback((key: string, el: HTMLImageElement | null) => {
    if (!el || loadedImagesRef.current.has(key)) return;
    loadedImagesRef.current.add(key);
    el.classList.remove('opacity-0');
    el.classList.add('opacity-100');
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
            className="mt-6 w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#e6faf7] border border-[#b3efe6] active:bg-[#d0f7f1] transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-[#05c8a7] flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-semibold text-[#047a65]">
                {t.reorderLastOrder}
              </p>
              <p className="text-[10px] text-[#05c8a7] truncate mt-0.5">
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

      {/* ── Header: drag pill + item count + clear + close ── */}
      <div className="px-4 pt-2 pb-2 flex items-center gap-2 flex-shrink-0">
        {/* Drag handle pill centered */}
        <div className="flex-1 flex justify-start">
          <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full tabular-nums font-semibold">
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
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-all duration-150"
            aria-label={locale === 'en' ? 'Close cart' : 'Cerrar carrito'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
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
                initial={{ opacity: 0, x: 36, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 340,
                  damping: 28,
                  opacity: { duration: 0.2 },
                  height: { duration: 0.22 },
                  marginBottom: { duration: 0.22 },
                }}
                className="overflow-hidden mb-2"
              >
                <SwipeableItem onRemove={() => removeItem(idx)}>
                  <div
                    className="flex gap-3 p-3 bg-white border border-gray-100 rounded-xl cursor-pointer active:bg-gray-50 transition-colors"
                    onClick={() => onEdit(idx)}
                  >
                    {/* Thumbnail */}
                    {item.product.image_url ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          fill
                          sizes="56px"
                          className="object-cover transition-opacity duration-150 opacity-0"
                          onLoad={(e) => markImageLoaded(imgKey, e.currentTarget)}
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
                          <h4 className="font-semibold text-sm text-gray-900 truncate leading-tight">{item.product.name}</h4>
                          {item.variant && (item.modifierSelections ?? []).length === 0 && (
                            <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded bg-[#e6faf7] text-xs font-medium text-[#05c8a7]">
                              {item.variant.name}
                            </span>
                          )}
                        </div>
                        <div className="flex-shrink-0 p-1.5 text-gray-300" aria-hidden>
                          <Pencil className="w-3 h-3" />
                        </div>
                      </div>

                      {/* Modifier selections */}
                      {(item.modifierSelections ?? []).length > 0 && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {(item.modifierSelections ?? []).flatMap(ms => ms.selectedOptions.map(o => o.name)).join(', ')}
                        </p>
                      )}
                      {(item.modifierSelections ?? []).length === 0 && item.extras.length > 0 && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          +{item.extras.map((e) => e.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-gray-400 italic truncate">&quot;{item.notes}&quot;</p>
                      )}

                      {/* Qty stepper + Price */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMinusTap(idx, item.qty); }}
                            className={cn(
                              'w-11 h-11 flex items-center justify-center transition-all duration-150',
                              isPendingRemove
                                ? 'bg-red-50 text-red-500'
                                : 'hover:bg-gray-50 active:bg-gray-100 text-gray-600'
                            )}
                          >
                            {isPendingRemove ? (
                              <X className="w-4 h-4" />
                            ) : (
                              <Minus className="w-4 h-4" />
                            )}
                          </button>
                          <span className="w-7 text-center text-sm font-bold tabular-nums">{item.qty}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); updateQty(idx, item.qty + 1); }}
                            className="w-11 h-11 flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors text-gray-600"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900 tabular-nums">
                            {fmtPrice(item.lineTotal)}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            aria-label={`${locale === 'en' ? 'Remove' : 'Eliminar'} ${item.product.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Confirm remove hint */}
                      {isPendingRemove && (
                        <p className="text-xs text-red-400 mt-1">
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
          <span className="text-sm font-medium text-gray-500">{t.subtotal}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={cartTotal}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="text-lg font-extrabold text-gray-900 tabular-nums"
            >
              {fmtPrice(cartTotal)}
            </motion.span>
          </AnimatePresence>
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
            <span className="text-[#05c8a7] font-medium">{t.freeDelivery}</span>
          </div>
        )}
        <motion.button
          onClick={onCheckout}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl bg-[#05c8a7] text-white font-extrabold text-sm hover:bg-[#04b096] transition-colors duration-150 shadow-[0_4px_16px_rgba(5,200,167,0.35)] flex items-center justify-between px-5"
        >
          <span>{t.placeOrder}</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={cartTotal}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="tabular-nums"
            >
              {fmtPrice(cartTotal + (deliveryFee && deliveryFee > 0 ? deliveryFee : 0))}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
