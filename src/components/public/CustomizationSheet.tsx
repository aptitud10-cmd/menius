'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, Check, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import type { Product, ProductVariant, ProductExtra } from '@/types';
import type { Translations, Locale } from '@/lib/translations';

interface CustomizationSheetProps {
  product: Product;
  editIndex: number | null;
  onClose: () => void;
  fmtPrice: (n: number) => string;
  t: Translations;
  locale: Locale;
}

export function CustomizationSheet({
  product,
  editIndex,
  onClose,
  fmtPrice,
  t,
  locale,
}: CustomizationSheetProps) {
  const addItem = useCartStore((s) => s.addItem);
  const replaceItem = useCartStore((s) => s.replaceItem);
  const items = useCartStore((s) => s.items);
  const isEditing = editIndex !== null;
  const editItem = isEditing ? items[editIndex] : null;

  const variants = product.variants ?? [];
  const extras = product.extras ?? [];

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    editItem?.variant ?? null
  );
  const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>(
    editItem?.extras ?? []
  );
  const [qty, setQty] = useState(editItem?.qty ?? 1);
  const [notes, setNotes] = useState(editItem?.notes ?? '');
  const [closing, setClosing] = useState(false);
  const [added, setAdded] = useState(false);

  const needsVariant = variants.length > 0 && !selectedVariant;
  const unitPrice =
    Number(product.price) +
    (selectedVariant?.price_delta ?? 0) +
    selectedExtras.reduce((s, e) => s + Number(e.price), 0);

  const [vvH, setVvH] = useState<string>('92vh');

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const vv = window.visualViewport;
    if (vv) {
      const sync = () => {
        const h = Math.min(vv.height, window.innerHeight * 0.92);
        setVvH(`${h}px`);
      };
      sync();
      vv.addEventListener('resize', sync);
      vv.addEventListener('scroll', sync);
      return () => {
        document.body.style.overflow = '';
        vv.removeEventListener('resize', sync);
        vv.removeEventListener('scroll', sync);
      };
    }

    return () => { document.body.style.overflow = ''; };
  }, []);

  const animateClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 250);
  }, [onClose]);

  const toggleExtra = (extra: ProductExtra) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id)
        ? prev.filter((e) => e.id !== extra.id)
        : [...prev, extra]
    );
  };

  const handleSubmit = () => {
    if (isEditing && editIndex !== null) {
      replaceItem(editIndex, product, selectedVariant, selectedExtras, qty, notes);
    } else {
      addItem(product, selectedVariant, selectedExtras, qty, notes);
    }
    setAdded(true);
    setTimeout(animateClose, 400);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-200',
          closing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={animateClose}
      />

      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 lg:top-0 lg:bottom-0 lg:left-auto lg:w-[600px]',
          'bg-white flex flex-col shadow-2xl',
          'rounded-t-2xl lg:rounded-none',
          'transition-transform duration-250 ease-out',
          closing ? 'translate-y-full lg:translate-y-0 lg:translate-x-full' : 'translate-y-0 lg:translate-x-0'
        )}
        style={{ maxHeight: vvH }}
      >
        {/* Drag handle — mobile */}
        <div className="flex justify-center pt-2 pb-1 lg:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header — always visible */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={animateClose}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-base font-bold text-gray-900 truncate">
              {isEditing
                ? (locale === 'es' ? 'Editar producto' : 'Edit item')
                : product.name}
            </h2>
          </div>
          <button
            onClick={animateClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Image */}
          {product.image_url && (
            <div className="relative w-full aspect-video bg-gray-100 overflow-hidden">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="600px"
                className="object-cover"
                priority
              />
            </div>
          )}

          {/* Product info */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                {product.description && (
                  <p className="text-sm text-gray-500 mt-1">{product.description}</p>
                )}
              </div>
              <span className="text-lg font-bold text-gray-900 flex-shrink-0">
                {fmtPrice(Number(product.price))}
              </span>
            </div>
          </div>

          {/* Variants — required single-select */}
          {variants.length > 0 && (
            <div className="px-5 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                  {t.variant}
                </h4>
                <span className="text-[11px] text-red-400 font-medium">
                  {locale === 'es' ? 'Requerido' : 'Required'}
                </span>
              </div>
              <div className="space-y-1.5">
                {variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(isSelected ? null : v)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 text-left',
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors',
                          isSelected ? 'border-white bg-white' : 'border-gray-300'
                        )}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-gray-900" />}
                        </div>
                        <span className="text-sm font-medium">{v.name}</span>
                      </div>
                      {v.price_delta !== 0 && (
                        <span className={cn('text-xs font-semibold', isSelected ? 'text-gray-300' : 'text-gray-500')}>
                          {v.price_delta > 0 ? '+' : ''}{fmtPrice(Number(v.price_delta))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extras — optional multi-select */}
          {extras.length > 0 && (
            <div className="px-5 pt-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                  {t.extras}
                </h4>
                <span className="text-[11px] text-gray-400 font-medium">
                  {locale === 'es' ? 'Opcionales' : 'Optional'}
                </span>
              </div>
              <div className="space-y-1.5">
                {extras.map((ex) => {
                  const isSelected = !!selectedExtras.find((e) => e.id === ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => toggleExtra(ex)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 text-left',
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-4 h-4 rounded-md flex items-center justify-center transition-colors',
                          isSelected ? 'bg-white' : 'border-2 border-gray-300'
                        )}>
                          {isSelected && <Check className="w-3 h-3 text-gray-900" />}
                        </div>
                        <span className="text-sm font-medium">{ex.name}</span>
                      </div>
                      <span className={cn('text-xs font-semibold', isSelected ? 'text-gray-300' : 'text-gray-500')}>
                        +{fmtPrice(Number(ex.price))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="px-5 pt-5 pb-4">
            <label className="text-xs font-bold text-gray-900 uppercase tracking-wide block mb-2">
              {t.specialNotes}
              <span className="text-gray-400 font-normal normal-case ml-1">
                ({locale === 'es' ? 'máx 120 caracteres' : 'max 120 chars'})
              </span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 120))}
              placeholder={t.specialNotesPlaceholder}
              rows={2}
              maxLength={120}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-base text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 resize-none border border-gray-100"
            />
            <p className="text-[10px] text-gray-300 text-right mt-1">{notes.length}/120</p>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="border-t border-gray-100 px-5 py-4 flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            {/* Qty stepper */}
            <div className="flex items-center bg-gray-100 rounded-lg">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 flex items-center justify-center rounded-l-lg hover:bg-gray-200 transition-colors"
              >
                <Minus className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <span className="w-8 text-center font-bold text-sm tabular-nums">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-r-lg hover:bg-gray-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={needsVariant || added}
              className={cn(
                'flex-1 h-11 rounded-xl font-semibold text-sm transition-all duration-150',
                added
                  ? 'bg-emerald-500 text-white'
                  : needsVariant
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
              )}
            >
              {added
                ? (locale === 'es' ? '✓ Listo' : '✓ Done')
                : needsVariant
                  ? (locale === 'es' ? 'Selecciona una opción' : 'Select an option')
                  : isEditing
                    ? (locale === 'es' ? `Actualizar · ${fmtPrice(unitPrice * qty)}` : `Update · ${fmtPrice(unitPrice * qty)}`)
                    : `${t.add} · ${fmtPrice(unitPrice * qty)}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
