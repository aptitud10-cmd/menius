"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { X, Minus, Plus, Check, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useDragControls, type PanInfo } from "framer-motion";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";
import type {
  Product,
  ModifierGroup,
  ModifierOption,
  ModifierSelection,
  ProductVariant,
  ProductExtra,
} from "@/types";
import type { Translations, Locale } from "@/lib/translations";
import { DIETARY_TAGS } from "@/lib/dietary-tags";
import { tName, tDesc } from "@/lib/i18n";
import {
  visibleGroups,
  pruneHiddenSelections,
} from "@/lib/conditional-modifiers";
import { supabaseLoader, getBlurUrl } from "@/lib/image-loader";
import { hasHours, isOptionAvailableAt, optionHoursLabel } from "@/lib/option-hours";
import { inTimeZone } from "@/lib/orders/business-hours";
import { showsAsRow } from "@/lib/product-display";

const DIETARY_TAGS_MAP = Object.fromEntries(DIETARY_TAGS.map((t) => [t.id, t]));

interface CustomizationSheetProps {
  product: Product;
  editIndex: number | null;
  onClose: () => void;
  onViewCart?: () => void;
  onAddToCart?: (productName: string) => void;
  fmtPrice: (n: number) => string;
  t: Translations;
  locale: Locale;
  defaultLocale?: string;
  suggestedProducts?: Product[];
  onSuggestAdd?: (product: Product) => void;
  isPreview?: boolean;
  /** IANA zone of the restaurant: option hours (Grits 5:30–11 AM) are local. */
  timeZone?: string | null;
}

export function CustomizationSheet({
  product,
  editIndex,
  onClose,
  onViewCart,
  onAddToCart,
  fmtPrice,
  t,
  locale,
  defaultLocale = "es",
  suggestedProducts,
  onSuggestAdd,
  isPreview = false,
  timeZone,
}: CustomizationSheetProps) {
  const displayName = tName(product, locale, defaultLocale);
  const displayDesc = tDesc(product, locale, defaultLocale);
  const addItem = useCartStore((s) => s.addItem);
  const replaceItem = useCartStore((s) => s.replaceItem);
  const items = useCartStore((s) => s.items);
  const isEditing = editIndex !== null;
  const editItem = isEditing ? items[editIndex] : null;

  // ── Lazy-load modifier data ──────────────────────────────────────────────────
  // When products are slimmed for the initial page payload, modifier_groups/variants/extras
  // arrive as empty arrays but has_modifiers=true. We fetch full data on sheet open.
  const [lazyModifiers, setLazyModifiers] = useState<{
    modifier_groups: ModifierGroup[];
    variants: ProductVariant[];
    extras: ProductExtra[];
  } | null>(null);
  const [modifiersLoading, setModifiersLoading] = useState(false);
  const [modifiersError, setModifiersError] = useState(false);

  const needsLazyLoad =
    product.has_modifiers === true &&
    !product.modifier_groups?.length &&
    !product.variants?.length &&
    !product.extras?.length;

  const loadModifiers = useCallback(() => {
    setModifiersLoading(true);
    setModifiersError(false);
    fetch(`/api/product-modifiers?productId=${product.id}`)
      // Un 500/429 devolvía {error} y el for…of de abajo tiraba TypeError: el
      // menú dejaba de abrir productos. Ahora es el estado de error con reintento.
      .then((r) => {
        if (!r.ok) throw new Error(`product-modifiers ${r.status}`);
        return r.json();
      })
      .then(
        (data: {
          modifier_groups?: ModifierGroup[];
          variants?: ProductVariant[];
          extras?: ProductExtra[];
        }) => {
          setLazyModifiers({
            modifier_groups: Array.isArray(data?.modifier_groups) ? data.modifier_groups : [],
            variants: Array.isArray(data?.variants) ? data.variants : [],
            extras: Array.isArray(data?.extras) ? data.extras : [],
          });
          setModifiersLoading(false);
        },
      )
      .catch(() => {
        setModifiersLoading(false);
        setModifiersError(true);
      });
  }, [product.id]);

  useEffect(() => {
    if (!needsLazyLoad) return;
    loadModifiers();
  }, [needsLazyLoad, loadModifiers]);

  // Re-apply defaults once lazy data is available (non-edit case only)
  useEffect(() => {
    if (!lazyModifiers || isEditing) return;
    const sel: Record<string, ModifierOption[]> = {};
    for (const g of lazyModifiers.modifier_groups) {
      sel[g.id] = g.options.filter((o) => o.is_default);
    }
    setSelections(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lazyModifiers]);
  // ─────────────────────────────────────────────────────────────────────────────

  const groups =
    lazyModifiers?.modifier_groups ?? product.modifier_groups ?? [];
  /** Producto con opciones cuya carga perezosa todavía no terminó (o falló). */
  const optionsPending = needsLazyLoad && !lazyModifiers;
  const hasModifierGroups = groups.length > 0;

  // Legacy variants/extras are merged with modifier_groups instead of being discarded.
  // They used to be an all-or-nothing fallback, so a product with even one modifier_group
  // hid its paid extras entirely (Add Avocado, Grilled Salmon...) — the customer could
  // not buy them at all.
  //
  // But a legacy option whose name already exists in a modifier group is a DUPLICATE of
  // the same question, usually at a different price (Buccaneer: variant Deluxe +$5.00 vs
  // group Style Deluxe +$4.00). Showing both asks twice and contradicts itself, so the
  // modifier group — the system that actually charges — always wins.
  const legacyGroups: ModifierGroup[] = [];
  {
    const variants = lazyModifiers?.variants ?? product.variants ?? [];
    const extras = lazyModifiers?.extras ?? product.extras ?? [];

    const takenNames = groups.flatMap((g) =>
      (g.options ?? []).map((o) => o.name.trim().toLowerCase()),
    );
    // Prefix match, not equality: the same option is often spelled out in the
    // modifier group and abbreviated in the legacy row — variant "Deluxe" vs
    // group option "Deluxe (w/ Fries & Coleslaw)". Exact matching missed 20 of
    // Buccaneer's burgers and let the duplicate through at a different price.
    const isFree = (name: string) => {
      const n = name.trim().toLowerCase();
      if (!n) return false;
      return !takenNames.some(
        (taken) => taken === n || taken.startsWith(n) || n.startsWith(taken),
      );
    };

    const freeVariants = variants.filter((v) => isFree(v.name));
    const freeExtras = extras.filter((e) => isFree(e.name));

    if (freeVariants.length > 0) {
      legacyGroups.push({
        id: "__legacy_variants",
        product_id: product.id,
        name: t.variant,
        selection_type: "single",
        // Only required when it's the product's sole customization: as a merged
        // extra group, forcing a choice would block a product that already has
        // its required questions answered by real modifier groups.
        min_select: hasModifierGroups ? 0 : 1,
        max_select: 1,
        is_required: !hasModifierGroups,
        sort_order: hasModifierGroups ? 98 : 0,
        options: freeVariants.map((v, i) => ({
          id: v.id,
          group_id: "__legacy_variants",
          name: v.name,
          price_delta: v.price_delta,
          is_default: false,
          sort_order: i,
        })),
      });
    }
    if (freeExtras.length > 0) {
      legacyGroups.push({
        id: "__legacy_extras",
        product_id: product.id,
        name: t.extras,
        selection_type: "multi",
        min_select: 0,
        max_select: 99,
        is_required: false,
        sort_order: 99,
        options: freeExtras.map((e, i) => ({
          id: e.id,
          group_id: "__legacy_extras",
          name: e.name,
          price_delta: Number(e.price),
          is_default: false,
          sort_order: i,
        })),
      });
    }
  }

  const allGroups = [...groups, ...legacyGroups];

  // Initialize selections from edit item or defaults
  const initSelections = (): Record<string, ModifierOption[]> => {
    const sel: Record<string, ModifierOption[]> = {};
    if (
      editItem?.modifierSelections &&
      editItem.modifierSelections.length > 0
    ) {
      for (const ms of editItem.modifierSelections) {
        sel[ms.group.id] = [...ms.selectedOptions];
      }
    }
    // Not an else: an item can carry BOTH modifier selections and a legacy
    // variant/extra now that the two systems render together.
    if (editItem) {
      // Legacy edit: reconstruct from variant/extras
      if (editItem.variant) {
        sel["__legacy_variants"] = [
          {
            id: editItem.variant.id,
            group_id: "__legacy_variants",
            name: editItem.variant.name,
            price_delta: editItem.variant.price_delta,
            is_default: false,
            sort_order: 0,
          },
        ];
      }
      if (editItem.extras.length > 0) {
        sel["__legacy_extras"] = editItem.extras.map((e, i) => ({
          id: e.id,
          group_id: "__legacy_extras",
          name: e.name,
          price_delta: Number(e.price),
          is_default: false,
          sort_order: i,
        }));
      }
    }
    // Apply defaults for groups not in selections
    for (const g of allGroups) {
      if (!sel[g.id]) {
        const defaults = g.options.filter((o) => o.is_default);
        sel[g.id] = defaults;
      }
    }
    return sel;
  };

  const [selections, setSelections] =
    useState<Record<string, ModifierOption[]>>(initSelections);

  // Option hours (Grits 5:30–11 AM) are read in the restaurant's zone, not the
  // diner's phone. The clock ticks once a minute so a sheet left open across
  // 11:00 greys the option out without a reload.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const anyOptionHasHours = allGroups.some((g) => g.options.some(hasHours));
  useEffect(() => {
    if (!anyOptionHasHours) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [anyOptionHasHours]);
  const localNow = useMemo(
    () => inTimeZone(new Date(nowMs), timeZone || "UTC"),
    [nowMs, timeZone],
  );
  const isAvailableNow = (o: ModifierOption) =>
    !hasHours(o) || isOptionAvailableAt(o, localNow);
  // "Grits: 5:30–11 AM only", under the group the diner just tapped.
  const [hoursNotice, setHoursNotice] = useState<{ groupId: string; text: string } | null>(null);
  useEffect(() => {
    if (!hoursNotice) return;
    const id = window.setTimeout(() => setHoursNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [hoursNotice]);

  // Groups whose dependency is currently satisfied. Everything downstream —
  // rendering, validation and pricing — works off this, never off allGroups, so
  // a hidden group can neither block the Add button nor charge for its options.
  const activeGroups = useMemo(
    () => visibleGroups(allGroups, selections),
    [allGroups, selections],
  );

  // A hidden group's stale selection would still reach the cart: picking
  // Deluxe → Onion Rings (+$1.50) and switching back to Regular kept the
  // surcharge. Pricing and submit read from here.
  const effectiveSelections = useMemo(
    () => pruneHiddenSelections(allGroups, selections),
    [allGroups, selections],
  );

  const [qty, setQty] = useState(editItem?.qty ?? 1);
  const [added, setAdded] = useState(false);
  const dragControls = useDragControls();

  // Scrollable body + one wrapper per modifier group, so a tap on an
  // incomplete Add button can bring the first unanswered group into view.
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef(new Map<string, HTMLDivElement>());
  const highlightRefs = useRef(new Map<string, HTMLDivElement>());
  const [highlightGroupId, setHighlightGroupId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  /**
   * Free-text note for this line ("no pickles", "gravy on the side").
   *
   * Everything downstream already existed and was being fed an empty string:
   * `order_items.notes` in the database, the sanitiser in the orders API, and
   * an amber `★ note` row on the KDS, the counter, the orders board and the
   * printed ticket. Only the input was missing, so a diner had no way to say
   * anything the modifier groups don't cover.
   *
   * Capped at 200 rather than the API's 500: a kitchen ticket is 42 characters
   * wide, and a note nobody can read on the line is worse than no note.
   */
  const [notes, setNotes] = useState(editItem?.notes ?? "");

  // Focus trap: save previously focused element, restore on unmount
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement;
    return () => {
      previouslyFocused.current?.focus();
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const FOCUSABLE =
      'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    getFocusable()[0]?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Sync initialization — avoids the null → value re-render flash
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const suggestionsScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = suggestionsScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // already horizontal
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Desktop arrow nav: scroll the suggestions carousel by ~2 cards. Mobile uses
  // touch swipe (the arrows are hidden on mobile).
  const scrollSuggestions = useCallback((dir: "left" | "right") => {
    const el = suggestionsScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -360 : 360, behavior: "smooth" });
  }, []);

  // Validation — walks activeGroups in render order, so the first incomplete
  // group found is also the first one the diner sees on screen.
  const minRequiredFor = (g: ModifierGroup) =>
    Math.max(g.is_required ? 1 : 0, g.min_select);
  let missingCount = 0;
  let firstIncompleteGroupId: string | null = null;
  for (const g of activeGroups) {
    const selected = selections[g.id] ?? [];
    const minRequired = minRequiredFor(g);
    if (minRequired > 0 && selected.length < minRequired) {
      missingCount += minRequired - selected.length;
      firstIncompleteGroupId ??= g.id;
    }
  }
  const isValid = firstIncompleteGroupId === null;

  // Price calculation — from effectiveSelections, so options of a group the
  // customer can no longer see are not charged.
  const modifiersDelta = Object.values(effectiveSelections)
    .flat()
    .reduce((sum, opt) => sum + Number(opt.price_delta), 0);
  const unitPrice = Math.max(0, Number(product.price) + modifiersDelta);

  // NOTE: useBodyScrollLock() is intentionally NOT used here.
  // The app scrolls via a custom div (mainRef), not document.body — body scroll lock would
  // apply position:fixed to the body, causing an iOS visual viewport shift that breaks
  // getBoundingClientRect() in the pill scroll-spy underneath. The sheet body already has
  // overscroll-contain to prevent scroll propagation to the parent.

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // Higher threshold — requires an intentional drag from the handle/header to close.
      if (info.offset.y > 160 || info.velocity.y > 700) {
        onClose();
      }
    },
    [onClose],
  );

  // The handle bar alone was a ~16px target; the header (title + close) is the
  // natural place a thumb grabs a sheet. Pointer-downs on a button are left
  // alone so the close X keeps working as a plain tap. The scrollable body never
  // starts a drag — that gesture belongs to scrolling the options.
  const startSheetDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("button")) return;
      dragControls.start(e);
    },
    [dragControls],
  );

  // Once the line is in the cart, any further change means the diner is
  // building a different one: flip the CTA back to "Add · $X" so it can be
  // added again instead of being stuck on "View cart".
  const resetAdded = () => {
    if (added) setAdded(false);
  };

  const toggleOption = (group: ModifierGroup, option: ModifierOption) => {
    // Out of hours (Grits after 11 AM): say when it is served instead of
    // silently ignoring the tap. Deselecting stays allowed — an item edited
    // from the cart may still carry it.
    const already = (selections[group.id] ?? []).some((o) => o.id === option.id);
    if (!already && !isAvailableNow(option)) {
      setHoursNotice({
        groupId: group.id,
        text: t.optionHoursOnly(
          tName(option, locale, defaultLocale),
          optionHoursLabel(option, locale) ?? "",
        ),
      });
      return;
    }
    resetAdded();
    setSelections((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selection_type === "single") {
        const isSelected = current.some((o) => o.id === option.id);
        return {
          ...prev,
          [group.id]: isSelected && !group.is_required ? [] : [option],
        };
      }
      // Multi-select
      const isSelected = current.some((o) => o.id === option.id);
      if (isSelected) {
        return {
          ...prev,
          [group.id]: current.filter((o) => o.id !== option.id),
        };
      }
      if (current.length >= group.max_select) {
        // When max is 1, swap instead of block (radio-like behaviour)
        if (group.max_select === 1) return { ...prev, [group.id]: [option] };
        return prev;
      }
      return { ...prev, [group.id]: [...current, option] };
    });
  };

  /**
   * An incomplete CTA used to be disabled with "Choose: Style, Cheese, Side"
   * — a list that overflowed the 52px button and, on a long sheet, named
   * groups the diner could not see. A disabled button also gives no feedback
   * when tapped. Now the tap itself is the guide: scroll to the first
   * unanswered group, flash it, buzz (Android; iOS has no vibrate API).
   */
  const revealFirstIncompleteGroup = () => {
    const id = firstIncompleteGroupId;
    if (!id) return;
    const container = bodyScrollRef.current;
    const target = groupRefs.current.get(id);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (container && target) {
      // Offset relative to the sheet's own scroller — scrollIntoView would
      // also scroll the page behind the sheet on iOS.
      const delta =
        target.getBoundingClientRect().top -
        container.getBoundingClientRect().top;
      container.scrollTo({
        top: Math.max(0, container.scrollTop + delta - 8),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }

    navigator.vibrate?.(30);

    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    setHighlightGroupId(id);
    highlightTimer.current = setTimeout(() => setHighlightGroupId(null), 1500);

    // Web Animations instead of a CSS class: it re-runs on every tap, even
    // while the ring from the previous tap is still showing.
    const shakeEl = highlightRefs.current.get(id);
    if (shakeEl && !reduceMotion && typeof shakeEl.animate === "function") {
      shakeEl.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(-4px)" },
          { transform: "translateX(4px)" },
          { transform: "translateX(0)" },
        ],
        // Delay lets the smooth scroll land first so the shake is seen.
        { duration: 400, delay: 250, easing: "ease-in-out" },
      );
    }
  };

  const handleSubmit = () => {
    // Opciones todavía sin llegar (4G lento) o con error: los grupos están
    // vacíos e isValid da true, así que se agregaba el plato pelado — y al
    // EDITAR se borraban Deluxe, side y los "No …". Esperar o reintentar.
    if (optionsPending) {
      if (modifiersError && !modifiersLoading) loadModifiers();
      return;
    }
    if (!isValid) {
      revealFirstIncompleteGroup();
      return;
    }
    const modifierSelections: ModifierSelection[] = activeGroups
      .filter((g) => (effectiveSelections[g.id] ?? []).length > 0)
      .map((g) => ({ group: g, selectedOptions: effectiveSelections[g.id] }));

    // Legacy compat: extract variant/extras for old cart format.
    // Resolve against the lazily-fetched data first: the slim pattern empties
    // product.variants/extras on large catalogs, so looking only there returns
    // undefined and the cart loses price_delta (e.g. a $20 wine bottle bills as $0 extra).
    const sourceVariants = lazyModifiers?.variants ?? product.variants ?? [];
    const sourceExtras = lazyModifiers?.extras ?? product.extras ?? [];
    // Keyed off the selection itself, not off hasModifierGroups: legacy groups now
    // render alongside modifier groups, so a product can have both.
    const legacyVariant = selections["__legacy_variants"]?.[0]
      ? (sourceVariants.find(
          (v) => v.id === selections["__legacy_variants"][0].id,
        ) ?? null)
      : null;
    const legacyExtras = selections["__legacy_extras"]
      ? sourceExtras.filter((e) =>
          selections["__legacy_extras"].some((s) => s.id === e.id),
        )
      : [];

    if (isEditing && editIndex !== null) {
      replaceItem(
        editIndex,
        product,
        legacyVariant,
        legacyExtras,
        qty,
        notes.trim(),
        modifierSelections,
      );
      // Close immediately after editing — user expects to return to menu
      setTimeout(onClose, 350);
    } else {
      addItem(
        product,
        legacyVariant,
        legacyExtras,
        qty,
        notes.trim(),
        modifierSelections,
      );
      onAddToCart?.(displayName);
      // Stay open so user can add suggested products — they close manually
    }
    setAdded(true);
  };

  const getRuleLabel = (g: ModifierGroup) => {
    if (g.selection_type === "single") {
      return g.is_required
        ? locale === "es"
          ? "Elige 1"
          : "Choose 1"
        : locale === "es"
          ? "Opcional"
          : "Optional";
    }
    if (g.is_required) {
      if (g.min_select === g.max_select)
        return locale === "es"
          ? `Elige ${g.min_select}`
          : `Choose ${g.min_select}`;
      return locale === "es"
        ? `Elige ${g.min_select}-${g.max_select}`
        : `Choose ${g.min_select}-${g.max_select}`;
    }
    if (g.max_select <= 1) return locale === "es" ? "Opcional" : "Optional";
    return locale === "es"
      ? `Opcional · hasta ${g.max_select}`
      : `Optional · up to ${g.max_select}`;
  };

  const springTransition = {
    type: "tween" as const,
    duration: 0.18,
    ease: [0.25, 0.46, 0.45, 0.94] as const,
  };

  const sheetBody = (
    <div
      ref={bodyScrollRef}
      className="flex-1 overflow-y-auto overscroll-contain"
      style={
        {
          touchAction: "pan-y",
          WebkitOverflowScrolling: "touch",
        } as React.CSSProperties
      }
    >
      {/* The detail sheet is the fifth surface that has to agree with the menu
          about whether a product shows a photo. Without showsAsRow() a drink
          listed as a row still opened onto a full-bleed hero image — Buccaneer's
          nine beers all pointed at one generic stock photo of a sandwich, so
          tapping "Corona" showed a panini.

          The max-h is the other half of that agreement: 4/3 alone has no
          ceiling, so the wider the surface the taller the photo. On an iPad the
          sheet is wide enough that the hero grew past 700px and pushed the
          option groups below the fold — the CTA stayed disabled ("Choose: …")
          with nothing visible to choose, so the dish could not be added at all.
          The photo is context; the options are the task. */}
      {!showsAsRow(product) && product.image_url && (
        <div className="relative w-full aspect-[4/3] max-h-[38dvh] sm:max-h-[34dvh] bg-gray-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
          <div className="absolute inset-0">
            <Image
              src={product.image_url}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 100vw, 600px"
              loader={
                product.image_url.includes(".supabase.co/storage/")
                  ? supabaseLoader
                  : undefined
              }
              placeholder={getBlurUrl(product.image_url) ? "blur" : undefined}
              blurDataURL={getBlurUrl(product.image_url)}
              className="object-cover opacity-0 transition-opacity duration-150"
              onLoad={(e) =>
                e.currentTarget.classList.replace("opacity-0", "opacity-100")
              }
              priority
            />
          </div>
        </div>
      )}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
              {displayName}
            </h3>
            {displayDesc && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {displayDesc}
              </p>
            )}
            {(product.dietary_tags?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {product.dietary_tags!.map((tagId) => {
                  const tag = DIETARY_TAGS_MAP[tagId];
                  if (!tag) return null;
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[11px] font-medium text-gray-600"
                    >
                      <span>{tag.emoji}</span>
                      {locale?.startsWith("en") ? tag.labelEn : tag.labelEs}
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

      {/* Loading skeleton while modifier data is fetched for large-catalog stores */}
      {modifiersLoading && (
        <div className="px-5 pt-5 space-y-3">
          <div className="skeleton h-4 w-32 rounded-lg" />
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton h-10 rounded-xl"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error state when modifier data fails to load */}
      {modifiersError && !modifiersLoading && (
        <div className="px-5 pt-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
            <p className="text-sm text-amber-700 flex-1">
              {locale === "es"
                ? "No se pudieron cargar las opciones."
                : "Options could not be loaded."}
            </p>
            <button
              onClick={loadModifiers}
              className="text-xs font-semibold text-amber-700 underline underline-offset-2 hover:no-underline flex-shrink-0"
            >
              {locale === "es" ? "Reintentar" : "Retry"}
            </button>
          </div>
        </div>
      )}

      {activeGroups.map((group) => {
        const selected = selections[group.id] ?? [];
        // atMax only blocks when max > 1; for max_select=1 we swap instead of block
        const atMax =
          group.selection_type === "multi" &&
          group.max_select > 1 &&
          selected.length >= group.max_select;

        /**
         * "Incluido" on the free options of a required single-choice group.
         *
         * A Roadhouse Burger arrives with pepperjack in the recipe and in the
         * price, so its option is pre-selected — but pre-selected looked exactly
         * like chosen-by-the-customer, and a blank space where a price would be
         * says nothing. Baymard measured the cost of that silence in product
         * configurators: 63% of users assume wrongly what is included, and find
         * out late enough to feel misled.
         *
         * The label goes on every free option, not just the default: it is also
         * what tells the diner that switching to cheddar costs nothing.
         *
         * "Incluido" rather than "$0" (reads as a bug) or "Gratis" (reads as a
         * giveaway) — the point is that the price already covers it.
         */
        // Only where "free" genuinely means "already paid for": a required
        // single choice the diner must make. On an optional add-on group a zero
        // price means free-of-charge, which is a different claim.
        //
        // And only where the group actually charges for something else. A first
        // pass keyed purely off required+single put "Incluido" next to every
        // cooking temperature — nobody suspects they are billed for medium rare,
        // so the label was pure noise — and next to "Regular" in the Style group,
        // where it read as a promise of something included while Deluxe sat
        // beside it at +$4. The label only carries meaning by contrast: it says
        // "this one costs nothing, that one does", which needs a "that one".
        // One more exclusion, and it is the sharpest: a group whose paid option
        // is an UPGRADE of the whole dish rather than a variant of one
        // ingredient. Buccaneer's "Style" offers Regular against "Deluxe —
        // lettuce, tomato & choice of side +$4"; labelling Regular "Incluido"
        // announces that something comes with it, when Regular is precisely the
        // one that comes with less. The tell is that the free option is the
        // baseline the price already names, not one flavour among equals.
        const options = group.options ?? [];
        const freeCount = options.filter(
          (o) => Number(o.price_delta) === 0,
        ).length;
        const hasPricedOption = freeCount < options.length;
        // Two options, one free one paid, is an upgrade toggle, not a choice of
        // ingredient. A cheese list has many free options and a couple of paid.
        const isUpgradeToggle = options.length === 2 && freeCount === 1;
        const showsIncluded =
          group.is_required &&
          group.selection_type === "single" &&
          hasPricedOption &&
          !isUpgradeToggle;

        // Every group stays open, always (Pedro 2026-11-11). Folding an answered
        // group into a "Cheese: Pepperjack · Change" row hid the live choices
        // behind an extra tap; the diner wants to see and switch options in place.
        // A required group the diner has already answered turns its red
        // "Choose 1" into a green tick: on a six-group burger the badges become
        // a checklist of what is still missing instead of six identical alarms.
        const minRequired = minRequiredFor(group);
        const isSatisfied = minRequired > 0 && selected.length >= minRequired;
        const isHighlighted = highlightGroupId === group.id;
        const headingId = `cs-group-${group.id}`;
        // A single choice that arrives preselected reads as "already decided"
        // unless it says so: diners didn't realise eggs come with home fries
        // and that fries are one tap away (Pedro 2026-11-12). Worded "Standard"
        // rather than "Comes with" because the same shape covers cooking
        // temperature, size and burger style, where "comes with Medium Rare"
        // would be nonsense.
        const defaults = group.options.filter((o) => o.is_default);
        const groupTitle = tName(group, locale, defaultLocale);
        const defaultName =
          defaults.length === 1 ? tName(defaults[0], locale, defaultLocale) : "";
        // A title written as a question that already names the standard
        // ("Comes with Home Fries. Want to swap?") would only be repeated by
        // the hint underneath.
        const standardHint =
          group.selection_type === "single" &&
          group.options.length > 1 &&
          defaults.length === 1 &&
          !groupTitle.toLowerCase().includes(defaultName.toLowerCase())
            ? t.standardChoice(defaultName)
            : null;
        const notice = hoursNotice?.groupId === group.id ? hoursNotice.text : null;

        return (
          <div
            key={group.id}
            ref={(el) => {
              if (el) groupRefs.current.set(group.id, el);
              else groupRefs.current.delete(group.id);
            }}
            className="px-5 pt-6"
          >
            <div
              ref={(el) => {
                if (el) highlightRefs.current.set(group.id, el);
                else highlightRefs.current.delete(group.id);
              }}
              className={cn(
                "rounded-2xl transition-shadow duration-300",
                isHighlighted && "ring-2 ring-red-400 ring-offset-4",
              )}
            >
            {/* Group titles are the questions the diner answers ("How would you
                like your eggs?"), so they carry the hierarchy: 17px extrabold,
                a hairline above each group, and a quiet "Optional" instead of
                an uppercase pill competing with them. Only what blocks the
                order (a required group) keeps colour. Size and weight rather
                than a brand colour: teal already means "selected" here. */}
            <div className="border-t border-gray-100 pt-5 mb-3">
              <h4
                id={headingId}
                className="text-[17px] font-extrabold leading-snug tracking-[-0.01em] text-gray-900"
              >
                {groupTitle}
              </h4>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {isSatisfied ? (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-full text-[#047a65] bg-[#d0f7f1]">
                    <Check className="w-3 h-3" strokeWidth={3} aria-hidden="true" />
                    {t.groupDone}
                  </span>
                ) : minRequired > 0 ? (
                  <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full text-red-600 bg-red-50">
                    {getRuleLabel(group)}
                  </span>
                ) : (
                  <span className="text-[13px] text-gray-500">{getRuleLabel(group)}</span>
                )}
                {atMax && (
                  <span className="text-[12px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                    {t.maxReached}
                  </span>
                )}
              </div>
              {standardHint && (
                <p className="mt-1 text-[13px] text-gray-500">{standardHint}</p>
              )}
            </div>
            {group.display_type === "grid" ? (
              <div
                role="group"
                aria-labelledby={headingId}
                className="grid grid-cols-2 gap-2"
              >
                {group.options.map((opt) => {
                  const isSelected = selected.some((o) => o.id === opt.id);
                  const isDisabled = !isSelected && atMax;
                  // Out of hours: greyed, but still tappable so the tap can say
                  // when it is served (a disabled button swallows the tap).
                  const isOffHours = !isSelected && !isAvailableNow(opt);
                  const hours = optionHoursLabel(opt, locale);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-disabled={isOffHours || undefined}
                      onClick={() => !isDisabled && toggleOption(group, opt)}
                      disabled={isDisabled}
                      className={cn(
                        "flex flex-col items-center justify-center px-3 py-3.5 rounded-2xl transition-colors duration-150 text-center border gap-0.5",
                        isSelected
                          ? "bg-[#05c8a7] text-[#04241E] border-[#05c8a7] shadow-sm"
                          : isDisabled
                            ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                            : isOffHours
                              ? "bg-gray-50 border-dashed border-gray-200 text-gray-400"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm active:border-gray-400",
                      )}
                    >
                      <span className="flex items-center gap-1 text-[14px] font-semibold leading-tight">
                        {/* The tick is not decoration: in the grid the teal fill
                            was the only signal that an option was chosen, which
                            fails WCAG 1.4.1 (colour as the sole means of
                            conveying state) and disappears entirely for the ~8%
                            of men with colour blindness. */}
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                        )}
                        {tName(opt, locale, defaultLocale)}
                      </span>
                      {hours && (
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            isSelected ? "text-[#04241E]/80" : "text-gray-400",
                          )}
                        >
                          {hours}
                        </span>
                      )}
                      {/* Secondary text on the selected teal (#05c8a7) uses the
                          dark ink at 80% (~5.1:1). The old #d0f7f1 / gray-300
                          sat at ~1.4:1 — the price vanished exactly when the
                          diner had just picked it. */}
                      {Number(opt.price_delta) !== 0 ? (
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            isSelected ? "text-[#04241E]/80" : "text-gray-400",
                          )}
                        >
                          {Number(opt.price_delta) > 0 ? "+" : ""}
                          {fmtPrice(Number(opt.price_delta))}
                        </span>
                      ) : (
                        showsIncluded && (
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-wide",
                              isSelected ? "text-[#04241E]/80" : "text-gray-400",
                            )}
                          >
                            {t.included}
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                role="group"
                aria-labelledby={headingId}
                className="space-y-2"
              >
                {group.options.map((opt) => {
                  const isSelected = selected.some((o) => o.id === opt.id);
                  const isDisabled = !isSelected && atMax;
                  // Out of hours: greyed, but still tappable so the tap can say
                  // when it is served (a disabled button swallows the tap).
                  const isOffHours = !isSelected && !isAvailableNow(opt);
                  const hours = optionHoursLabel(opt, locale);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={isSelected}
                      aria-disabled={isOffHours || undefined}
                      onClick={() => !isDisabled && toggleOption(group, opt)}
                      disabled={isDisabled}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-150 text-left border",
                        isSelected
                          ? "bg-[#05c8a7] text-[#04241E] border-[#05c8a7] shadow-sm"
                          : isDisabled
                            ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                            : isOffHours
                              ? "bg-gray-50 border-dashed border-gray-200 text-gray-400"
                              : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm active:border-gray-400",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {group.selection_type === "single" ? (
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                              isSelected
                                ? "border-white bg-white"
                                : "border-gray-300",
                            )}
                          >
                            {isSelected && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#05c8a7]" />
                            )}
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center transition-colors flex-shrink-0",
                              isSelected
                                ? "bg-white"
                                : "border-2 border-gray-300",
                            )}
                          >
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-[#047a65]" />
                            )}
                          </div>
                        )}
                        <span className="text-[15px] font-medium">
                          {tName(opt, locale, defaultLocale)}
                          {hours && (
                            <span
                              className={cn(
                                "ml-2 text-[12px] font-medium",
                                isSelected ? "text-[#04241E]/80" : "text-gray-400",
                              )}
                            >
                              {hours}
                            </span>
                          )}
                        </span>
                      </div>
                      {Number(opt.price_delta) !== 0 ? (
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            isSelected ? "text-[#04241E]/80" : "text-gray-500",
                          )}
                        >
                          {Number(opt.price_delta) > 0 ? "+" : ""}
                          {fmtPrice(Number(opt.price_delta))}
                        </span>
                      ) : (
                        showsIncluded && (
                          <span
                            className={cn(
                              "text-[11px] font-semibold uppercase tracking-wide",
                              isSelected ? "text-[#04241E]/80" : "text-gray-400",
                            )}
                          >
                            {t.included}
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <p
              aria-live="polite"
              className={cn(
                "text-[13px] font-medium text-amber-700",
                notice ? "mt-2" : "sr-only",
              )}
            >
              {notice}
            </p>
            </div>
          </div>
        );
      })}

      {/* ── Free-text note for this line ──
          Deliberately last, after every modifier group: the structured options
          are what the kitchen can price and route, so the diner should meet
          them first and reach for prose only for what they don't cover
          ("no pickles", "gravy on the side"). Placing it earlier invites people
          to type requests that already exist as a tappable option. */}
      <div className="px-5 pt-5">
        <label
          htmlFor="item-notes"
          className="block text-[17px] font-extrabold leading-snug tracking-[-0.01em] text-gray-900 mb-3 border-t border-gray-100 pt-5"
        >
          {t.itemNotesLabel}
        </label>
        <textarea
          id="item-notes"
          value={notes}
          onChange={(e) => {
            resetAdded();
            setNotes(e.target.value.slice(0, 200));
          }}
          maxLength={200}
          rows={2}
          placeholder={t.itemNotesPlaceholder}
          /* text-base (16px) is not a style choice: iOS Safari zooms the whole
             page when a focused input is under 16px, and the diner lands back
             on a menu they have to pinch out of. */
          className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-400 resize-none transition-colors focus:outline-none focus:border-[#05c8a7] focus:ring-1 focus:ring-[#05c8a7]"
        />
        {notes.length > 150 && (
          <p className="mt-1 text-[11px] text-gray-400 text-right tabular-nums">
            {notes.length}/200
          </p>
        )}
      </div>

      {/* ── Smart complementary suggestions ──
          Horizontal carousel on BOTH desktop and mobile (the pattern Uber Eats /
          DoorDash use inside the item detail). Mobile: swipe. Desktop: arrow
          buttons + wheel-to-horizontal. Cards peek past the right edge to signal
          there's more. The quick-add control is an OUTLINE "+" so it stays
          visually subordinate to the solid sticky CTA below (avoids confusion). */}
      {!isEditing && (suggestedProducts ?? []).length > 0 && (
        <div className="pt-5 pb-6">
          <div className="flex items-center gap-1.5 mb-3 px-5">
            <span className="text-sm" aria-hidden>
              ✨
            </span>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              {locale === "es" ? "Combiná tu pedido" : "Pair it with"}
            </p>
          </div>
          <div className="relative group/sugg">
            <div
              ref={suggestionsScrollRef}
              className="flex gap-3 overflow-x-auto px-5 pb-1 scroll-smooth"
              style={
                {
                  WebkitOverflowScrolling: "touch",
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                } as React.CSSProperties
              }
            >
              {(suggestedProducts ?? []).slice(0, 12).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => onSuggestAdd?.(p)}
                  aria-label={
                    locale === "es"
                      ? `Agregar ${tName(p, locale, defaultLocale)}`
                      : `Add ${tName(p, locale, defaultLocale)}`
                  }
                  className="group/card flex-shrink-0 w-[132px] lg:w-[160px] text-left bg-white rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
                >
                  <div className="relative w-full aspect-square bg-gray-100">
                    {!showsAsRow(p) && p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt={tName(p, locale, defaultLocale)}
                        fill
                        sizes="160px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                    {/* Outline quick-add "+" — white fill, brand border, sits over
                        the image corner. Deliberately lighter weight than the CTA. */}
                    <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white border-[1.5px] border-[#05c8a7] flex items-center justify-center shadow-sm group-hover/card:bg-[#05c8a7] transition-colors">
                      <Plus className="w-4 h-4 text-[#047a65] group-hover/card:text-white transition-colors" />
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="text-[12px] font-medium text-gray-800 line-clamp-2 leading-tight mb-1">
                      {tName(p, locale, defaultLocale)}
                    </p>
                    <span className="text-[13px] font-semibold text-gray-700 tabular-nums">
                      {fmtPrice(Number(p.price))}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop arrow controls — appear on hover. Hidden on mobile (swipe). */}
            <button
              type="button"
              onClick={() => scrollSuggestions("left")}
              aria-label={locale === "es" ? "Ver anteriores" : "Scroll left"}
              className="hidden lg:flex absolute left-1.5 top-[78px] -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 items-center justify-center text-gray-600 hover:text-gray-900 hover:scale-105 transition-all opacity-0 group-hover/sugg:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollSuggestions("right")}
              aria-label={locale === "es" ? "Ver más" : "Scroll right"}
              className="hidden lg:flex absolute right-1.5 top-[78px] -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-md border border-gray-100 items-center justify-center text-gray-600 hover:text-gray-900 hover:scale-105 transition-all opacity-0 group-hover/sugg:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Right-edge fade — signals more content past the peek. */}
            {(suggestedProducts ?? []).length > 3 && (
              <div
                className="pointer-events-none absolute top-0 right-0 h-full w-12"
                style={{
                  background: "linear-gradient(to right, transparent, white)",
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );

  const previewBadge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d0f7f1] text-[#047a65] text-[11px] font-bold uppercase tracking-wider">
      {locale === "es" ? "Vista previa" : "Preview"}
    </span>
  );

  const sheetFooter = isPreview ? null : (
    <div className="border-t border-gray-100 flex-shrink-0 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-xl">
            <button
              onClick={() => {
                resetAdded();
                setQty(Math.max(1, qty - 1));
              }}
              className="w-11 h-11 flex items-center justify-center rounded-l-xl active:bg-gray-200 transition-colors"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <span className="w-10 text-center font-bold text-base tabular-nums">
              {qty}
            </span>
            <button
              onClick={() => {
                resetAdded();
                setQty(qty + 1);
              }}
              className="w-11 h-11 flex items-center justify-center rounded-r-xl active:bg-gray-200 transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          {added ? (
            // After adding: show two actions — close or keep browsing suggestions
            <div className="flex flex-1 gap-2">
              <button
                onClick={onViewCart ?? onClose}
                className="flex-1 h-[52px] rounded-2xl font-extrabold text-[15px] bg-[#05c8a7] text-[#04241E] transition-all duration-200 active:scale-[0.98]"
              >
                ✓ {locale === "es" ? "Ver carrito" : "View cart"}
              </button>
              <button
                onClick={onClose}
                className="h-[52px] px-4 rounded-2xl font-semibold text-[14px] bg-gray-100 text-gray-600 transition-all duration-200 active:scale-[0.98] whitespace-nowrap"
              >
                {locale === "es" ? "Seguir" : "Continue"}
              </button>
            </div>
          ) : (
            // Never disabled: an incomplete tap scrolls to and flashes the
            // first unanswered group (see revealFirstIncompleteGroup). The
            // label stays one line — the missing-count truncates, the live
            // price never does.
            <button
              type="button"
              onClick={handleSubmit}
              aria-busy={optionsPending && modifiersLoading}
              // ~195px wide on a 375px phone next to the stepper: 14px keeps
              // "Choose 2 more · $12.50" whole; 16px would cut the count.
              className={cn(
                "flex-1 min-w-0 h-[52px] px-3 flex items-center justify-center gap-1.5 rounded-2xl font-extrabold whitespace-nowrap bg-[#05c8a7] text-[#04241E] transition-all duration-200 active:scale-[0.98] shadow-sm hover:bg-[#04b096]",
                isValid && !optionsPending ? "text-[16px]" : "text-[14px]",
                optionsPending && modifiersLoading && "opacity-70",
              )}
            >
              <span className="truncate">
                {optionsPending
                  ? modifiersError && !modifiersLoading
                    ? locale === "es" ? "Reintentar" : "Retry"
                    : locale === "es" ? "Cargando…" : "Loading…"
                  : !isValid
                  ? t.chooseMore(missingCount)
                  : isEditing
                    ? t.updateItem
                    : t.add}
              </span>
              <span className="flex-shrink-0 tabular-nums">
                · {fmtPrice(unitPrice * qty)}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div ref={dialogRef} className="fixed inset-0 z-50">
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="customization-dialog-title"
          className="flex fixed top-0 bottom-0 right-0 w-[520px] bg-white flex-col shadow-[-8px_0_30px_rgba(0,0,0,0.08)] border-l border-gray-100"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={springTransition}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-white z-10">
            <div className="flex items-center gap-3 min-w-0">
              {!isPreview && (
                <button
                  onClick={onClose}
                  aria-label={locale === "es" ? "Volver" : "Back"}
                  className="flex items-center gap-1.5 p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] focus-visible:ring-offset-1"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              {isPreview && previewBadge}
              <div className="min-w-0">
                <h2
                  id="customization-dialog-title"
                  className="text-base font-bold text-gray-900 truncate"
                >
                  {isEditing ? t.editItem : displayName}
                </h2>
                <p className="text-xs text-gray-400 font-medium tabular-nums">
                  {fmtPrice(Number(product.price))}
                  {displayDesc && <span className="ml-2 text-gray-300">·</span>}
                  {displayDesc && (
                    <span className="ml-2 truncate">
                      {displayDesc.slice(0, 40)}
                      {displayDesc.length > 40 ? "..." : ""}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={t.close}
              className="p-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] focus-visible:ring-offset-1"
            >
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
          role="dialog"
          aria-modal="true"
          aria-labelledby="customization-dialog-title"
          className="fixed left-0 right-0 bottom-0 bg-white flex flex-col shadow-2xl rounded-t-2xl max-h-[92dvh]"
          style={{ minHeight: "min(60dvh, 100dvh)" }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
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
            onPointerDown={startSheetDrag}
            style={{ touchAction: "none" }}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Header — large X, no back arrow. Altura fija 48px (h-12) para igualar
            el header del restaurante; nombre en sans extrabold tracking apretado
            (Opción C) para mantener consistencia visual entre ambos headers.
            Also a drag zone (startSheetDrag skips the close button). */}
          <div
            className="flex items-center justify-between h-12 px-5 border-b border-gray-100 flex-shrink-0 bg-white z-10 select-none"
            onPointerDown={startSheetDrag}
            style={{ touchAction: "none" }}
          >
            <div className="min-w-0 flex-1">
              {isPreview && previewBadge}
              <h2
                id="customization-dialog-title"
                className="text-[17px] font-extrabold tracking-[-0.03em] text-gray-900 truncate"
              >
                {isEditing ? t.editItem : displayName}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label={t.close}
              className="p-2 -mr-1 ml-3 rounded-lg active:bg-gray-100 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] focus-visible:ring-offset-1"
            >
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
