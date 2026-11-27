"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { X, Minus, Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";
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
import { DietIcon } from "./DietIcon";
import { tName, tDesc, tHint } from "@/lib/i18n";
import {
  visibleGroups,
  pruneHiddenSelections,
} from "@/lib/conditional-modifiers";
import { supabaseLoader, getBlurUrl } from "@/lib/image-loader";
import { hasHours, isOptionAvailableAt, optionHoursLabel } from "@/lib/option-hours";
import { inTimeZone } from "@/lib/orders/business-hours";
import { showsAsRow } from "@/lib/product-display";
import { planGroupLayout, splitOptionName } from "@/lib/modifier-layout";
import { AddonSearch } from "./AddonSearch";
import { useStoreConfig } from "@/lib/store-config-context";
import { pickNoteChips, noteHasChip, toggleNoteChip } from "@/lib/note-chips";

/** Height of the compact header that replaces the floating X on scroll. */
const COMPACT_HEADER_PX = 52;

const DIETARY_TAGS_MAP = Object.fromEntries(DIETARY_TAGS.map((t) => [t.id, t]));

/**
 * A label that turns semibold when chosen without changing size. Bold text is
 * wider: on a phone the chip grew a few pixels, the row re-wrapped and every
 * button below jumped. An invisible semibold copy in the same grid cell keeps
 * the box at its bold size in both states.
 */
function StableWeightLabel({ text, bold, block }: { text: string; bold: boolean; block?: boolean }) {
  return (
    <span className={block ? "grid" : "inline-grid"}>
      <span className={cn("[grid-area:1/1]", bold ? "font-semibold" : "font-medium")}>{text}</span>
      <span aria-hidden="true" className="[grid-area:1/1] font-semibold invisible">
        {text}
      </span>
    </span>
  );
}

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
  /** Add-on search fallback: drinks/sides/desserts on the menu ("pepsi" in a burger). */
  findOnMenu?: (query: string) => Product[];
  /** Product to open once this dish is added ("Add after this"). */
  queuedNext?: Product | null;
  onQueueNext?: (product: Product) => void;
  onUnqueueNext?: () => void;
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
  findOnMenu,
  queuedNext = null,
  onQueueNext,
  onUnqueueNext,
}: CustomizationSheetProps) {
  const displayName = tName(product, locale, defaultLocale);
  const displayDesc = tDesc(product, locale, defaultLocale);
  const addItem = useCartStore((s) => s.addItem);
  const replaceItem = useCartStore((s) => s.replaceItem);
  const items = useCartStore((s) => s.items);
  const isEditing = editIndex !== null;
  // Sold out or outside its hours (MenuShell's liveProducts sets in_stock=false
  // and unavailable_note "Served 5:30–11 AM"). The grid never opens these, but
  // search results and links can: the sheet still shows the dish, it just
  // can't be added — before, "Add" worked and the server refused it at checkout.
  const unavailable = product.in_stock === false && !isEditing;
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
  const { noteChips: noteChipRules } = useStoreConfig();
  const noteChips = useMemo(
    () => pickNoteChips(noteChipRules, product.category_id, groups, locale, product.id),
    [noteChipRules, product.category_id, groups, locale, product.id],
  );
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
  // Agotada hoy (la sopa que se acabó) se trata como fuera de horario: gris y el toque avisa.
  const isAvailableNow = (o: ModifierOption) =>
    !o.sold_out && (!hasHours(o) || isOptionAvailableAt(o, localNow));
  /** Lo que se escribe debajo de una opción que no se puede pedir ahora. */
  const unavailableLabel = (o: ModifierOption) =>
    o.sold_out ? t.optionSoldOutToday : optionHoursLabel(o, locale);
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
  // "Add something else" (display_type 'search') no es una pregunta más de la
  // lista: se dibuja como buscador al final, justo antes de "Special
  // instructions". Validación, precio y envío siguen usando activeGroups.
  const questionGroups = useMemo(
    () => activeGroups.filter((g) => g.display_type !== "search"),
    [activeGroups],
  );
  const searchGroup = useMemo(
    () => activeGroups.find((g) => g.display_type === "search" && g.options.length > 0) ?? null,
    [activeGroups],
  );
  // "Add anything" en todos los platos: busca los extras del plato y, si no se está
  // editando un ítem del carrito, cualquier cosa del menú para sumar al pedido.
  const showSearch =
    !!searchGroup || (!isEditing && !!findOnMenu) || questionGroups.some((g) => g.is_required === false);
  // Chips, list or cards per group, and which lone add-ons join a list.
  const layout = useMemo(() => planGroupLayout(questionGroups), [questionGroups]);

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
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const searchBlockRef = useRef<HTMLDivElement>(null);

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

  // One name on screen at a time. The title lives in the body under the
  // photo; once it scrolls out of view a compact opaque header (name, price,
  // X) takes over. The old fixed header showed the name above the photo AND
  // under it, and cost 64px on every screen of a 5-screen sheet.
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleHidden, setTitleHidden] = useState(false);
  useEffect(() => {
    // Desktop keeps the title in a fixed left column: nothing to replace.
    if (isDesktop) {
      setTitleHidden(false);
      return;
    }
    const root = bodyScrollRef.current;
    const el = titleRef.current;
    if (!root || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        const top = entry.rootBounds?.top ?? 0;
        setTitleHidden(!entry.isIntersecting && entry.boundingClientRect.top < top);
      },
      { root, rootMargin: `-${COMPACT_HEADER_PX}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [product.id, isDesktop]);

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
      const optName = tName(option, locale, defaultLocale);
      setHoursNotice({
        groupId: group.id,
        text: option.sold_out
          ? t.optionSoldOutNotice(optName)
          : t.optionHoursOnly(optName, optionHoursLabel(option, locale) ?? ""),
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
  /** Sube `target` hasta el borde de arriba del cuerpo de la hoja. */
  const scrollSheetTo = (target: HTMLElement | null | undefined) => {
    const container = bodyScrollRef.current;
    if (!container || !target) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Offset relative to the sheet's own scroller — scrollIntoView would
    // also scroll the page behind the sheet on iOS.
    const delta =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top;
    container.scrollTo({
      // Minus the compact header, which is showing by then and would
      // otherwise cover the title of the group being pointed at.
      top: Math.max(0, container.scrollTop + delta - COMPACT_HEADER_PX - 8),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  // El buscador encontró algo que el plato ya pregunta: llevar ahí y marcarlo
  // un momento en el color de "elegido" (el rojo es solo para lo que falta).
  const [pointedGroupId, setPointedGroupId] = useState<string | null>(null);
  const pointTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pointTimer.current) clearTimeout(pointTimer.current);
    },
    [],
  );
  const pointToGroup = (groupId: string) => {
    // Un agregado suelto dibujado dentro de otra lista ("Extra cheese?") no
    // tiene bloque propio: se señala la lista que lo contiene.
    let id = groupId;
    layout.guests.forEach((guests, hostId) => {
      if (guests.some((g) => g.id === groupId)) id = hostId;
    });
    scrollSheetTo(groupRefs.current.get(id));
    if (pointTimer.current) clearTimeout(pointTimer.current);
    setPointedGroupId(id);
    pointTimer.current = setTimeout(() => setPointedGroupId(null), 1600);
  };

  // Sin resultado en el buscador: a "Special instructions" con lo escrito.
  const goToNotes = (query: string) => {
    const q = query.trim();
    if (q && !notes.trim()) setNotes(q.slice(0, 200));
    scrollSheetTo(notesRef.current);
    notesRef.current?.focus({ preventScroll: true });
  };

  const revealFirstIncompleteGroup = () => {
    const id = firstIncompleteGroupId;
    if (!id) return;
    const target = groupRefs.current.get(id);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    scrollSheetTo(target);

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
    if (unavailable) return;
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

  const getRuleLabel = (raw: ModifierGroup) => {
    // A badly loaded group ("Extra cheese", max 2, one option) promised
    // "up to 2" while toggleOption can't pick the same option twice. The label
    // says what the diner can actually choose.
    const optionCount = raw.options?.length ?? 0;
    const g =
      optionCount > 0 && raw.max_select > optionCount
        ? { ...raw, max_select: optionCount, min_select: Math.min(raw.min_select, optionCount) }
        : raw;
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

  const hasHero = !showsAsRow(product) && !!product.image_url;

  // Shared state of one option button, whatever its shape.
  const optionState = (group: ModifierGroup, opt: ModifierOption) => {
    const selected = selections[group.id] ?? [];
    const atMax =
      group.selection_type === "multi" &&
      group.max_select > 1 &&
      selected.length >= group.max_select;
    const isSelected = selected.some((o) => o.id === opt.id);
    return {
      isSelected,
      isDisabled: !isSelected && atMax,
      // Out of hours: greyed, but still tappable so the tap can say when it
      // is served (a disabled button swallows the tap).
      isOffHours: !isSelected && !isAvailableNow(opt),
      hours: unavailableLabel(opt),
      price: Number(opt.price_delta),
    };
  };
  const priceLabel = (price: number) => `${price > 0 ? "+" : ""}${fmtPrice(price)}`;

  /** Short options that flow and wrap: cooking, cheeses, "No pickle", sauces. */
  const renderChip = (group: ModifierGroup, opt: ModifierOption) => {
    const { isSelected, isDisabled, isOffHours, hours, price } = optionState(group, opt);
    return (
      <button
        key={opt.id}
        type="button"
        aria-pressed={isSelected}
        aria-disabled={isOffHours || undefined}
        onClick={() => !isDisabled && toggleOption(group, opt)}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full border text-[15px] leading-tight text-left transition-colors duration-150",
          isSelected
            ? "bg-[#05c8a7] border-[#05c8a7] text-[#04241E]"
            : isDisabled
              ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
              : isOffHours
                ? "bg-gray-50 border-dashed border-gray-200 text-gray-500"
                : "bg-white border-gray-200 text-gray-800 hover:border-gray-300 active:border-gray-400",
        )}
      >
        {/* The tick is not decoration: colour alone must not carry the
            selected state (WCAG 1.4.1). The slot is always there (ring for a
            single choice, plus for add-ons) so selecting doesn't widen the chip
            and make the whole row jump. */}
        <span className="w-4 h-4 flex-shrink-0 grid place-items-center" aria-hidden="true">
          {isSelected ? (
            <Check className="w-4 h-4" strokeWidth={2.5} />
          ) : group.selection_type === "single" || group.max_select <= 1 ? (
            <span className="w-3.5 h-3.5 rounded-full border-[1.5px] border-current opacity-50" />
          ) : (
            <Plus className="w-4 h-4 opacity-60" />
          )}
        </span>
        <StableWeightLabel text={tName(opt, locale, defaultLocale)} bold={isSelected} />
        {price !== 0 && (
          <span className={cn("text-[13px] font-medium tabular-nums", isSelected ? "text-[#04241E]/80" : "text-gray-600")}>
            {priceLabel(price)}
          </span>
        )}
        {hours && (
          <span className={cn("text-[13px] font-medium", isSelected ? "text-[#04241E]/80" : "text-gray-600")}>
            {hours}
          </span>
        )}
      </button>
    );
  };

  /**
   * Plain dish or paid upgrade (Regular | Deluxe +$4.00): one segmented
   * control of 52px with what the upgrade adds on a single line underneath —
   * two side-by-side cards took ~114px and broke "…choice of / side" across
   * three centred lines. Text after " — " in the option name is that line.
   */
  const renderToggle = (group: ModifierGroup, headingId: string) => {
    const details = group.options
      .map((opt) => {
        const { title, detail } = splitOptionName(tName(opt, locale, defaultLocale));
        return detail ? title + ": " + detail : null;
      })
      .filter(Boolean);
    return (
      <>
        <div
          role="radiogroup"
          aria-labelledby={headingId}
          className="grid grid-cols-2 gap-1 p-1 rounded-full bg-gray-100"
        >
          {group.options.map((opt) => {
            const { isSelected, isOffHours, hours, price } = optionState(group, opt);
            const { title } = splitOptionName(tName(opt, locale, defaultLocale));
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-disabled={isOffHours || undefined}
                onClick={() => toggleOption(group, opt)}
                className={cn(
                  "min-h-[44px] px-3 inline-flex items-center justify-center gap-1.5 rounded-full text-[15px] leading-tight transition-colors duration-150",
                  isSelected
                    ? "bg-[#05c8a7] text-[#04241E] font-semibold shadow-sm"
                    : isOffHours
                      ? "text-gray-500"
                      : "text-gray-800 font-medium hover:bg-white/70 active:bg-white",
                )}
              >
                {/* Tick reserved in both halves: the label doesn't slide over when chosen. */}
                <Check className={cn("w-4 h-4 flex-shrink-0", !isSelected && "invisible")} aria-hidden="true" />
                <span className="truncate">{title}</span>
                {price !== 0 && (
                  <span
                    className={cn(
                      "text-[13px] font-medium tabular-nums flex-shrink-0",
                      isSelected ? "text-[#04241E]/80" : "text-gray-600",
                    )}
                  >
                    {priceLabel(price)}
                  </span>
                )}
                {hours && <span className="sr-only">{hours}</span>}
              </button>
            );
          })}
        </div>
        {details.length > 0 && (
          <p className="mt-2 px-1 text-[13px] leading-snug text-gray-600">
            {details.join(" · ")}
          </p>
        )}
      </>
    );
  };

  /** Priced add-ons: checkbox (or radio), name, price aligned right. */
  const renderListRow = (group: ModifierGroup, opt: ModifierOption) => {
    const { isSelected, isDisabled, isOffHours, hours, price } = optionState(group, opt);
    // A lone option ("Egg Whites +$1.25") toggles on and off: a checkbox,
    // not a radio, even when the group is stored as single choice.
    const single = group.selection_type === "single" && group.options.length > 1;
    return (
      <button
        key={opt.id}
        type="button"
        aria-pressed={isSelected}
        aria-disabled={isOffHours || undefined}
        onClick={() => !isDisabled && toggleOption(group, opt)}
        disabled={isDisabled}
        className={cn(
          "w-full min-h-[52px] flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150",
          isDisabled
            ? "text-gray-300 cursor-not-allowed"
            : isOffHours
              ? "text-gray-500"
              : "text-gray-900 hover:bg-gray-50 active:bg-gray-100",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 transition-colors",
            single ? "rounded-full" : "rounded-md",
            isSelected ? "bg-[#05c8a7]" : "border-2 border-gray-300 bg-white",
          )}
        >
          {isSelected &&
            (single ? (
              <span className="w-2 h-2 rounded-full bg-[#04241E]" />
            ) : (
              <Check className="w-3.5 h-3.5 text-[#04241E]" strokeWidth={3} />
            ))}
        </span>
        <span className="flex-1 min-w-0 text-[15px] leading-snug">
          <StableWeightLabel text={tName(opt, locale, defaultLocale)} bold={isSelected} block />
          {hours &&<span className="block text-[13px] font-medium text-gray-600">{hours}</span>}
        </span>
        {price !== 0 && (
          <span className="text-[15px] text-gray-700 tabular-nums flex-shrink-0">{priceLabel(price)}</span>
        )}
      </button>
    );
  };

  const springTransition = {
    type: "tween" as const,
    duration: 0.18,
    ease: [0.25, 0.46, 0.45, 0.94] as const,
  };

  const renderHeroMedia = (desktop: boolean) => (
    <>
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
        {/* Square, like the photos themselves (Pedro, 2026-11-17). 16:9 cut the
            top and bottom off every square photo: a tall glass (juices,
            smoothies) became a giant close-up of the middle of the glass. The
            cap keeps small phones (SE) and the wide tablet sheet from showing a
            photo taller than half the screen; there it trims the sides a little.
            Handle and X float over it (sheetChrome). */}
        {hasHero ? (
          <div
            className={cn(
              "relative w-full bg-gray-100 overflow-hidden",
              desktop ? "aspect-[4/3]" : "aspect-square max-h-[50dvh]",
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
            <div className="absolute inset-0">
              <Image
                src={product.image_url}
                alt={displayName}
                fill
                sizes={desktop ? "380px" : "(max-width: 640px) 100vw, 600px"}
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
        ) : desktop ? null : (
          // No photo: a strip for the floating X so it never sits on the title.
          <div style={{ height: COMPACT_HEADER_PX }} aria-hidden="true" />
        )}
    </>
  );

  const heroText = (
    <>
        <div className="px-5 pt-4 pb-2">
          <div>
            <div>
              {isEditing && (
                <p className="text-[13px] font-medium text-gray-600 mb-1">{t.editItem}</p>
              )}
              <h3
                id="customization-dialog-title"
                ref={titleRef}
                className="text-[22px] font-bold text-gray-900 leading-tight tracking-[-0.01em]"
              >
                {displayName}
              </h3>
              <p className="mt-1 text-[17px] font-semibold text-gray-900 tabular-nums">
                {fmtPrice(Number(product.price))}
              </p>
              {displayDesc && (
                <p className="text-[15px] text-gray-600 mt-2 leading-relaxed">
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
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[12px] font-medium text-gray-700"
                      >
                        <DietIcon tag={tagId} className="w-3.5 h-3.5 text-[#047a65]" />
                        {locale?.startsWith("en") ? tag.labelEn : tag.labelEs}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

    </>
  );

  const optionsContent = (
    <>
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

        {questionGroups.map((group) => {
          if (layout.absorbed.has(group.id)) return null;
          const format = layout.format.get(group.id) ?? "chips";
          const guests = layout.guests.get(group.id) ?? [];
          const selected = selections[group.id] ?? [];
          // atMax only blocks when max > 1; for max_select=1 we swap instead of block
          const atMax =
            group.selection_type === "multi" &&
            group.max_select > 1 &&
            selected.length >= group.max_select;

          // Free options carry no label: only the ones that cost show "+$1.00"
          // (Pedro 2026-11-18). An "Included" tag beside Ham/Bacon/Sausage, with
          // Turkey Bacon at +$1 next to them, read as noise; the price on the
          // paid ones already says which choices add to the bill.

          // Every group stays open, always (Pedro 2026-11-11). Folding an answered
          // group into a "Cheese: Pepperjack · Change" row hid the live choices
          // behind an extra tap; the diner wants to see and switch options in place.
          // A required group the diner has already answered turns its red
          // "Choose 1" into a green tick: on a six-group burger the badges become
          // a checklist of what is still missing instead of six identical alarms.
          const minRequired = minRequiredFor(group);
          const isSatisfied = minRequired > 0 && selected.length >= minRequired;
          const isHighlighted = highlightGroupId === group.id;
          const isPointed = pointedGroupId === group.id;
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
          const notice =
            hoursNotice &&
            (hoursNotice.groupId === group.id ||
              guests.some((g) => g.id === hoursNotice.groupId))
              ? hoursNotice.text
              : null;
          // A picked option can carry a note for exactly that choice: Bacon on
          // the Beef Burger costs $1.25 more than ordering the Bacon Burger, so
          // the diner is told when (and only when) they pick it.
          const optionHints = [group, ...guests]
            .flatMap((g) => selections[g.id] ?? [])
            .map((o) => tHint(o, locale, defaultLocale))
            .filter((h, i, all): h is string => h !== null && all.indexOf(h) === i);

          return (
            <div
              key={group.id}
              ref={(el) => {
                if (el) groupRefs.current.set(group.id, el);
                else groupRefs.current.delete(group.id);
              }}
              className="px-5 pt-4"
            >
              <div
                ref={(el) => {
                  if (el) highlightRefs.current.set(group.id, el);
                  else highlightRefs.current.delete(group.id);
                }}
                className={cn(
                  "rounded-2xl transition-shadow duration-300",
                  isHighlighted && "ring-2 ring-red-400 ring-offset-4",
                  !isHighlighted && isPointed && "ring-2 ring-[#05c8a7] ring-offset-4",
                )}
              >
              {/* Group titles are the questions the diner answers ("How would you
                  like your eggs?"), so they carry the hierarchy: 17px extrabold,
                  a hairline above each group, and a quiet "Optional" instead of
                  an uppercase pill competing with them. Only what blocks the
                  order (a required group) keeps colour. Size and weight rather
                  than a brand colour: teal already means "selected" here. */}
              <div className="border-t border-gray-100 pt-4 mb-3">
                <h4
                  id={headingId}
                  className="text-[17px] font-semibold leading-snug text-gray-900"
                >
                  {groupTitle}
                </h4>
                <div className="mt-1.5 min-h-[24px] flex items-center gap-2 flex-wrap">
                  {/* Pending required groups read as a quiet grey "Required" — red
                      only once the diner tried to add without answering (the same
                      moment the ring turns red). Answered ones become a tick in the
                      accent instead of a "Done" chip: a checklist, not six pills. */}
                  {isSatisfied ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-600">
                      <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-[#05c8a7]">
                        <Check className="w-3 h-3 text-[#04241E]" strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span className="sr-only">{t.groupDone}:</span>
                      {getRuleLabel(group)}
                    </span>
                  ) : minRequired > 0 ? (
                    <span
                      className={cn(
                        "text-[13px] leading-5 font-medium px-2 py-0.5 rounded-full",
                        isHighlighted ? "text-red-700 bg-red-50" : "text-gray-700 bg-gray-100",
                      )}
                    >
                      {t.groupRequired} · {getRuleLabel(group)}
                    </span>
                  ) : (
                    // A list that took in lone add-ons has more rows than its own
                    // "up to 4" counts; each joined row keeps its own rule.
                    <span className="text-[13px] text-gray-600">
                      {getRuleLabel(guests.length > 0 ? { ...group, max_select: 1 } : group)}
                    </span>
                  )}
                  {atMax && (
                    <span className="text-[13px] leading-5 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                      {t.maxReached}
                    </span>
                  )}
                </div>
                {standardHint && (
                  <p className="mt-1 text-[13px] text-gray-600">{standardHint}</p>
                )}
              </div>
              {format === "toggle" ? (
                renderToggle(group, headingId)
              ) : format === "chips" ? (
                <div role="group" aria-labelledby={headingId} className="flex flex-wrap gap-2">
                  {group.options.map((opt) => renderChip(group, opt))}
                </div>
              ) : format === "list" ? (
                <div
                  role="group"
                  aria-labelledby={headingId}
                  className="rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden"
                >
                  {group.options.map((opt) => renderListRow(group, opt))}
                  {/* Lone add-ons that follow ("Extra cheese?") as more rows:
                      separate groups in the data, one list on screen. */}
                  {guests.map((g) =>
                    g.options.map((opt) => renderListRow(g, opt)),
                  )}
                </div>
              ) : (
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
                    const hours = unavailableLabel(opt);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={isSelected}
                        aria-disabled={isOffHours || undefined}
                        onClick={() => !isDisabled && toggleOption(group, opt)}
                        disabled={isDisabled}
                        className={cn(
                          "relative flex flex-col items-center justify-center px-3 py-3.5 rounded-2xl transition-colors duration-150 text-center border gap-0.5",
                          isSelected
                            ? "bg-[#05c8a7] text-[#04241E] border-[#05c8a7] shadow-sm"
                            : isDisabled
                              ? "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
                              : isOffHours
                                ? "bg-gray-50 border-dashed border-gray-200 text-gray-500"
                                : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm active:border-gray-400",
                        )}
                      >
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#04241E] text-white grid place-items-center" aria-hidden="true">
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[14px] font-semibold leading-tight">
                          {/* The tick is not decoration: in the grid the teal fill
                              was the only signal that an option was chosen, which
                              fails WCAG 1.4.1 (colour as the sole means of
                              conveying state) and disappears entirely for the ~8%
                              of men with colour blindness. */}
                          {tName(opt, locale, defaultLocale)}
                        </span>
                        {hours && (
                          <span
                            className={cn(
                              "text-[13px] font-medium",
                              isSelected ? "text-[#04241E]/80" : "text-gray-600",
                            )}
                          >
                            {hours}
                          </span>
                        )}
                        {/* Secondary text on the selected teal (#05c8a7) uses the
                            dark ink at 80% (~5.1:1). The old #d0f7f1 / gray-300
                            sat at ~1.4:1 — the price vanished exactly when the
                            diner had just picked it. */}
                        {Number(opt.price_delta) !== 0 && (
                          <span
                            className={cn(
                              "text-[13px] font-medium",
                              isSelected ? "text-[#04241E]/80" : "text-gray-600",
                            )}
                          >
                            {Number(opt.price_delta) > 0 ? "+" : ""}
                            {fmtPrice(Number(opt.price_delta))}
                          </span>
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
              <div aria-live="polite">
                {optionHints.length > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[14px] leading-snug text-amber-900">
                    {optionHints.map((h) => (
                      <p key={h}>{h}</p>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>
          );
        })}

        {showSearch && (
          <div ref={searchBlockRef}>
            <AddonSearch
              group={searchGroup}
              otherGroups={questionGroups}
              selected={searchGroup ? (selections[searchGroup.id] ?? []) : []}
              isPicked={(groupId, optionId) => (selections[groupId] ?? []).some((o) => o.id === optionId)}
              onToggle={toggleOption}
              onRevealGroup={pointToGroup}
              onGoToNotes={goToNotes}
              onFocusInput={() => scrollSheetTo(searchBlockRef.current)}
              findOnMenu={isEditing ? undefined : findOnMenu}
              queued={queuedNext}
              onQueue={onQueueNext}
              onUnqueue={onUnqueueNext}
              fmtPrice={fmtPrice}
              t={t}
              locale={locale}
              defaultLocale={defaultLocale}
            />
          </div>
        )}

        {/* ── Free-text note for this line ──
            Deliberately last, after every modifier group: the structured options
            are what the kitchen can price and route, so the diner should meet
            them first and reach for prose only for what they don't cover
            ("no pickles", "gravy on the side"). Placing it earlier invites people
            to type requests that already exist as a tappable option. */}
        <div className="px-5 pt-4">
          <label
            htmlFor="item-notes"
            className="block text-[17px] font-semibold leading-snug text-gray-900 mb-3 border-t border-gray-100 pt-4"
          >
            {t.itemNotesLabel}
          </label>
          <textarea
            ref={notesRef}
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
            <p className="mt-1 text-[12px] text-gray-500 text-right tabular-nums">
              {notes.length}/200
            </p>
          )}
          {noteChips.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {noteChips.map((chip) => {
                const on = noteHasChip(notes, chip);
                return (
                  <button
                    key={chip}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      resetAdded();
                      setNotes((n) => toggleNoteChip(n, chip));
                    }}
                    className={cn(
                      "inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full border text-[14px] transition-colors",
                      on
                        ? "border-[#05c8a7] bg-[#e6faf7] text-[#04241E] font-semibold"
                        : "border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100",
                    )}
                  >
                    {on ? (
                      <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} aria-hidden="true" />
                    )}
                    {chip}
                  </button>
                );
              })}
            </div>
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
            <div className="mb-3 px-5">
              <h4 className="text-[17px] font-semibold leading-snug text-gray-900">
                {t.goesWellWith}
              </h4>
              <p className="mt-1 text-[13px] text-gray-600">{t.goesWellWithSub}</p>
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
                      <p className="text-[14px] font-medium text-gray-900 line-clamp-2 leading-tight mb-1">
                        {tName(p, locale, defaultLocale)}
                      </p>
                      <span className="text-[14px] font-semibold text-gray-800 tabular-nums">
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
    </>
  );

  // Phone and tablet: one scroll — photo, name, then the options.
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
      {renderHeroMedia(false)}
      {heroText}
      {optionsContent}
    </div>
  );

  const previewBadge = (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d0f7f1] text-[#047a65] text-[11px] font-bold uppercase tracking-wider">
      {locale === "es" ? "Vista previa" : "Preview"}
    </span>
  );

  const closeButtonClass =
    "w-11 h-11 flex items-center justify-center rounded-full flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] focus-visible:ring-offset-1";

  // Floating handle + X over the photo, and the compact header that replaces
  // them once the title scrolls away. Both drag the sheet on mobile
  // (startSheetDrag ignores the X itself).
  const sheetChrome = (
    <>
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 flex items-center gap-3 pl-5 pr-1.5 bg-white border-b border-gray-100 select-none transition-opacity duration-150",
          titleHidden ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{ height: COMPACT_HEADER_PX, touchAction: "none" }}
        onPointerDown={isDesktop ? undefined : startSheetDrag}
        aria-hidden={!titleHidden}
      >
        <p className="min-w-0 flex-1 truncate text-[16px] font-semibold text-gray-900">
          {displayName}
        </p>
        <span className="text-[15px] text-gray-600 tabular-nums flex-shrink-0">
          {fmtPrice(Number(product.price))}
        </span>
        <button
          type="button"
          onClick={onClose}
          tabIndex={titleHidden ? 0 : -1}
          aria-label={t.close}
          className={cn(closeButtonClass, "active:bg-gray-100 hover:bg-gray-100")}
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {!titleHidden && (
        <>
          {!isDesktop && (
            <div
              className="absolute inset-x-0 top-0 z-10 h-7 flex justify-center pt-2 cursor-grab active:cursor-grabbing"
              onPointerDown={startSheetDrag}
              style={{ touchAction: "none" }}
            >
              <div
                className={cn(
                  "w-10 h-1 rounded-full",
                  hasHero ? "bg-white/85 shadow-sm" : "bg-gray-300",
                )}
              />
            </div>
          )}
          {isPreview && <div className="absolute left-4 top-3 z-10">{previewBadge}</div>}
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className={cn(
              closeButtonClass,
              "absolute right-3 z-10",
              // Over a photo it needs its own white disc to read; on a plain
              // white strip that disc just floats, so it goes quiet grey.
              hasHero && !isDesktop
                ? "top-3 bg-white/95 shadow-md active:bg-gray-100 hover:bg-white"
                : "top-1.5 bg-gray-100 active:bg-gray-200 hover:bg-gray-200",
            )}
          >
            <X className="w-5 h-5 text-gray-900" />
          </button>
        </>
      )}
    </>
  );

  const sheetFooter = isPreview ? null : (
    <div className="border-t border-gray-100 flex-shrink-0 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="px-5 py-4">
        {unavailable ? (
          <p
            role="status"
            className="h-[52px] px-4 flex items-center justify-center rounded-2xl bg-gray-100 text-[15px] font-semibold text-gray-700 text-center"
          >
            {product.unavailable_note ?? t.soldOut}
          </p>
        ) : (
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-xl">
            <button
              onClick={() => {
                resetAdded();
                setQty(Math.max(1, qty - 1));
              }}
              aria-label={t.decreaseQuantity}
              className="w-11 h-11 flex items-center justify-center rounded-l-xl active:bg-gray-200 transition-colors"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <span className="w-10 text-center font-semibold text-base tabular-nums" aria-live="polite">
              {qty}
            </span>
            <button
              onClick={() => {
                resetAdded();
                setQty(qty + 1);
              }}
              aria-label={t.increaseQuantity}
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
                className="flex-1 h-[52px] rounded-2xl font-bold text-[15px] bg-[#05c8a7] text-[#04241E] transition-all duration-200 active:scale-[0.98]"
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
                "flex-1 min-w-0 h-[52px] px-3 flex items-center justify-center gap-1.5 rounded-2xl font-bold whitespace-nowrap bg-[#05c8a7] text-[#04241E] transition-all duration-200 active:scale-[0.98] shadow-sm hover:bg-[#04b096]",
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
        )}
      </div>
    </div>
  );

  // Desktop: two columns. The dish (4:3 photo, name, price, description) stays
  // put on the left while the options scroll on the right with the Add bar
  // under them — 2.9 screens instead of 4.9 in the 520px side panel, and the
  // name never has to be repeated in a header.
  // Without a photo the left column was a name over ~500px of white (Pedro,
  // 2026-11-17: "Sex on the Beach" looked broken). One narrower column instead.
  const desktopBody = !hasHero ? (
    <div className="flex flex-col flex-1 min-h-0">
      <div ref={bodyScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-6">
        <div className="pr-14">{heroText}</div>
        {optionsContent}
      </div>
      {sheetFooter}
    </div>
  ) : (
    <div className="flex flex-1 min-h-0">
      <div className="w-[380px] flex-shrink-0 border-r border-gray-100 overflow-y-auto">
        {renderHeroMedia(true)}
        <div className={hasHero ? "pt-1" : "pt-6"}>{heroText}</div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div
          ref={bodyScrollRef}
          className="flex-1 overflow-y-auto overscroll-contain pt-10"
        >
          {optionsContent}
        </div>
        {sheetFooter}
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

      {/* Desktop: centred two-column modal */}
      {isDesktop && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="customization-dialog-title"
          className={cn(
            "fixed left-1/2 top-1/2 bg-white flex flex-col overflow-hidden rounded-[20px] shadow-[0_24px_80px_rgba(0,0,0,0.22)]",
            hasHero
              ? "w-[min(920px,calc(100vw-64px))] h-[min(720px,calc(100dvh-56px))]"
              : "w-[min(600px,calc(100vw-64px))] max-h-[min(720px,calc(100dvh-56px))]",
          )}
          style={{ x: "-50%", y: "-50%" }}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={springTransition}
        >
          {sheetChrome}
          {desktopBody}
        </motion.div>
      )}

      {/* Mobile: full-screen sheet from bottom with drag-to-dismiss */}
      {!isDesktop && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="customization-dialog-title"
          className="fixed left-0 right-0 bottom-0 bg-white flex flex-col overflow-hidden shadow-2xl rounded-t-2xl max-h-[92dvh]"
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
          {sheetChrome}
          {sheetBody}
          {sheetFooter}
        </motion.div>
      )}
    </div>
  );
}
