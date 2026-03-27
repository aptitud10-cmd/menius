'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, Check, ArrowLeft } from 'lucide-react';
import { motion, useDragControls, type PanInfo } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import type { Product, ModifierGroup, ModifierOption, ModifierSelection } from '@/types';
import type { Translations, Locale } from '@/lib/translations';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { tName, tDesc } from '@/lib/i18n';
import { getBlurUrl } from '@/lib/image-loader';

const DIETARY_TAGS_MAP = Object.fromEntries(DIETARY_TAGS.map((t) => [t.id, t]));

interface CustomizationSheetProps {
  product: Product;
  editIndex: number | null;
  onClose: () => void;
  onAddToCart?: (productName: string) => void;
  fmtPrice: (n: number) => string;
  t: Translations;
  locale: Locale;
  defaultLocale?: string;
  suggestedProducts?: Product[];
  onSuggestAdd?: (product: Product) => void;
  isPreview?: boolean;
}

export function CustomizationSheet({
  product,
  editIndex,
  onClose,
  onAddToCart,
  fmtPrice,
  t,
  locale,
  defaultLocale = 'es',
  suggestedProducts,
  onSuggestAdd,
  isPreview = false,
}: CustomizationSheetProps) {
  const displayName = tName(product, locale, defaultLocale);
  const displayDesc = tDesc(product, locale, defaultLocale);
  const addItem = useCartStore((s) => s.addItem);
  const replaceItem = useCartStore((s) => s.replaceItem);
  const items = useCartStore((s) => s.items);
  const isEditing = editIndex !== null;
  const editItem = isEditing ? items[editIndex] : null;

  const groups = product.modifier_groups ?? [];
  const hasModifierGroups = groups.length > 0;

  // Legacy fallback: if no modifier_groups but has old variants/extras, show them as groups
  const legacyGroups: ModifierGroup[] = [];
  if (!hasModifierGroups) {
    const variants = product.variants ?? [];
    const extras = product.extras ?? [];
    if (variants.length > 0) {
      legacyGroups.push({
        id: '__legacy_variants',
        product_id: product.id,
        name: t.variant,
        selection_type: 'single',
        min_select: 1,
        max_select: 1,
        is_required: true,
        sort_order: 0,
        options: variants.map((v, i) => ({
          id: v.id,
          group_id: '__legacy_variants',
          name: v.name,
          price_delta: v.price_delta,
          is_default: false,
          sort_order: i,
        })),
      });
    }
    if (extras.length > 0) {
      legacyGroups.push({
        id: '__legacy_extras',
        product_id: product.id,
        name: t.extras,
        selection_type: 'multi',
        min_select: 0,
        max_select: 99,
        is_required: false,
        sort_order: 1,
        options: extras.map((e, i) => ({
          id: e.id,
          group_id: '__legacy_extras',
          name: e.name,
          price_delta: Number(e.price),
          is_default: false,
          sort_order: i,
        })),
      });
    }
  }

  const activeGroups = hasModifierGroups ? groups : legacyGroups;

  // Initialize selections from edit item or defaults
  const initSelections = (): Record<string, ModifierOption[]> => {
    const sel: Record<string, ModifierOption[]> = {};
    if (editItem?.modifierSelections && editItem.modifierSelections.length > 0) {
      for (const ms of editItem.modifierSelections) {
        sel[ms.group.id] = [...ms.selectedOptions];
      }
    } else if (editItem && !hasModifierGroups) {
      // Legacy edit: reconstruct from variant/extras
      if (editItem.variant) {
        sel['__legacy_variants'] = [{
          id: editItem.variant.id,
          group_id: '__legacy_variants',
          name: editItem.variant.name,
          price_delta: editItem.variant.price_delta,
          is_default: false,
          sort_order: 0,
        }];
      }
      if (editItem.extras.length > 0) {
        sel['__legacy_extras'] = editItem.extras.map((e, i) => ({
          id: e.id,
          group_id: '__legacy_extras',
          name: e.name,
          price_delta: Number(e.price),
          is_default: false,
          sort_order: i,
        }));
      }
    }
    // Apply defaults for groups not in selections
    for (const g of activeGroups) {
      if (!sel[g.id]) {
        const defaults = g.options.filter(o => o.is_default);
        sel[g.id] = defaults;
      }
    }
    return sel;
  };

  const [selections, setSelections] = useState<Record<string, ModifierOption[]>>(initSelections);
  const [qty, setQty] = useState(editItem?.qty ?? 1);
  const [added, setAdded] = useState(false);
  const dragControls = useDragControls();

  // Sync initialization — avoids the null → value re-render flash
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Validation — use Set to ensure each group name appears at most once
  const validationErrorSet = new Set<string>();
  for (const g of activeGroups) {
    const selected = selections[g.id] ?? [];
    const minRequired = Math.max(g.is_required ? 1 : 0, g.min_select);
    if (minRequired > 0 && selected.length < minRequired) {
      validationErrorSet.add(g.name);
    }
  }
  const validationErrors = Array.from(validationErrorSet);
  const isValid = validationErrors.length === 0;

  // Price calculation
  const modifiersDelta = Object.values(selections).flat().reduce((sum, opt) => sum + Number(opt.price_delta), 0);
  const unitPrice = Number(product.price) + modifiersDelta;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  }, [onClose]);

  const toggleOption = (group: ModifierGroup, option: ModifierOption) => {
    setSelections(prev => {
      const current = prev[group.id] ?? [];
      if (group.selection_type === 'single') {
        const isSelected = current.some(o => o.id === option.id);
        return { ...prev, [group.id]: isSelected && !group.is_required ? [] : [option] };
      }
      // Multi-select
      const isSelected = current.some(o => o.id === option.id);
      if (isSelected) {
        return { ...prev, [group.id]: current.filter(o => o.id !== option.id) };
      }
      if (current.length >= group.max_select) {
        // When max is 1, swap instead of block (radio-like behaviour)
        if (group.max_select === 1) return { ...prev, [group.id]: [option] };
        return prev;
      }
      return { ...prev, [group.id]: [...current, option] };
    });
  };

  const handleSubmit = () => {
    const modifierSelections: ModifierSelection[] = activeGroups
      .filter(g => (selections[g.id] ?? []).length > 0)
      .map(g => ({ group: g, selectedOptions: selections[g.id] }));

    // Legacy compat: extract variant/extras for old cart format
    const legacyVariant = !hasModifierGroups && selections['__legacy_variants']?.[0]
      ? (product.variants ?? []).find(v => v.id === selections['__legacy_variants'][0].id) ?? null
      : null;
    const legacyExtras = !hasModifierGroups && selections['__legacy_extras']
      ? (product.extras ?? []).filter(e => selections['__legacy_extras'].some(s => s.id === e.id))
      : [];

    if (isEditing && editIndex !== null) {
      replaceItem(editIndex, product, legacyVariant, legacyExtras, qty, '', modifierSelections);
    } else {
      addItem(product, legacyVariant, legacyExtras, qty, '', modifierSelections);
      onAddToCart?.(displayName);
    }
    setAdded(true);
    setTimeout(onClose, 400);
  };

  const getRuleLabel = (g: ModifierGroup) => {
    if (g.selection_type === 'single') {
      return g.is_required
        ? (locale === 'es' ? 'Elige 1' : 'Choose 1')
        : (locale === 'es' ? 'Elige 1 (opcional)' : 'Choose 1 (optional)');
    }
    if (g.is_required) {
      if (g.min_select === g.max_select) return locale === 'es' ? `Elige ${g.min_select}` : `Choose ${g.min_select}`;
      return locale === 'es' ? `Elige ${g.min_select}-${g.max_select}` : `Choose ${g.min_select}-${g.max_select}`;
    }
    return locale === 'es' ? `Hasta ${g.max_select} (opcional)` : `Up to ${g.max_select} (optional)`;
  };

  const springTransition = { type: 'tween' as const, duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] as const };

  const sheetBody = (
    <div className="flex-1 overflow-y-auto overscroll-contain">
      {product.image_url && (
        <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
          <div className="absolute inset-0">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="600px"
              unoptimized={product.image_url.includes('.supabase.co/storage/')}
              placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
              blurDataURL={getBlurUrl(product.image_url)}
              className="object-cover opacity-0 transition-opacity duration-150"
              onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')}
              priority
            />
          </div>
        </div>
      )}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-extrabold text-gray-900 leading-tight">{displayName}</h3>
            {displayDesc && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">{displayDesc}</p>
            )}
            {(product.dietary_tags?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {product.dietary_tags!.map((tagId) => {
                  const tag = DIETARY_TAGS_MAP[tagId];
                  if (!tag) return null;
                  return (
                    <span key={tagId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600">
                      <span>{tag.emoji}</span>
                      {locale?.startsWith('en') ? tag.labelEn : tag.labelEs}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <span className="text-xl font-extrabold text-gray-900 flex-shrink-0 tabular-nums">
            {fmtPrice(Number(product.price))}
          </span>
        </div>
      </div>

      {activeGroups.map((group) => {
        const selected = selections[group.id] ?? [];
        // atMax only blocks when max > 1; for max_select=1 we swap instead of block
        const atMax = group.selection_type === 'multi' && group.max_select > 1 && selected.length >= group.max_select;
        return (
          <div key={group.id} className="px-5 pt-5">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-bold text-gray-900">{group.name}</h4>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                group.is_required ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100'
              )}>
                {getRuleLabel(group)}
              </span>
              {atMax && (
                <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                  {t.maxReached}
                </span>
              )}
            </div>
            {group.display_type === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {group.options.map((opt) => {
                  const isSelected = selected.some(o => o.id === opt.id);
                  const isDisabled = !isSelected && atMax;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => !isDisabled && toggleOption(group, opt)}
                      disabled={isDisabled}
                      className={cn(
                        'flex flex-col items-center justify-center px-3 py-3 rounded-2xl transition-all duration-150 text-center border gap-0.5',
                        isSelected
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : isDisabled
                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm active:border-gray-400'
                      )}
                    >
                      <span className="text-[14px] font-semibold leading-tight">{opt.name}</span>
                      {Number(opt.price_delta) !== 0 && (
                        <span className={cn('text-[11px] font-medium', isSelected ? 'text-emerald-100' : 'text-gray-400')}>
                          {Number(opt.price_delta) > 0 ? '+' : ''}{fmtPrice(Number(opt.price_delta))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {group.options.map((opt) => {
                  const isSelected = selected.some(o => o.id === opt.id);
                  const isDisabled = !isSelected && atMax;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => !isDisabled && toggleOption(group, opt)}
                      disabled={isDisabled}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-150 text-left border',
                        isSelected
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                          : isDisabled
                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm active:border-gray-400'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {group.selection_type === 'single' ? (
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0',
                            isSelected ? 'border-white bg-white' : 'border-gray-300'
                          )}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                          </div>
                        ) : (
                          <div className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0',
                            isSelected ? 'bg-white' : 'border-2 border-gray-300'
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                          </div>
                        )}
                        <span className="text-[15px] font-medium">{opt.name}</span>
                      </div>
                      {Number(opt.price_delta) !== 0 && (
                        <span className={cn('text-sm font-semibold', isSelected ? 'text-gray-300' : 'text-gray-500')}>
                          {Number(opt.price_delta) > 0 ? '+' : ''}{fmtPrice(Number(opt.price_delta))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Smart complementary suggestions ── */}
      {!isEditing && (suggestedProducts ?? []).length > 0 && (
        <div className="px-5 pt-5 pb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-sm" aria-hidden>✨</span>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {locale === 'es' ? 'Agregar al pedido' : 'Add to your order'}
            </p>
          </div>
          <div
            className="flex gap-2.5 overflow-x-auto scrollbar-hide"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            {(suggestedProducts ?? []).slice(0, 4).map((p) => (
              <div
                key={p.id}
                onClick={() => onSuggestAdd?.(p)}
                className="flex-shrink-0 w-[130px] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 cursor-pointer active:scale-[0.97] transition-transform"
              >
                {p.image_url && (
                  <div className="relative w-full h-[80px] bg-gray-100">
                    <Image src={p.image_url} alt={tName(p, locale, defaultLocale)} fill sizes="130px" className="object-cover" />
                  </div>
                )}
                <div className="p-2.5">
                  <p className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-tight mb-2">
                    {tName(p, locale, defaultLocale)}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-gray-900 tabular-nums">{fmtPrice(Number(p.price))}</span>
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Plus className="w-3 h-3 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const previewBadge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
      {locale === 'es' ? 'Vista previa' : 'Preview'}
    </span>
  );

  const sheetFooter = isPreview ? null : (
    <div className="border-t border-gray-100 flex-shrink-0 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-xl">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-11 h-11 flex items-center justify-center rounded-l-xl active:bg-gray-200 transition-colors">
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <span className="w-10 text-center font-bold text-base tabular-nums">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-11 h-11 flex items-center justify-center rounded-r-xl active:bg-gray-200 transition-colors">
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid || added}
            className={cn(
              'flex-1 h-[52px] rounded-2xl font-extrabold text-[16px] transition-all duration-200',
              added
                ? 'bg-emerald-500 text-white'
                : !isValid
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 text-white active:scale-[0.98] shadow-sm hover:bg-emerald-600'
            )}
          >
            {added
              ? t.added
              : !isValid
                ? (locale === 'es' ? `Selecciona: ${validationErrors.join(', ')}` : `Choose: ${validationErrors.join(', ')}`)
                : isEditing
                  ? `${t.updateItem} · ${fmtPrice(unitPrice * qty)}`
                  : `${t.add} · ${fmtPrice(unitPrice * qty)}`
            }
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        onClick={onClose}
      />

      {/* Desktop: slide from right — polished side panel */}
      {isDesktop && (
      <motion.div
        className="flex fixed top-0 bottom-0 right-0 w-[520px] bg-white flex-col shadow-[-8px_0_30px_rgba(0,0,0,0.08)] border-l border-gray-100"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={springTransition}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white z-10">
          <div className="flex items-center gap-3 min-w-0">
            {!isPreview && (
              <button onClick={onClose} className="flex items-center gap-1.5 p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            {isPreview && previewBadge}
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 truncate">
                {isEditing ? t.editItem : displayName}
              </h2>
              <p className="text-xs text-gray-400 font-medium tabular-nums">
                {fmtPrice(Number(product.price))}
                {displayDesc && <span className="ml-2 text-gray-300">·</span>}
                {displayDesc && <span className="ml-2 truncate">{displayDesc.slice(0, 40)}{(displayDesc.length > 40) ? '...' : ''}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 group">
            <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </button>
        </div>

        {sheetBody}
        {sheetFooter}
      </motion.div>
      )}

      {/* Mobile: full-screen sheet from bottom with drag-to-dismiss */}
      {!isDesktop && (
      <motion.div
        className="fixed left-0 right-0 bottom-0 bg-white flex flex-col shadow-2xl rounded-t-2xl"
        style={{ height: '100dvh' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={springTransition}
        drag="y"
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        dragListener={false}
        onDragEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing flex-shrink-0"
          onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: 'none' }}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header — large X, no back arrow */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-white z-10">
          <div className="min-w-0 flex-1">
            {isPreview && previewBadge}
            <h2 className="text-base font-bold text-gray-900 truncate">
              {isEditing ? t.editItem : displayName}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-1 ml-3 rounded-xl active:bg-gray-100 transition-colors flex-shrink-0">
            <X className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {sheetBody}
        {sheetFooter}
      </motion.div>
      )}
    </div>
  );
}
