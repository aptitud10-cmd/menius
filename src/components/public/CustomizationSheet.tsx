'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, Check, ArrowLeft } from 'lucide-react';
import { motion, useMotionValue, useTransform, useDragControls, type PanInfo } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import type { Product, ModifierGroup, ModifierOption, ModifierSelection } from '@/types';
import type { Translations, Locale } from '@/lib/translations';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { tName, tDesc } from '@/lib/i18n';
import { supabaseLoader, getBlurUrl } from '@/lib/image-loader';

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
        name: 'Extras',
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
  const [notes, setNotes] = useState(editItem?.notes ?? '');
  const [added, setAdded] = useState(false);
  const [justAddedSuggestId, setJustAddedSuggestId] = useState<string | null>(null);
  const dragControls = useDragControls();

  const scrollY = useMotionValue(0);
  const imageY = useTransform(scrollY, [0, 300], [0, 120]);
  const imageScale = useTransform(scrollY, [0, 300], [1, 1.15]);
  const imageOpacity = useTransform(scrollY, [0, 250], [1, 0.3]);

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

  const [vvH, setVvH] = useState<string>('96vh');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const vv = window.visualViewport;
    if (vv) {
      const sync = () => {
        // Leave ~52px at top so the header with restaurant name/logo is barely visible
        const h = Math.min(vv.height - 52, vv.height * 0.97);
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
      replaceItem(editIndex, product, legacyVariant, legacyExtras, qty, notes, modifierSelections);
    } else {
      addItem(product, legacyVariant, legacyExtras, qty, notes, modifierSelections);
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

  const springTransition = { type: 'spring' as const, damping: 30, stiffness: 350 };

  const sheetBody = (
    <div
      className="flex-1 overflow-y-auto overscroll-contain"
      onScroll={(e) => scrollY.set(e.currentTarget.scrollTop)}
    >
      {product.image_url && (
        <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
          <motion.div
            className="absolute inset-0"
            style={{ y: imageY, scale: imageScale, opacity: imageOpacity }}
          >
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="600px"
              loader={product.image_url.includes('.supabase.co/storage/') ? supabaseLoader : undefined}
              placeholder={getBlurUrl(product.image_url) ? 'blur' : undefined}
              blurDataURL={getBlurUrl(product.image_url)}
              className="object-cover opacity-0 transition-opacity duration-500"
              onLoad={(e) => e.currentTarget.classList.replace('opacity-0', 'opacity-100')}
              priority
            />
          </motion.div>
        </div>
      )}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{displayName}</h3>
            {displayDesc && (
              <p className="text-sm text-gray-500 mt-1">{displayDesc}</p>
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
          <span className="text-lg font-bold text-gray-900 flex-shrink-0">
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
                        'flex flex-col items-center justify-center px-3 py-3 rounded-2xl transition-all duration-150 text-center border-2 gap-0.5',
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
                        'w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-150 text-left border-2',
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
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            isSelected ? 'border-white bg-white' : 'border-gray-300'
                          )}>
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                          </div>
                        ) : (
                          <div className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center transition-colors',
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


      <div className="px-5 pt-5 pb-4">
        <label className="text-xs font-bold text-gray-900 uppercase tracking-wide block mb-2">
          {t.specialNotes}
          <span className="text-gray-400 font-normal normal-case ml-1">
            ({locale === 'es' ? 'max 120 caracteres' : 'max 120 chars'})
          </span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 120))}
          placeholder={t.specialNotesPlaceholder}
          rows={2}
          maxLength={120}
          className="w-full px-4 py-2.5 rounded-xl bg-gray-50 text-base text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none border border-gray-100"
          onFocus={(e) => {
            setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 320);
          }}
        />
        <p className="text-[10px] text-gray-300 text-right mt-1">{notes.length}/120</p>
      </div>

      {/* ── Smart complementary suggestions (always visible, below notes) ── */}
      {!isEditing && (suggestedProducts ?? []).length > 0 && (
        <div className="px-5 pt-1 pb-6">
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
            {(suggestedProducts ?? []).slice(0, 4).map((p) => {
              const isAddedSuggest = justAddedSuggestId === p.id;
              return (
                <div
                  key={p.id}
                  className="flex-shrink-0 w-[130px] bg-gray-50 rounded-2xl overflow-hidden border border-gray-100"
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
                      <button
                        type="button"
                        onClick={() => {
                          if (onSuggestAdd) {
                            onSuggestAdd(p);
                            setJustAddedSuggestId(p.id);
                            setTimeout(() => setJustAddedSuggestId(null), 1500);
                          }
                        }}
                        className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 flex-shrink-0',
                          isAddedSuggest ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'
                        )}
                        aria-label={isAddedSuggest ? (locale === 'es' ? 'Agregado' : 'Added') : (locale === 'es' ? 'Agregar' : 'Add')}
                      >
                        {isAddedSuggest ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
              'flex-1 h-12 rounded-2xl font-bold text-[15px] transition-all duration-200',
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
                ? `${locale === 'es' ? 'Selecciona' : 'Select'}: ${validationErrors.join(', ')}`
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
        transition={{ duration: 0.15 }}
        onClick={onClose}
      />

      {/* Desktop: slide from right — polished side panel */}
      <motion.div
        className="hidden lg:flex fixed top-0 bottom-0 right-0 w-[520px] bg-white flex-col shadow-[-8px_0_30px_rgba(0,0,0,0.08)] border-l border-gray-100"
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

      {/* Mobile: slide from bottom with drag-to-dismiss */}
      <motion.div
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white flex flex-col shadow-2xl rounded-t-2xl"
        style={{ maxHeight: vvH }}
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
          className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => dragControls.start(e)}
          style={{ touchAction: 'none' }}
        >
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0 bg-white z-10">
          <div className="flex items-center gap-2 min-w-0">
            {!isPreview && (
              <button onClick={onClose} className="flex items-center gap-1.5 p-2 -ml-2 rounded-lg active:bg-gray-100 transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-medium text-gray-500">Menu</span>
              </button>
            )}
            {isPreview && previewBadge}
            <h2 className="text-base font-bold text-gray-900 truncate">
              {isEditing ? t.editItem : displayName}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg active:bg-gray-100 transition-colors flex-shrink-0">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {sheetBody}
        {sheetFooter}
      </motion.div>
    </div>
  );
}
