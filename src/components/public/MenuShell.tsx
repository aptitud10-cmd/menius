"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Clock,
  Heart,
  Star,
  ArrowLeft,
  ArrowUp,
  Search,
  Globe,
  RotateCcw,
  AlertCircle,
  AlignJustify,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useCartStore } from "@/store/cartStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { formatPrice, cn } from "@/lib/utils";
import { getTranslations, type Locale } from "@/lib/translations";
import type {
  Restaurant,
  Category,
  Product,
  OrderType,
  DietaryTag,
} from "@/types";
import { DIETARY_TAGS, getTagConfig } from "@/lib/dietary-tags";
import { getLocaleFlag, SUPPORTED_LOCALES, tName, tDesc } from "@/lib/i18n";
import { searchMenu, suggestedCategories } from "@/lib/menu-search";
import { trackEvent } from "@/lib/analytics";

import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabaseLoader } from "@/lib/image-loader";
import { StoreConfigProvider } from "@/lib/store-config-context";
import { getStoreOverrides } from "@/lib/store-overrides";
import { useNaturalSearch } from "@/lib/hooks/useNaturalSearch";
import {
  useBackToClose,
  unwindOverlayHistory,
} from "@/hooks/use-back-to-close";
import { MenuHeader, HEADER_HEIGHT } from "./MenuHeader";
import { CategorySidebar } from "./CategorySidebar";
import { ProductCard } from "./ProductCard";
import { ProductRow } from "./ProductRow";
import { splitByDisplay, showsAsRow } from "@/lib/product-display";
import {
  collapseToGroups,
  resolveActivePill,
  isGroupId,
  groupNameFromId,
} from "@/lib/category-groups";
import { CartPanel } from "./CartPanel";
import dynamic from "next/dynamic";
const CustomizationSheet = dynamic(
  () => import("./CustomizationSheet").then((m) => m.CustomizationSheet),
  { ssr: false },
);
const RepeatOrderButton = dynamic(() => import("./RepeatOrderButton"), {
  ssr: false,
});
import { InstallBanner } from "./InstallBanner";
import { registerVisit } from "@/lib/recurring-visitor";
import { MenuErrorBoundary } from "./MenuErrorBoundary";
import { ReservationWidget } from "./ReservationWidget";
import { MenuUpdateBanner } from "./MenuUpdateBanner";
import { CartFlyParticles } from "./CartFlyParticles";
interface ReviewStats {
  average: number;
  total: number;
}

interface ReviewItem {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface LimitedMode {
  ordersToday: number;
  dailyLimit: number;
}

interface MenuShellProps {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  tableName: string | null;
  locale?: Locale;
  availableLocales?: string[];
  backUrl?: string;
  reviewStats?: ReviewStats | null;
  recentReviews?: ReviewItem[];
  limitedMode?: LimitedMode | null;
  isFreePlan?: boolean;
}

interface CustomizationTarget {
  product: Product;
  editIndex: number | null;
}

const POPULAR_ID = "__popular__";
/** Prefijo de stockOutAlert: el texto se muestra tal cual, sin la plantilla "«X» ya no está disponible". */
const RAW_ALERT = "\u0001";
// A remembered menu position older than this is a different visit, not a
// "back from checkout" — land on the default view instead.
const MENU_POS_TTL_MS = 30 * 60 * 1000;

export function MenuShell({
  restaurant,
  categories,
  products,
  tableName,
  locale: initialLocale = "es",
  availableLocales: availableLocalesRaw,
  backUrl,
  reviewStats,
  recentReviews,
  limitedMode,
  isFreePlan = false,
}: MenuShellProps) {
  const router = useRouter();
  const defaultLocale = initialLocale;
  const availableLocales = availableLocalesRaw ?? [initialLocale];
  const hasMultiLang = availableLocales.length > 1;
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const t = getTranslations(locale);
  const currency = restaurant.currency;
  const fmtPrice = useCallback(
    (price: number) => formatPrice(price, currency),
    [currency],
  );

  const setRestaurantId = useCartStore((s) => s.setRestaurantId);
  const setTableName = useCartStore((s) => s.setTableName);
  const rawCartCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.qty, 0),
  );
  const rawCartTotal = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.lineTotal, 0),
  );
  const setOpen = useCartStore((s) => s.setOpen);
  const isOpen = useCartStore((s) => s.isOpen);
  const addItem = useCartStore((s) => s.addItem);

  const cartDragControls = useDragControls();

  const [hasMounted, setHasMounted] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [reorderDismissed, setReorderDismissed] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState<{
    points: number;
    config: { min_redeem_points: number; peso_per_point: number } | null;
  } | null>(null);
  const savedCustomer = useCheckoutStore((s) => s.customer);
  const isReturningCustomer = useCheckoutStore((s) => s.isReturningCustomer);
  const [recommendations, setRecommendations] = useState<{
    last_order: {
      product_id: string;
      name: string;
      price: number;
      image_url: string | null;
      category_id: string;
      has_modifiers: boolean;
    } | null;
    suggested: Array<{
      product_id: string;
      name: string;
      price: number;
      image_url: string | null;
      category_id: string;
      has_modifiers: boolean;
    }>;
  } | null>(null);
  const [cartResumeShown, setCartResumeShown] = useState(false);
  const [tableBannerDismissed, setTableBannerDismissed] = useState(false);
  const [activeTableName, setActiveTableName] = useState<string | null>(null);

  const lastOrder = useCartStore((s) => s.lastOrder);
  const reorder = useCartStore((s) => s.reorder);

  const showReorderBanner =
    hasMounted &&
    !reorderDismissed &&
    rawCartCount === 0 &&
    !!lastOrder &&
    lastOrder.restaurantId === restaurant.id &&
    lastOrder.items.length > 0;

  // Cliente recurrente → candidato a instalar la PWA. Volvió 2+ veces a este
  // restaurante, o ya pidió acá antes (lastOrder del mismo restaurante).
  const isRecurringVisitor =
    hasMounted &&
    (visitCount >= 2 ||
      (!!lastOrder &&
        lastOrder.restaurantId === restaurant.id &&
        lastOrder.items.length > 0));

  const handleReorder = useCallback(() => {
    const added = reorder(products);
    if (added > 0) {
      setReorderDismissed(true);
      setOpen(true);
    }
  }, [reorder, products, setOpen]);

  // "Pedir lo mismo" desde el seguimiento: llega con ?reorder=1 y el pedido ya
  // guardado como último pedido → se pone en el carrito una sola vez.
  const reorderParamDone = useRef(false);
  useEffect(() => {
    if (!hasMounted || reorderParamDone.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('reorder') !== '1') return;
    reorderParamDone.current = true;
    if (lastOrder?.restaurantId === restaurant.id && lastOrder.items.length > 0) handleReorder();
    params.delete('reorder');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [hasMounted, lastOrder, restaurant.id, handleReorder]);

  const enabledOrderTypes: OrderType[] = restaurant.order_types_enabled?.length
    ? restaurant.order_types_enabled
    : ["dine_in", "pickup", "delivery"];

  useEffect(() => {
    setHasMounted(true);
    setVisitCount(registerVisit(restaurant.id));
    setRestaurantId(restaurant.id);
    // tableName comes from the server as null (page is static); read ?table= from URL on client
    const resolvedTable =
      tableName ?? new URLSearchParams(window.location.search).get("table");
    setTableName(resolvedTable);
    setActiveTableName(resolvedTable);

    // Prefetching /checkout on mount put a second page's JS on the wire while
    // the menu was still painting — on 4G that competes directly with the LCP
    // image. Wait for idle: by the time anyone has picked a dish and tapped the
    // cart, the prefetch has long finished, so nothing is lost.
    // typeof rather than `in`: lib.dom declares requestIdleCallback as always
    // present, so `in` narrows window to never in the Safari fallback branch.
    const prefetchCheckout = () => router.prefetch(`/${restaurant.slug}/checkout`);
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = hasIdle
      ? window.requestIdleCallback(prefetchCheckout, { timeout: 4000 })
      : window.setTimeout(prefetchCheckout, 2500);

    // If returning customer has items in cart, show a brief "resume cart" toast
    const stored = useCartStore.getState();
    let resumeTimer: number | undefined;
    if (stored.restaurantId === restaurant.id && stored.items.length > 0) {
      setCartResumeShown(true);
      resumeTimer = window.setTimeout(() => setCartResumeShown(false), 4000);
    }

    return () => {
      if (hasIdle) {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
      if (resumeTimer !== undefined) window.clearTimeout(resumeTimer);
    };
  }, [
    restaurant.id,
    restaurant.slug,
    tableName,
    setRestaurantId,
    setTableName,
    router,
  ]);

  useEffect(() => {
    if (!hasMounted || !isReturningCustomer() || !savedCustomer?.phone) return;
    const digits = savedCustomer.phone.replace(/\D/g, "");
    if (digits.length < 7) return;
    fetch(
      `/api/public/loyalty/balance?phone=${encodeURIComponent(savedCustomer.phone)}&restaurant_id=${restaurant.id}`,
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data.points === "number")
          setLoyaltyData({ points: data.points, config: data.config ?? null });
      })
      .catch(() => {});
  }, [hasMounted, restaurant.id, savedCustomer, isReturningCustomer]);

  useEffect(() => {
    if (!hasMounted || !isReturningCustomer()) return;
    const phone = savedCustomer?.phone;
    const email = savedCustomer?.email;
    if (!phone && !email) return;
    const params = new URLSearchParams({ restaurant_id: restaurant.id });
    if (phone) params.set("phone", phone);
    if (email) params.set("email", email);
    fetch(`/api/public/recommendations?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        // Solo se muestra "Pedir de nuevo"; las sugerencias ya no se pintan.
        if (data?.last_order) setRecommendations(data);
      })
      .catch(() => {});
  }, [hasMounted, restaurant.id, savedCustomer, isReturningCustomer]);

  const cartCount = hasMounted ? rawCartCount : 0;
  const cartTotal = hasMounted ? rawCartTotal : 0;

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCatSheet, setShowCatSheet] = useState(false);
  const [showSubcatSheet, setShowSubcatSheet] = useState(false);
  const CATEGORY_PREVIEW = 8; // kept for potential future use
  // Activated automatically for stores with many products or categories (e.g. Buccaneer)
  const isLargeCatalog = products.length > 80 || categories.length > 12;
  const isDemo = restaurant.id.startsWith("demo");
  const storeConfig = getStoreOverrides(restaurant.slug);
  const showScrollTopPill = Boolean(storeConfig.showScrollTop);
  const [activeCatFilter, setActiveCatFilter] = useState<string | null>(null);
  const [showFavs, setShowFavs] = useState(false);
  const favIds = useFavoritesStore((s) => s.getIds(restaurant.id));
  const [activeDiet, setActiveDiet] = useState<DietaryTag | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [customization, setCustomization] =
    useState<CustomizationTarget | null>(null);
  const customizationRef = useRef(customization);
  customizationRef.current = customization;
  // True while a product opened from search results is on screen: the search
  // overlay (z-70) stays mounted underneath — closing the product returns to
  // the results — so it must drop below the product sheet (z-50) meanwhile.
  const [searchBehindSheet, setSearchBehindSheet] = useState(false);
  // Ordered list of product IDs from data-driven suggestions (pairings + co-occurrence)
  const [dataBasedSuggestionIds, setDataBasedSuggestionIds] = useState<
    string[]
  >([]);
  const [toastName, setToastName] = useState<string | null>(null);
  const [stockOutAlert, setStockOutAlert] = useState<string | null>(null);
  // Realtime in_stock overrides: updated live without page reload
  const [stockOverrides, setStockOverrides] = useState<Map<string, boolean>>(
    new Map(),
  );
  // Realtime pause state: updated live when restaurant pauses orders
  const [pausedUntil, setPausedUntil] = useState<string | null>(
    () => restaurant.orders_paused_until ?? null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stockAlertTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);
  const desktopPillsRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  // A lightweight boolean state just to trigger scroll-listener effects once the
  // scroll container mounts. Using a full HTMLElement state caused an unnecessary
  // full re-render of the entire ~2000-line component on every mount.
  const [mainMounted, setMainMounted] = useState(false);
  const mainRefCb = useCallback((node: HTMLElement | null) => {
    mainRef.current = node;
    if (node) setMainMounted(true);
  }, []);
  const mobilePillsRef = useRef<HTMLDivElement>(null);
  // True while user has a pointer/touch active on the pills bar — prevents auto-scroll from
  // fighting the user's horizontal swipe gesture (which caused the bounce/return effect).
  const pillsTouchActiveRef = useRef(false);
  // Timer to delay resetting pillsTouchActiveRef after pointer-up, so iOS momentum scrolling
  // on the main content div (which triggers scroll-spy) doesn't immediately snap pills back.
  const pillsUpTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Debounce timer for scroll-spy-triggered pill bar auto-scroll.
  // Coalesces rapid activeCategory changes (60fps during fast scroll) into a single
  // movement after the user slows down — eliminates the "rapid jumping" artefact.
  const pillBarScrollTimerRef =
    useRef<ReturnType<typeof setTimeout>>(undefined);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrollingRef = useRef(false);
  // Sidebar ref — used to auto-scroll sidebar to active category and to
  // preserve sidebar scroll position when the user clicks a category.
  const sidebarRef = useRef<HTMLElement | null>(null);
  // True when activeCategory changed because the user CLICKED (not because of scroll-spy).
  // Prevents the horizontal pill bar from auto-scrolling on click, which looks jarring.
  const categoryClickedRef = useRef(false);
  // True while the banner element is at least partially visible in the scroll container.
  // Tracked by IntersectionObserver — always accurate, no timing issues.
  const bannerVisibleRef = useRef(true);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const hasCover = !!restaurant.cover_image_url;
  // Initialize synchronously from window so desktop users never see the mobile flash.
  // The SSR/hydration mismatch risk is acceptable here: isDesktopView only affects JS
  // scroll-logic, not JSX layout (layout is controlled by Tailwind `lg:` CSS classes).
  const [isDesktopView, setIsDesktopView] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024,
  );
  // xl (≥1280) shows the cart as a persistent column and hides the cart sheet
  // (xl:hidden). Tracked so back-to-close never pushes a history entry for an
  // overlay that isn't on screen — back would then "close" something invisible.
  const [isXlView, setIsXlView] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1280,
  );
  useEffect(() => {
    const check = () => {
      setIsDesktopView(window.innerWidth >= 1024);
      setIsXlView(window.innerWidth >= 1280);
    };
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /**
   * Skip per-card Framer Motion on mobile for large catalogs.
   * Not gated on hasMounted: SSR renders isDesktopView=false, so server and a
   * mobile client agree on the plain <div> from the first paint. Gating on
   * mount swapped <motion.div> for <div> after hydration, which unmounted and
   * remounted every card — images reset to opacity-0 and flashed back in.
   */
  const lightMobileProductGrid = isLargeCatalog && !isDesktopView;

  // NOTE: useBodyScrollLock is intentionally NOT used here.
  // Menius scrolls via mainRef (a custom div), not document.body — window.scrollY is always 0.
  // Applying position:fixed to body on iOS shifts the visual viewport, which breaks the
  // scroll-spy getBoundingClientRect() calculations and causes the pill bounce-back effect.

  // Realtime: notify customer if a cart item goes out of stock (86'd)
  useEffect(() => {
    if (!restaurant.id) return;

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`products-stock-${restaurant.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "products",
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (
          payload: RealtimePostgresChangesPayload<{
            id: string;
            name: string;
            in_stock: boolean;
          }>,
        ) => {
          const updated = payload.new as {
            id: string;
            name: string;
            in_stock: boolean;
          };
          // Always update the displayed badge in real-time
          setStockOverrides((prev) => {
            const next = new Map(prev);
            next.set(updated.id, updated.in_stock);
            return next;
          });
          // Remove from cart if product went out of stock
          if (updated.in_stock === false) {
            const storeState = useCartStore.getState();
            const idxToRemove = storeState.items
              .map((i, idx) => ({ id: i.product.id, idx }))
              .filter((x) => x.id === updated.id);
            if (idxToRemove.length > 0) {
              [...idxToRemove]
                .reverse()
                .forEach(({ idx }) => storeState.removeItem(idx));
              clearTimeout(stockAlertTimer.current);
              setStockOutAlert(updated.name);
              stockAlertTimer.current = setTimeout(
                () => setStockOutAlert(null),
                6000,
              );
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  // Realtime: detect orders_paused_until changes without requiring page reload.
  //
  // Opened on idle rather than on mount. Two WebSockets racing the first paint
  // consume Supabase realtime connections for people who are only browsing, and
  // this one only matters once someone tries to order — unlike the stock channel
  // above, which drives the "sold out" badges you can see straight away.
  useEffect(() => {
    if (!restaurant.id) return;

    let channel: ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null = null;
    let cancelled = false;

    const open = () => {
      if (cancelled) return;
      const supabase = getSupabaseBrowser();
      channel = supabase
        .channel(`restaurant-pause:${restaurant.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "restaurants",
            filter: `id=eq.${restaurant.id}`,
          },
          (
            payload: RealtimePostgresChangesPayload<{
              orders_paused_until: string | null;
            }>,
          ) => {
            setPausedUntil(
              (payload.new as { orders_paused_until: string | null })
                .orders_paused_until ?? null,
            );
          },
        )
        .subscribe();
    };

    const hasIdle = typeof window.requestIdleCallback === "function";
    const idleId = hasIdle
      ? window.requestIdleCallback(open, { timeout: 5000 })
      : window.setTimeout(open, 2500);

    return () => {
      cancelled = true;
      if (hasIdle) {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
      if (channel) getSupabaseBrowser().removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  // Stale-cart guard: when fresh product data loads, check if any cart item is
  // missing required modifier selections. If the product now has required groups
  // that weren't configured when the item was added (stale localStorage data),
  // remove those items silently so they don't cause "Selecciona al menos..." errors.
  useEffect(() => {
    if (!products || products.length === 0) return;
    const freshProductMap = new Map(products.map((p) => [p.id, p]));
    const store = useCartStore.getState();
    // Solo contra el menú de la MISMA tienda (si no, todo parecería "borrado").
    if (store.restaurantId && store.restaurantId !== restaurant.id) return;
    const idxToRemove: number[] = [];
    const goneNames: string[] = [];

    store.items.forEach((item, idx) => {
      const fresh = freshProductMap.get(item.product.id);
      // W4 — el plato ya no está en el menú (borrado/desactivado) o se agotó:
      // antes quedaba en el carrito guardado y el error recién saltaba al
      // confirmar ("Un producto de tu carrito ya no está en el menú").
      if (!fresh || fresh.in_stock === false) {
        idxToRemove.push(idx);
        goneNames.push(item.product.name);
        return;
      }
      const freshGroups = fresh.modifier_groups ?? [];
      // If products are slimmed (modifier_groups=[]), use has_modifiers as a proxy.
      // We skip the detailed validation when we can't inspect individual groups —
      // CustomizationSheet will enforce required selections before allowing add-to-cart.
      if (!fresh.has_modifiers && freshGroups.length === 0) return;
      const requiredGroups = freshGroups.filter(
        (g: any) => g.is_required && (g.options?.length ?? 0) > 0,
      );
      if (requiredGroups.length === 0) return;

      // Check if any required group is missing from the item's modifier selections
      const missingGroup = requiredGroups.some((g: any) => {
        const sel = (item.modifierSelections ?? []).find(
          (ms) => ms.group.id === g.id || ms.group.name === g.name,
        );
        return !sel || sel.selectedOptions.length === 0;
      });

      if (missingGroup) idxToRemove.push(idx);
    });

    if (idxToRemove.length > 0) {
      // Remove in reverse order to preserve indices
      [...idxToRemove].reverse().forEach((idx) => store.removeItem(idx));
      // Con nombres → "«X» ya no está disponible". Sin nombres (faltaban
      // opciones obligatorias) → su propio mensaje, sin esa plantilla.
      setStockOutAlert(goneNames.length > 0 ? goneNames.join(", ") : RAW_ALERT + t.itemsUpdatedAlert);
      stockAlertTimer.current = setTimeout(() => setStockOutAlert(null), 8000);
    }
    // Run once when products stabilize (restaurant load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  // Fetch data-driven suggestions (manual pairings first, then co-occurrence)
  useEffect(() => {
    const productId = customization?.product?.id;
    if (!productId) {
      setDataBasedSuggestionIds([]);
      return;
    }
    let cancelled = false;
    const supabase = getSupabaseBrowser();

    async function fetchSuggestions() {
      try {
        // Fetch pairings and co-occurrence in parallel
        const [{ data: pairingRows }, { data: coRows }] = await Promise.all([
          supabase
            .from("product_pairings")
            .select("paired_id, sort_order")
            .eq("product_id", productId)
            .order("sort_order", { ascending: true }),
          supabase.rpc("get_product_cooccurrences", {
            p_product_id: productId,
            p_restaurant_id: restaurant.id,
            p_limit: 8,
          }),
        ]);

        const pairingIds: string[] = (pairingRows ?? []).map(
          (r: { paired_id: string }) => r.paired_id,
        );
        const pairingSet = new Set(pairingIds);
        const coIds: string[] = (coRows ?? [])
          .map((r: { product_id: string }) => r.product_id)
          .filter((id: string) => !pairingSet.has(id));

        if (!cancelled) {
          setDataBasedSuggestionIds([...pairingIds, ...coIds]);
        }
      } catch {
        // Non-critical — regex fallback will still be used
      }
    }

    fetchSuggestions();
    return () => {
      cancelled = true;
    };
  }, [customization?.product?.id, restaurant.id]);

  const cartColRef = useRef<HTMLDivElement>(null);

  const getBannerHeight = useCallback(
    () => bannerRef.current?.offsetHeight ?? 0,
    [],
  );

  // IntersectionObserver: watch the banner element and keep bannerVisibleRef in sync.
  useEffect(() => {
    if (!bannerRef.current || !hasCover) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        bannerVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 },
    );
    observer.observe(bannerRef.current);
    return () => observer.disconnect();
  }, [hasCover]);

  /** Scrolls the main container to a category section.
   *  Extracted from handleCategorySelect so the subcategory sheet can jump to a
   *  section without re-implementing the iOS Safari workarounds below. */
  const scrollToSection = useCallback((catId: string) => {
      const section = sectionRefs.current.get(catId);
      if (section && mainRef.current) {
        const savedSidebarScroll = sidebarRef.current?.scrollTop ?? 0;

        isScrollingRef.current = true;

        // Compute sticky header offset (how many px of UI cover the top of the scroll area).
        const isDesktop =
          typeof window !== "undefined" && window.innerWidth >= 1024;
        const margin = isDesktop
          ? (desktopPillsRef.current?.offsetHeight ?? 44)
          : HEADER_HEIGHT + (mobilePillsRef.current?.offsetHeight ?? 52);

        // Manual scrollTo instead of scrollIntoView: scrollIntoView on iOS Safari
        // sometimes scrolls `window` rather than the actual scroll container, causing
        // the page to jump unexpectedly. This calculates the exact target offset on
        // mainRef and scrolls it directly.
        const sectionTop = section.getBoundingClientRect().top;
        const containerTop = mainRef.current.getBoundingClientRect().top;
        // The scroll-spy uses `threshold = containerTop + margin - 8` to detect active sections.
        // We overshoot by 8px so the section lands exactly at the threshold after the animation,
        // preventing the spy from reverting to the previous category (the "bounce-back" effect).
        const targetScroll =
          mainRef.current.scrollTop + sectionTop - containerTop - margin + 8;
        mainRef.current.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: "smooth",
        });

        requestAnimationFrame(() => {
          if (sidebarRef.current)
            sidebarRef.current.scrollTop = savedSidebarScroll;
        });

        // Unlock scroll-spy when the animation ends; fall back to 1.5 s.
        // (scrollend is not supported on iOS Safari < 16.4 — the timeout is the safety net.)
        // 1.5s covers long pages where iOS smooth-scroll can take > 1s.
        const unlock = () => {
          isScrollingRef.current = false;
        };
        const timer = setTimeout(unlock, 1500);
        mainRef.current.addEventListener(
          "scrollend",
          () => {
            clearTimeout(timer);
            unlock();
          },
          { once: true },
        );
      }
  }, []);

  // Large catalog: the keyed list of the active category, and the mobile sticky
  // bars that cover the top of the scroller. Used to land a category change at
  // the start of its list instead of wherever the previous one was scrolled to.
  const catListRef = useRef<HTMLDivElement>(null);
  const mobilePillsBarRef = useRef<HTMLDivElement>(null);
  const mobileDietBarRef = useRef<HTMLDivElement>(null);
  // Bumped on every category pick (even re-picking the same one), so the
  // effect below runs after React has committed the new list.
  const [catScrollRequest, setCatScrollRequest] = useState(0);

  useEffect(() => {
    if (catScrollRequest === 0) return;
    const main = mainRef.current;
    const list = catListRef.current;
    if (!main || !list) return;
    // Bottom edge of a sticky bar once pinned, relative to the scroller. A
    // hidden bar (lg:hidden on desktop, lg-only on mobile) has offsetHeight 0.
    const pinnedBottom = (el: HTMLElement | null) => {
      if (!el || el.offsetHeight === 0) return 0;
      const top = parseFloat(window.getComputedStyle(el).top) || 0;
      return top + el.offsetHeight;
    };
    const covered = Math.max(
      pinnedBottom(mobilePillsBarRef.current),
      pinnedBottom(mobileDietBarRef.current),
      pinnedBottom(desktopPillsRef.current),
    );
    // The list mounts with the menu-cat-fade animation (translateY 10px → 0);
    // getBoundingClientRect includes that transform, so remove it to measure
    // the resting position.
    let animOffset = 0;
    const transform = window.getComputedStyle(list).transform;
    if (transform && transform !== "none") {
      try {
        animOffset = new DOMMatrixReadOnly(transform).m42;
      } catch {
        animOffset = 0;
      }
    }
    const target =
      main.scrollTop +
      list.getBoundingClientRect().top -
      animOffset -
      main.getBoundingClientRect().top -
      covered -
      12;
    // Only move when the user is deeper than the list start. Above it (banner
    // or restaurant info still on screen) the new list already starts in view,
    // so jumping would just hide the hero for nothing. Before this, a change
    // made with the banner scrolled away kept the old scrollTop and dropped
    // the customer in the middle of the new category.
    if (main.scrollTop > target) {
      main.scrollTo({ top: Math.max(0, target), behavior: "auto" });
    }
  }, [catScrollRequest]);

  // ── Menu position memory (category + scroll) ──
  // Going to checkout unmounts the menu; coming back remounted it on "Popular"
  // at the top, so a customer adding one more drink had to find the category
  // again. Saved per restaurant in sessionStorage (this tab only) and restored
  // on mount — see the restore effects further down.
  const menuPosKey = `menius:menu-pos:${restaurant.slug}`;
  const activeCatFilterRef = useRef(activeCatFilter);
  activeCatFilterRef.current = activeCatFilter;
  // Saving is off until the restore has run: the first scroll event (at 0) and
  // the initial null filter would otherwise overwrite the snapshot being restored.
  const menuPosReadyRef = useRef(false);
  const saveMenuPosition = useCallback((scroller?: HTMLElement) => {
    if (!menuPosReadyRef.current) return;
    // `scroller` lets an unmount cleanup save: by then the ref is already null.
    const main = scroller ?? mainRef.current;
    if (!main) return;
    try {
      sessionStorage.setItem(
        menuPosKey,
        JSON.stringify({
          cat: activeCatFilterRef.current,
          top: Math.round(main.scrollTop),
          ts: Date.now(),
        }),
      );
    } catch {
      // Private mode / storage full: losing the position is harmless.
    }
  }, [menuPosKey]);

  useEffect(() => {
    saveMenuPosition();
  }, [activeCatFilter, saveMenuPosition]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    // Trailing throttle: one write per 300 ms of scrolling, not per frame.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (timer !== undefined) return;
      timer = setTimeout(() => {
        timer = undefined;
        saveMenuPosition();
      }, 300);
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      main.removeEventListener("scroll", onScroll);
      if (timer !== undefined) {
        // Flush the pending write — the last scroll before leaving matters most.
        clearTimeout(timer);
        saveMenuPosition(main);
      }
    };
  }, [mainMounted, saveMenuPosition]);

  const handleCategorySelect = useCallback(
    (catId: string | null) => {
      setSearchQuery("");
      setShowSearch(false);
      setShowFavs(false);
      setActiveDiet(null);

      // Mark as user-click so the horizontal pill bar doesn't auto-scroll
      categoryClickedRef.current = true;

      setActiveCategory(catId);

      if (catId === null) {
        mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (isLargeCatalog) {
        setActiveCatFilter(catId);
        // Close the jump sheet: its list belongs to the group being left.
        setShowSubcatSheet(false);
        // The scroll happens after the new category renders (effect on
        // catScrollRequest) — the list it measures doesn't exist yet here.
        setCatScrollRequest((n) => n + 1);
        return;
      }

      scrollToSection(catId);
    },
    [isLargeCatalog, scrollToSection],
  );

  const handleProductSelect = useCallback(
    (product: Product) => {
      trackEvent("product_viewed", {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        restaurant_id: restaurant.id,
        has_modifiers: product.has_modifiers,
      });
      setCustomization({ product, editIndex: null });
    },
    [restaurant.id],
  );

  // Search result tap: open the product OVER the search overlay instead of
  // closing search and wiping the query — closing the product (X, swipe or
  // system back) returns to the same results, like any native app. Search is
  // only cleared when the customer closes it explicitly.
  const openProductFromSearch = useCallback(
    (product: Product) => {
      // The input still has focus: without this the iOS keyboard stays up over
      // the product sheet (before, unmounting the overlay dismissed it).
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      setSearchBehindSheet(true);
      handleProductSelect(product);
    },
    [handleProductSelect],
  );

  const showToast = useCallback((name: string) => {
    clearTimeout(toastTimer.current);
    setToastName(name);
    toastTimer.current = setTimeout(() => setToastName(null), 2000);
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      if (audioCtxRef.current.state === "suspended")
        audioCtxRef.current.resume();
      const ctx = audioCtxRef.current;
      const t = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.18, t);
      master.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      master.connect(ctx.destination);
      const o1 = ctx.createOscillator();
      o1.frequency.setValueAtTime(880, t);
      o1.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
      o1.type = "sine";
      o1.connect(master);
      o1.start(t);
      o1.stop(t + 0.35);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.06, t + 0.06);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o2.frequency.value = 1760;
      o2.type = "sine";
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(t + 0.06);
      o2.stop(t + 0.25);
    } catch {}
    try {
      navigator.vibrate?.([30, 20, 15]);
    } catch {}
  }, []);

  const handleQuickAdd = useCallback(
    (product: Product) => {
      addItem(product, null, [], 1, "");
      showToast(product.name);
      trackEvent("product_added_to_cart", {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        restaurant_id: restaurant.id,
      });
    },
    [addItem, showToast, restaurant.id],
  );

  const handleEditCartItem = useCallback(
    (index: number) => {
      const items = useCartStore.getState().items;
      const item = items[index];
      if (item) {
        // Use the fresh product from the menu (includes up-to-date modifier_groups)
        // falling back to the cart snapshot if not found (e.g. product was deleted)
        const freshProduct =
          products.find((p) => p.id === item.product.id) ?? item.product;
        setCustomization({ product: freshProduct, editIndex: index });
      }
    },
    [products],
  );

  // Editing is entered from the cart sheet (which closes to make room), so
  // finishing the edit returns there — saved or cancelled — like popping a
  // screen in a native nav stack. Before, the customer was dropped on the menu
  // and had to reopen the cart to check the change. xl shows the cart as a
  // column, so there's nothing to reopen.
  const handleCloseCustomization = useCallback(() => {
    const wasEditing = customization !== null && customization.editIndex !== null;
    setCustomization(null);
    if (wasEditing && !isXlView) setOpen(true);
  }, [customization, isXlView, setOpen]);

  const handleViewCartFromCustomization = useCallback(() => {
    setCustomization(null);
    setOpen(true);
  }, [setOpen]);

  const handleOpenCheckout = useCallback(() => {
    trackEvent("checkout_started", {
      restaurant_id: restaurant.id,
      item_count: rawCartCount,
      total: rawCartTotal,
    });

    // So "back" from checkout lands on the same category and scroll position.
    saveMenuPosition();

    // Pop the overlay history entries (cart sheet) BEFORE pushing /checkout:
    // pushed on top of them, back from checkout would land on a dead overlay
    // entry and need a second tap. Must run before setOpen(false) so closing
    // the sheet doesn't issue its own history.back().
    const historySettled = unwindOverlayHistory();

    setOpen(false);

    void historySettled.then(() =>
      requestAnimationFrame(() => {
        const table = useCartStore.getState().tableName;
        const checkoutUrl = table
          ? `/${restaurant.slug}/checkout?table=${encodeURIComponent(table)}`
          : `/${restaurant.slug}/checkout`;
        router.push(checkoutUrl);
      }),
    );
  }, [
    router,
    restaurant.slug,
    restaurant.id,
    rawCartCount,
    rawCartTotal,
    setOpen,
    saveMenuPosition,
  ]);

  // ── System back closes overlays (see useBackToClose) ──
  // Each gate matches where the overlay is actually visible: the cart sheet and
  // the subcategory sheet are xl:hidden, search and the category sheet lg:hidden.
  const closeCart = useCallback(() => setOpen(false), [setOpen]);
  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
  }, []);
  const closeCatSheet = useCallback(() => setShowCatSheet(false), []);
  const closeSubcatSheet = useCallback(() => setShowSubcatSheet(false), []);
  useBackToClose(isOpen && !isXlView, closeCart);
  useBackToClose(showSearch && !isDesktopView, closeSearch);
  useBackToClose(showCatSheet && !isDesktopView, closeCatSheet);
  useBackToClose(showSubcatSheet && !isXlView, closeSubcatSheet);
  useBackToClose(customization !== null, handleCloseCustomization);

  const filteredProducts = useMemo(() => {
    const base = !activeDiet
      ? products
      : products.filter((p) => p.dietary_tags?.includes(activeDiet));
    if (stockOverrides.size === 0) return base;
    return base.map((p) => {
      const override = stockOverrides.get(p.id);
      return override !== undefined ? { ...p, in_stock: override } : p;
    });
  }, [products, activeDiet, stockOverrides]);

  const availableDietTags = useMemo(() => {
    const seen = new Set<DietaryTag>();
    for (const p of products) {
      if (p.dietary_tags) for (const tag of p.dietary_tags) seen.add(tag);
    }
    return DIETARY_TAGS.filter((t) => seen.has(t.id as DietaryTag));
  }, [products]);

  // Returns true if category has no schedule restriction or current time is within window
  const isCategoryAvailableNow = useCallback(
    (cat: { available_from?: string | null; available_to?: string | null }) => {
      if (!cat.available_from || !cat.available_to) return true;
      const now = new Date();
      const [fromH, fromM] = cat.available_from.split(":").map(Number);
      const [toH, toM] = cat.available_to.split(":").map(Number);
      const nowMins = now.getHours() * 60 + now.getMinutes();
      return nowMins >= fromH * 60 + fromM && nowMins <= toH * 60 + toM;
    },
    [],
  );

  const popularProducts = useMemo(() => {
    const inStock = filteredProducts.filter((p) => p.in_stock !== false);

    // Real sales data first — popularity_rank/orders_last_7d are filled weekly by
    // the recalc-popularity cron and until now only drove a badge on the card.
    // is_featured is the fallback: a new restaurant has no order history yet.
    const ranked = inStock
      .filter((p) => p.popularity_rank != null || (p.orders_last_7d ?? 0) > 0)
      .sort((a, b) => {
        const ra = a.popularity_rank ?? Number.MAX_SAFE_INTEGER;
        const rb = b.popularity_rank ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
        return (b.orders_last_7d ?? 0) - (a.orders_last_7d ?? 0);
      });

    const featured = inStock.filter(
      (p) => p.is_featured && !ranked.some((r) => r.id === p.id),
    );

    const merged = [...ranked, ...featured];
    // Cap for large catalogs to keep DOM lean
    return isLargeCatalog ? merged.slice(0, 10) : merged;
  }, [filteredProducts, isLargeCatalog]);

  const cartProductIds = useCartStore(
    (s) => new Set(s.items.map((i) => i.product.id)),
  );

  // Classifier shared between suggestedProducts and the data-merge below
  const classifyProduct = useCallback(
    (
      catName: string,
      productName: string,
    ): "drink" | "dessert" | "side" | "main" => {
      const text = `${catName} ${productName}`.toLowerCase();
      if (
        /bebida|bebidas|drink|drinks|refresco|soda|agua\b|jugo|jugos|juice|juices|cerveza|beer|vino|wine|shake|batido|batidos|caf[eé]|coffee|t[eé]\b|smoothie|smoothies|limon|milkshake|horchata|margarita|coctel|cocktail|limonada|frapp[eé]|cappuccino|latte|espresso|gatorade|red bull|energy|agua mineral|sparkling|kombucha|infusion|chai|matcha|mojito|sangria|michelada|tepache|agua fresca|jamaica|tamarindo|hibiscus|lemonade|limeade|iced tea|naranjada|fresco|fresca|refresco|zumo|beber|brebaje/i.test(
          text,
        )
      )
        return "drink";
      if (
        /postre|postres|dessert|desserts|helado|helados|ice cream|pastel|cake|brownie|dulce|sweet|cookie|tiramisú|flan|churro|cheesecake|mousse|pudding|gelato|sorbet|donut|muffin|crepe|waffle|tarta|pie|eclair|profiterole|macaron|tres leches|panna cotta|tiramisu|cannoli|semifreddo|paleta|gelatina|mazapán/i.test(
          text,
        )
      )
        return "dessert";
      if (
        /acompañ|acompañamiento|side|sides|ensalada|salad|sopa|soup|papa|fries|chips|guarnición|arroz|rice|wings|alitas|nachos|onion ring|mozzarella stick|guacamole|dip|coleslaw|breadstick|garlic bread|pan de ajo|bastones|elote|corn|coliflor|cauliflower|brócoli|broccoli|jalapeño|poppers|tater tot|yuca|plantain|patacón|tostón|boniato|camote|edamame|dumplings|gyoza|spring roll|rollo|extras?|adicional|complemento|entrante|entrada|appetizer|starter/i.test(
          text,
        )
      )
        return "side";
      return "main";
    },
    [],
  );

  // Smart cross-selling: data-driven (pairings + co-occurrence) → rule-based fallback
  const suggestedProducts = useMemo(() => {
    const mainProduct = customization?.product;
    if (!mainProduct) return [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    const isEligible = (p: Product) =>
      p.id !== mainProduct.id &&
      p.in_stock !== false &&
      !cartProductIds.has(p.id);

    // Time-of-day context: filter alcohol before noon
    const hour = new Date().getHours();
    const isBreakfastHour = hour >= 5 && hour < 11;
    const alcoholRegex =
      /cerveza|beer|vino|wine|margarita|coctel|cocktail|mojito|sangria|michelada|alcohol/i;
    const isAlcohol = (p: Product) =>
      alcoholRegex.test(
        `${p.name} ${categories.find((c) => c.id === p.category_id)?.name ?? ""}`,
      );

    const MAX_SUGGESTIONS = 12;

    // 1. Data-driven: pairings first, then co-occurrence
    const dataProducts: Product[] = dataBasedSuggestionIds
      .map((id) => productMap.get(id))
      .filter(
        (p): p is Product =>
          !!p && isEligible(p) && !(isBreakfastHour && isAlcohol(p)),
      )
      .slice(0, MAX_SUGGESTIONS);

    if (dataProducts.length >= MAX_SUGGESTIONS) return dataProducts;

    // 2. Regex fallback to pad remaining slots
    const seen = new Set(dataProducts.map((p) => p.id));
    const mainCat = categories.find((c) => c.id === mainProduct.category_id);
    const mainType = classifyProduct(mainCat?.name ?? "", mainProduct.name);

    const wantOrder: Array<"drink" | "dessert" | "side" | "main"> = (() => {
      if (mainType === "main") return ["drink", "side", "dessert"];
      if (mainType === "side") return ["drink", "main", "dessert"];
      if (mainType === "dessert") return ["drink", "main"];
      // drink → suggest food
      return ["main", "side", "dessert"];
    })();

    const remaining = MAX_SUGGESTIONS - dataProducts.length;

    const fallback = products
      .filter(
        (p) =>
          isEligible(p) &&
          !seen.has(p.id) &&
          !(isBreakfastHour && isAlcohol(p)),
      )
      .map((p) => {
        const cat = categories.find((c) => c.id === p.category_id);
        const pType = classifyProduct(cat?.name ?? "", p.name);
        const typeRank = wantOrder.indexOf(pType);
        // Products that don't match any wanted type get a low-priority score instead of being excluded
        const baseRank = typeRank === -1 ? wantOrder.length + 1 : typeRank;
        const featuredBoost = p.is_featured ? 0 : 3;
        const score = baseRank * 10 + featuredBoost;
        return { product: p, score };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, remaining)
      .map(({ product }) => product);

    return [...dataProducts, ...fallback];
  }, [
    customization?.product,
    products,
    categories,
    cartProductIds,
    dataBasedSuggestionIds,
    classifyProduct,
  ]);

  // Cart-based suggestions: regex-fallback only (data-driven needs an active anchor
  // in customization). Anchor is the most recently added cart item.
  const firstCartProductId = useCartStore(
    (s) => s.items[s.items.length - 1]?.product.id ?? null,
  );
  const cartBasedSuggestions = useMemo(() => {
    if (!firstCartProductId) return [];
    const anchor = products.find((p) => p.id === firstCartProductId);
    if (!anchor) return [];

    const hour = new Date().getHours();
    const isBreakfastHour = hour >= 5 && hour < 11;
    const alcoholRegex =
      /cerveza|beer|vino|wine|margarita|coctel|cocktail|mojito|sangria|michelada|alcohol/i;
    const isAlcohol = (p: Product) =>
      alcoholRegex.test(
        `${p.name} ${categories.find((c) => c.id === p.category_id)?.name ?? ""}`,
      );

    const anchorCat = categories.find((c) => c.id === anchor.category_id);
    const anchorType = classifyProduct(anchorCat?.name ?? "", anchor.name);
    const wantOrder: Array<"drink" | "dessert" | "side" | "main"> = (() => {
      if (anchorType === "main") return ["drink", "side", "dessert"];
      if (anchorType === "side") return ["drink", "main", "dessert"];
      if (anchorType === "dessert") return ["drink", "main"];
      return ["main", "side", "dessert"];
    })();

    return products
      .filter(
        (p) =>
          p.id !== anchor.id &&
          p.in_stock !== false &&
          !cartProductIds.has(p.id) &&
          !(isBreakfastHour && isAlcohol(p)),
      )
      .map((p) => {
        const cat = categories.find((c) => c.id === p.category_id);
        const pType = classifyProduct(cat?.name ?? "", p.name);
        const typeRank = wantOrder.indexOf(pType);
        const baseRank = typeRank === -1 ? wantOrder.length + 1 : typeRank;
        const featuredBoost = p.is_featured ? 0 : 3;
        return { product: p, score: baseRank * 10 + featuredBoost };
      })
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(({ product }) => product);
  }, [
    firstCartProductId,
    products,
    categories,
    cartProductIds,
    classifyProduct,
  ]);

  const handleCartSuggestionAdd = useCallback(
    (product: Product) => {
      if (
        (product.variants?.length ?? 0) > 0 ||
        (product.extras?.length ?? 0) > 0 ||
        product.has_modifiers
      ) {
        setCustomization({ product, editIndex: null });
        setOpen(false);
      } else {
        handleQuickAdd(product);
      }
    },
    [handleQuickAdd],
  );

  const itemsByCategory = useMemo(() => {
    const regular = categories
      .map((cat) => ({
        category: cat,
        items: filteredProducts.filter((p) => p.category_id === cat.id),
        available: isCategoryAvailableNow(cat),
      }))
      .filter((g) => g.items.length > 0);

    const popularGroup =
      popularProducts.length > 0
        ? [
            {
              category: {
                id: POPULAR_ID,
                restaurant_id: restaurant.id,
                name: t.popularItems,
                sort_order: -1,
                is_active: true,
                translations: {},
                created_at: "",
              } as Category,
              items: popularProducts,
              available: true,
            },
          ]
        : [];

    return [...popularGroup, ...regular];
  }, [
    categories,
    filteredProducts,
    isCategoryAvailableNow,
    popularProducts,
    restaurant.id,
    t.popularItems,
  ]);

  /** Whether this restaurant groups its categories (see categories.group_name). */
  const hasCategoryGroups = useMemo(
    () => categories.some((c) => !!c.group_name),
    [categories],
  );

  /** Single source of truth for "the pills show groups, not categories".
   *  Every consumer must gate on this — visibleCats, the sidebar and the
   *  sidebar's count have to agree, or the sidebar gets group entries while
   *  the pills still list categories. */
  const groupsActive = hasCategoryGroups && isLargeCatalog;

  // In large-catalog mode, show only the active-filtered category.
  // With no filter, land on "Popular" instead of dumping all 46 sections at once —
  // that wall of ~410 products is what the customer used to hit on arrival.
  const displayedGroups = useMemo(() => {
    if (!isLargeCatalog) return itemsByCategory;
    if (activeCatFilter) {
      // A group pill keeps every category of that group, each rendered as its
      // own subsection — that is what makes the 75 sandwiches readable.
      if (isGroupId(activeCatFilter)) {
        const grp = groupNameFromId(activeCatFilter);
        return itemsByCategory.filter((g) => g.category.group_name === grp);
      }
      return itemsByCategory.filter((g) => g.category.id === activeCatFilter);
    }
    const popular = itemsByCategory.find((g) => g.category.id === POPULAR_ID);
    return popular ? [popular] : itemsByCategory;
  }, [isLargeCatalog, activeCatFilter, itemsByCategory]);

  // ── Menu position restore (pairs with saveMenuPosition above) ──
  // Deep links that position the menu themselves win over the memory. Read on
  // the very first commit: the ?reorder handler strips the param from the URL
  // one render later, before the restore effect below gets to look.
  const skipMenuRestoreRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    skipMenuRestoreRef.current =
      params.get("reorder") === "1" || window.location.hash.length > 1;
  }, []);

  const [restoreScrollTop, setRestoreScrollTop] = useState<number | null>(
    null,
  );
  const menuRestoreCheckedRef = useRef(false);
  useEffect(() => {
    if (!mainMounted || menuRestoreCheckedRef.current) return;
    menuRestoreCheckedRef.current = true;
    if (skipMenuRestoreRef.current) {
      menuPosReadyRef.current = true;
      return;
    }
    let snap: { cat: string | null; top: number } | null = null;
    try {
      const raw = sessionStorage.getItem(menuPosKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        const p = parsed as { cat?: unknown; top?: unknown; ts?: unknown };
        if (
          typeof p.top === "number" &&
          typeof p.ts === "number" &&
          Date.now() - p.ts < MENU_POS_TTL_MS
        ) {
          snap = {
            cat: typeof p.cat === "string" ? p.cat : null,
            top: p.top,
          };
        }
      }
    } catch {
      snap = null;
    }
    if (!snap) {
      menuPosReadyRef.current = true;
      return;
    }
    // The saved category may have been deleted, emptied or hidden by a
    // schedule since — only restore it if the menu still renders it.
    const cat = snap.cat;
    if (isLargeCatalog && cat) {
      const exists = isGroupId(cat)
        ? itemsByCategory.some(
            (g) => g.category.group_name === groupNameFromId(cat),
          )
        : itemsByCategory.some((g) => g.category.id === cat);
      if (exists) {
        setActiveCatFilter(cat);
        setActiveCategory(cat);
      }
    }
    // Batched with the filter above: the scroll effect runs once that
    // category's list is committed.
    setRestoreScrollTop(snap.top);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainMounted]);

  useEffect(() => {
    if (restoreScrollTop === null) return;
    // Two frames: the first lets layout settle after the category swap, the
    // second applies the scroll against the final scrollHeight.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (mainRef.current) mainRef.current.scrollTop = restoreScrollTop;
        menuPosReadyRef.current = true;
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [restoreScrollTop]);

  // Search results — see src/lib/menu-search.ts. Matches category names too, so
  // "wine" finds everything in "Wine Selection" even though no product is named that.
  const searchResults = useMemo(
    () =>
      searchMenu({
        products,
        categories,
        query: searchQuery,
        locale,
        defaultLocale,
      }),
    [searchQuery, products, categories, locale, defaultLocale],
  );

  // ── Búsqueda en lenguaje natural ──
  // Solo entra cuando el motor léxico no encontró nada Y la consulta parece una
  // frase ("algo liviano para mi hijo") en vez de un nombre de plato. Es
  // aditiva: si está apagada o falla la red, la búsqueda de siempre no cambia.
  const naturalSearch = useNaturalSearch({
    enabled: Boolean(storeConfig.naturalSearch),
    query: searchQuery,
    restaurantId: restaurant.id,
    products,
    categories,
    locale,
    defaultLocale,
    lexicalResultCount: searchResults?.length ?? 0,
  });

  // searchResults is null while the query is too short to search — treat that as
  // "nothing to split" so neither block renders.
  const { cards: searchCards, rows: searchRows } = useMemo(
    () => splitByDisplay(searchResults ?? []),
    [searchResults],
  );

  // Shown under an empty search field: a way in without typing.
  const searchSuggestions = useMemo(
    () => suggestedCategories(products, categories),
    [products, categories],
  );

  // Scroll-spy: disabled for large-catalog mode (one-category-at-a-time, no scroll needed)
  useEffect(() => {
    const main = mainRef.current;
    if (!main || itemsByCategory.length === 0 || isLargeCatalog) return;

    setActiveCategory(itemsByCategory[0].category.id);

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (isScrollingRef.current) return;

        // Use getBoundingClientRect for precise viewport-relative positioning.
        // offsetTop is relative to offsetParent and is unreliable inside scrollable containers.
        const isDesktopNow = window.innerWidth >= 1024;
        const pillsH = isDesktopNow
          ? (desktopPillsRef.current?.offsetHeight ?? 44)
          : (mobilePillsRef.current?.offsetHeight ?? 52);
        const headerH = isDesktopNow ? 0 : HEADER_HEIGHT;
        const mainTop = main.getBoundingClientRect().top;
        const threshold = mainTop + headerH + pillsH - 8;

        let current = itemsByCategory[0].category.id;

        for (const { category } of itemsByCategory) {
          const el = sectionRefs.current.get(category.id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= threshold) {
            current = category.id;
          } else {
            break;
          }
        }

        setActiveCategory(current);
      });
    };

    main.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => main.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsByCategory, mainMounted]);

  // Track scroll for collapsing header + optional “back to top” pill (large-catalog stores).
  // Booleans, not the raw scrollTop: React bails out when a boolean doesn't
  // change, so the 4000-line shell no longer re-renders ~60×/s while scrolling.
  const [pastScrollTopPill, setPastScrollTopPill] = useState(false);
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const threshold = hasCover ? 100 : 40;
    const onScroll = () => {
      const top = main.scrollTop;
      setPastScrollTopPill(top > 180);
      setHeaderScrolled(top > threshold);
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      main.removeEventListener("scroll", onScroll);
    };
  }, [hasCover, mainMounted]);

  // Keyboard shortcuts: / or Ctrl+K for search, Esc to close overlays
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        // Topmost first: the product sheet can now open over the search
        // overlay (search keeps its results), so it must close before search.
        if (customization) handleCloseCustomization();
        else if (showCatSheet) setShowCatSheet(false);
        else if (showSubcatSheet) setShowSubcatSheet(false);
        else if (showSearch) {
          setShowSearch(false);
          setSearchQuery("");
        } else if (isOpen) setOpen(false);
        return;
      }

      if (isInput) return;

      if (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    showSearch,
    customization,
    isOpen,
    setOpen,
    showSubcatSheet,
    showCatSheet,
    handleCloseCustomization,
  ]);

  // Auto-scroll pill bar + sidebar to show active category.
  // Pill bar: skipped when the change came from a user click (categoryClickedRef) to avoid
  // the jarring "pills jumping back" effect. The sidebar always auto-scrolls so the active
  // item stays visible (Uber Eats behavior: sidebar tracks scroll position).
  useEffect(() => {
    // activePillId, not activeCategory: with groups the rendered pill carries the
    // synthetic group id, so querying by the real category id finds nothing.
    const catToShow = isLargeCatalog ? activeCatFilter : activePillId;
    if (!catToShow) return;

    const wasClick = categoryClickedRef.current;
    categoryClickedRef.current = false; // reset for next update

    const isDesktop =
      typeof window !== "undefined" && window.innerWidth >= 1024;

    // ── Horizontal pill bar (desktop + mobile top bar) ──
    // On click: instant jump so the pill appears selected immediately.
    // On scroll-spy: smooth scroll to follow the reading position.
    if (isDesktop) {
      const container = catScrollRef.current;
      if (container) {
        const pill = container.querySelector(
          `[data-pill-id="${catToShow}"]`,
        ) as HTMLElement;
        if (pill) {
          const containerRect = container.getBoundingClientRect();
          const pillRect = pill.getBoundingClientRect();
          const targetLeft =
            container.scrollLeft +
            pillRect.left -
            containerRect.left -
            (containerRect.width - pillRect.width) / 2;
          // Always instant — smooth fights with scroll-spy updates and causes jitter
          container.scrollTo({
            left: Math.max(0, targetLeft),
            behavior: "instant",
          });
        }
      }
    } else {
      // Skip auto-scroll while user is actively touching the pills bar to avoid
      // fighting their horizontal swipe gesture (the "bounce-back" effect).
      if (!pillsTouchActiveRef.current) {
        if (wasClick) {
          // Click: fire immediately so the pill appears selected at once.
          const container = mobilePillsRef.current;
          if (container) {
            const pill = container.querySelector(
              `[data-pill-id="${catToShow}"]`,
            ) as HTMLElement;
            if (pill) {
              const containerRect = container.getBoundingClientRect();
              const pillRect = pill.getBoundingClientRect();
              const targetLeft =
                container.scrollLeft +
                pillRect.left -
                containerRect.left -
                (container.offsetWidth - pill.offsetWidth) / 2;
              container.scrollTo({
                left: Math.max(0, targetLeft),
                behavior: "instant",
              });
            }
          }
        } else {
          // Scroll-spy: debounce 200 ms so rapid category changes (≈60 fps during
          // fast vertical scroll) coalesce into a single movement after the user
          // slows down — eliminates the "rapid jumping pill bar" artefact.
          clearTimeout(pillBarScrollTimerRef.current);
          const capturedCat = catToShow;
          pillBarScrollTimerRef.current = setTimeout(() => {
            if (pillsTouchActiveRef.current) return; // re-check inside timer
            const container = mobilePillsRef.current;
            if (container) {
              const pill = container.querySelector(
                `[data-pill-id="${capturedCat}"]`,
              ) as HTMLElement;
              if (pill) {
                const containerRect = container.getBoundingClientRect();
                const pillRect = pill.getBoundingClientRect();
                // Skip if the pill is already fully visible in the scroll container.
                const isInView =
                  pillRect.left >= containerRect.left + 8 &&
                  pillRect.right <= containerRect.right - 8;
                if (!isInView) {
                  const targetLeft =
                    container.scrollLeft +
                    pillRect.left -
                    containerRect.left -
                    (container.offsetWidth - pill.offsetWidth) / 2;
                  container.scrollTo({
                    left: Math.max(0, targetLeft),
                    behavior: "smooth",
                  });
                }
              }
            }
          }, 200);
        }
      }
    }

    // ── Desktop sidebar: always auto-scroll to keep active item visible ──
    // This is the Uber Eats pattern: sidebar tracks the active category as you scroll.
    if (isDesktop) {
      const sidebar = sidebarRef.current;
      if (sidebar) {
        const activeBtn = sidebar.querySelector(
          `[data-sidebar-cat="${catToShow}"]`,
        ) as HTMLElement;
        if (activeBtn) {
          const sidebarRect = sidebar.getBoundingClientRect();
          const btnRect = activeBtn.getBoundingClientRect();
          const isAbove = btnRect.top < sidebarRect.top + 16;
          const isBelow = btnRect.bottom > sidebarRect.bottom - 16;
          if (isAbove || isBelow) {
            // Center the active item in the sidebar viewport
            const targetTop =
              sidebar.scrollTop +
              btnRect.top -
              sidebarRect.top -
              (sidebarRect.height - btnRect.height) / 2;
            sidebar.scrollTo({
              top: Math.max(0, targetTop),
              behavior: wasClick ? "auto" : "smooth",
            });
          }
        }
      }
    }
  }, [activeCategory, activeCatFilter, isLargeCatalog]);

  const scrollCats = (dir: "left" | "right") => {
    catScrollRef.current?.scrollBy({
      left: dir === "left" ? -200 : 200,
      behavior: "smooth",
    });
  };

  // Shared pill renderer — desktop only
  const categoryPill = (id: string, label: string, isActive: boolean) => (
    <button
      key={id}
      data-pill-id={id}
      onClick={() => handleCategorySelect(id)}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap",
        id === POPULAR_ID
          ? isActive
            ? "bg-amber-500 text-white shadow-sm"
            : "bg-white border border-gray-200 text-gray-600 active:bg-gray-50"
          : isActive
            ? "bg-[#05c8a7] text-[#04241E] shadow-sm"
            : "bg-white border border-gray-200 text-gray-600 active:bg-gray-50",
      )}
    >
      {id === POPULAR_ID && <span className="text-xs leading-none">🔥</span>}
      {label}
    </button>
  );

  // Mobile pill renderer — modern squircle style, premium dark active state
  const mobileCategoryPill = (id: string, label: string, isActive: boolean) => (
    <button
      key={id}
      data-pill-id={id}
      onClick={() => handleCategorySelect(id)}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[13px] font-medium whitespace-nowrap",
        id === POPULAR_ID
          ? isActive
            ? "bg-amber-500 text-white"
            : "bg-white/70 text-gray-500 active:bg-gray-200"
          : isActive
            ? "bg-gray-900 text-white"
            : "bg-white/70 text-gray-500 active:bg-gray-200",
      )}
    >
      {id === POPULAR_ID && (
        <span className="text-[13px] leading-none">🔥</span>
      )}
      {label}
    </button>
  );

  // In large-catalog mode the home pill already IS "Popular", so drop it from the
  // scrollable list to avoid two identical pills side by side.
  //
  // When categories declare a group_name, the pills list the ~9 parent GROUPS
  // instead of the 47 categories: each pill carries a synthetic id (GROUP_PREFIX
  // + name) and the categories themselves stay visible as subsection headings
  // inside. Restaurants without group_name keep the flat list unchanged.
  // Logic lives in src/lib/category-groups.ts so it can be unit-tested — the
  // regressions this feature shipped with (dead pills on small menus, inherited
  // schedules, lost highlight) are all pinned by tests there.
  const visibleCats = useMemo(() => {
    const cats = itemsByCategory
      .map((g) => g.category)
      .filter((cat) => !(isLargeCatalog && cat.id === POPULAR_ID));
    return collapseToGroups(cats, { isLargeCatalog });
  }, [itemsByCategory, isLargeCatalog]);

  const activePillId = useMemo(
    () => resolveActivePill(activeCategory, categories, { groupsActive }),
    [activeCategory, categories, groupsActive],
  );

  /** Subcategories of the group currently on screen, for the jump sheet.
   *  Only worth showing past a few sections — with one or two the user can see
   *  everything by scrolling and the button would be pure noise. */
  const subcatsOfActiveGroup = useMemo(() => {
    if (!groupsActive || !activeCatFilter || !isGroupId(activeCatFilter)) {
      return [];
    }
    const list = displayedGroups.filter((g) => g.category.id !== POPULAR_ID);
    return list.length >= 3 ? list : [];
  }, [groupsActive, activeCatFilter, displayedGroups]);

  /** Product count for a sidebar entry, resolving group pills to the sum of
   *  every category they contain. */
  const countForSidebar = useCallback(
    (cat: Category) => {
      if (cat.id === POPULAR_ID) return popularProducts.length;
      if (isGroupId(cat.id)) {
        const grp = groupNameFromId(cat.id);
        const ids = new Set(
          categories.filter((c) => c.group_name === grp).map((c) => c.id),
        );
        return products.filter((p) => ids.has(p.category_id)).length;
      }
      return products.filter((p) => p.category_id === cat.id).length;
    },
    [categories, products, popularProducts.length],
  );

  // Desktop fav / diet pills
  const favPill = hasMounted && favIds.length > 0 && (
    <button
      key="__favs__"
      data-pill-id="__favs__"
      onClick={() => {
        setShowFavs(!showFavs);
        if (!showFavs) setActiveCategory(null);
      }}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap",
        showFavs
          ? "bg-red-500 text-white shadow-sm"
          : "bg-white border border-gray-200 text-gray-600 active:bg-gray-50",
      )}
    >
      <Heart className={cn("w-3.5 h-3.5", showFavs ? "fill-white" : "")} />
      {favIds.length}
    </button>
  );

  // Mobile fav / diet pills — squircle premium style
  const mobileFavPill = hasMounted && favIds.length > 0 && (
    <button
      key="__favs__"
      data-pill-id="__favs__"
      onClick={() => {
        setShowFavs(!showFavs);
        if (!showFavs) setActiveCategory(null);
      }}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[13px] font-medium whitespace-nowrap",
        showFavs
          ? "bg-gray-900 text-white"
          : "bg-white/70 text-gray-500 active:bg-gray-200",
      )}
    >
      <Heart className={cn("w-3.5 h-3.5", showFavs ? "fill-white" : "")} />
      {favIds.length}
    </button>
  );

  const filterDivider = hasMounted && favIds.length > 0 && (
    <div
      className="flex-shrink-0 self-center w-px h-5 bg-gray-200 mx-1"
      aria-hidden
    />
  );

  const mobileCategoryPills = (
    <div
      ref={mobilePillsBarRef}
      className="lg:hidden sticky z-40 bg-[#f5f5f3] border-b border-gray-100"
      style={{
        // Con cover, el header es absolute/top-0 y se superpone al scroll →
        // las pills deben esquivar su alto + notch. Sin cover, el header está en
        // flujo arriba del scroller Y ya consumió el notch con su propio
        // pt-[safe-area-inset-top], así que el scroller ya empieza debajo →
        // las pills se pegan al tope del scroller con top: 0.
        top: hasCover
          ? `calc(${HEADER_HEIGHT}px + env(safe-area-inset-top))`
          : 0,
        willChange: "transform",
      }}
    >
      <div className="flex items-center relative">
        {/* Hamburger — opens category bottom sheet */}
        <button
          onClick={() => setShowCatSheet(true)}
          style={{ touchAction: "manipulation" }}
          className="flex-shrink-0 flex items-center justify-center w-9 h-9 ml-2 rounded-lg text-gray-500 active:bg-gray-200 transition-colors"
          aria-label={t.browseCategoriesAriaLabel}
        >
          <AlignJustify className="w-[18px] h-[18px]" />
        </button>
        {/* Vertical divider */}
        <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" aria-hidden />
        <div
          ref={mobilePillsRef}
          className="py-1 px-2 flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 overscroll-x-contain"
          style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
          onPointerDown={() => {
            clearTimeout(pillsUpTimerRef.current);
            pillsTouchActiveRef.current = true;
          }}
          onPointerUp={() => {
            // Delay resetting the flag so iOS momentum scroll on the main content
            // (which fires scroll-spy) doesn't immediately snap the pill bar back.
            // 1000ms covers typical iOS rubber-band momentum scroll duration.
            clearTimeout(pillsUpTimerRef.current);
            pillsUpTimerRef.current = setTimeout(() => {
              pillsTouchActiveRef.current = false;
            }, 1000);
          }}
          onPointerCancel={() => {
            clearTimeout(pillsUpTimerRef.current);
            pillsTouchActiveRef.current = false;
          }}
        >
          {/* Large catalog: home pill. Labelled "Popular" because that's what the
              unfiltered view now shows — calling it "All" would be a lie. */}
          {isLargeCatalog && (
            <button
              data-pill-id="__all__"
              onClick={() => {
                setActiveCatFilter(null);
                setActiveCategory(null);
                mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
              }}
              style={{ touchAction: "manipulation" }}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[13px] font-medium whitespace-nowrap",
                !activeCatFilter && !showFavs && !activeDiet
                  ? // Popular keeps its amber treatment (from the premium mobile pass)
                    // so it reads as a distinct section, not one more category.
                    popularProducts.length > 0
                    ? "bg-amber-500 text-white"
                    : "bg-gray-900 text-white"
                  : "bg-white/70 text-gray-500 active:bg-gray-200",
              )}
            >
              {popularProducts.length > 0 ? (
                <>
                  <span className="text-[13px] leading-none">🔥</span>
                  {t.popularItems}
                </>
              ) : (
                t.filterAll
              )}
            </button>
          )}
          {visibleCats.map((cat) =>
            mobileCategoryPill(
              cat.id,
              tName(cat, locale, defaultLocale),
              isLargeCatalog
                ? activeCatFilter === cat.id && !showFavs && !activeDiet
                : activePillId === cat.id && !showFavs && !activeDiet,
            ),
          )}
          {filterDivider}
          {mobileFavPill}
          {showScrollTopPill && pastScrollTopPill && (
            <button
              type="button"
              onClick={() =>
                mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })
              }
              style={{ touchAction: "manipulation" }}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-[7px] rounded-lg text-[13px] font-semibold whitespace-nowrap bg-brand-500 text-white shadow-sm active:bg-brand-600"
              aria-label={t.backToTop}
            >
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="max-w-[7rem] truncate">{t.backToTop}</span>
            </button>
          )}
          {/* Spacer so last pill doesn't sit under the fade */}
          <div className="w-8 flex-shrink-0" aria-hidden="true" />
        </div>
        {/* Right-side fade gradient — outside scroll container so absolute isn't clipped */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f5f3] to-transparent z-10"
          aria-hidden="true"
        />
      </div>
    </div>
  );

  const dietaryPills = availableDietTags.length > 0 && (
    <div
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2 -mx-0"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
    >
      {activeDiet && (
        <button
          onClick={() => setActiveDiet(null)}
          style={{ touchAction: "manipulation" }}
          className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap bg-gray-900 text-white active:opacity-80 transition-opacity"
        >
          <X className="w-3 h-3" />
          {t.clearFilters}
        </button>
      )}
      {availableDietTags.map((tag) => {
        const isActive = activeDiet === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() =>
              setActiveDiet(isActive ? null : (tag.id as DietaryTag))
            }
            style={{ touchAction: "manipulation" }}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap border transition-colors",
              isActive
                ? "bg-[#05c8a7] border-[#05c8a7] text-[#04241E]"
                : "bg-white border-gray-200 text-gray-600 active:bg-gray-100",
            )}
          >
            <span aria-hidden="true">{tag.emoji}</span>
            <span>{locale === "en" ? tag.labelEn : tag.labelEs}</span>
          </button>
        );
      })}
    </div>
  );

  const ordersLeft = limitedMode
    ? Math.max(0, limitedMode.dailyLimit - limitedMode.ordersToday)
    : null;

  return (
    <StoreConfigProvider value={storeConfig}>
      <div className="relative h-[100dvh] flex flex-col bg-[#f5f5f3] lg:bg-[#f8f8f8] overflow-hidden overscroll-none">
        {/* Skip to main content — visible on keyboard focus only */}
        <a
          href="#menu-main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:font-semibold focus:text-sm"
        >
          {t.skipToMenu}
        </a>

        <div
          className={cn(
            "lg:flex-shrink-0 lg:relative",
            hasCover ? "absolute inset-x-0 top-0 z-40" : "flex-shrink-0",
          )}
        >
          <MenuHeader
            restaurant={restaurant}
            tableName={tableName}
            searchQuery={searchQuery}
            showSearch={showSearch}
            onSearchChange={setSearchQuery}
            onToggleSearch={() => setShowSearch((s) => !s)}
            searchPlaceholder={t.searchPlaceholder}
            fmtPrice={fmtPrice}
            openLabel={t.open}
            closedLabel={t.closed}
            backUrl={backUrl}
            isScrolled={headerScrolled}
            hasCover={hasCover}
            locale={locale}
            loyaltyPoints={loyaltyData?.points ?? null}
          />
        </div>

        {/* ── Outer scroll: banner scrolls away, sidebar/cart stay sticky ── */}
        <div
          ref={mainRefCb}
          className={`flex-1 overflow-y-auto overscroll-contain max-w-[1440px] w-full mx-auto ${cartCount > 0 ? "pb-[calc(5rem+env(safe-area-inset-bottom))] xl:pb-0" : "pb-[env(safe-area-inset-bottom)]"}`}
          style={
            {
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            } as React.CSSProperties
          }
        >
          {/* Cover banner — full width, scrolls away naturally with content */}
          {restaurant.cover_image_url && (
            <div
              ref={bannerRef}
              className="relative w-full h-48 sm:h-56 lg:h-72 bg-gray-100 overflow-hidden"
            >
              {isDemo && (
                <a
                  href="/demo"
                  className="hidden lg:flex absolute top-3 left-3 z-10 items-center justify-center w-9 h-9 rounded-full bg-orange-500/80 backdrop-blur-sm hover:bg-orange-500 transition-colors shadow-lg"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </a>
              )}
              <Image
                src={restaurant.cover_image_url}
                alt={restaurant.name}
                fill
                sizes="(max-width: 1440px) 100vw, 1440px"
                className="object-cover animate-cover-zoom"
                priority
              />
              {/* Mobile: gradient. Multi-stop con aceleración hacia abajo (ease-in) en
                lugar de un 2-stop transparent→negro, que produce banding gris visible
                ~al 50% (el artefacto que delata los headers baratos; ver Material
                Design scrim guidance). Sutil arriba para el header, oscuro abajo para
                la legibilidad del nombre/rating. */}
              <div
                className="lg:hidden absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.12) 18%, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.10) 62%, rgba(0,0,0,0.40) 82%, rgba(0,0,0,0.66) 100%)",
                }}
              />

              {/* Desktop: gradient + info overlay */}
              <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

              {/* Mobile: nombre + rating overlaid at bottom of banner */}
              <div className="lg:hidden absolute bottom-0 left-0 right-0 px-4 pb-4">
                {/* font-menu = Instrument Serif. Sin font-black: la fuente solo
                    tiene peso 400 y el navegador la sintetizaría en falso bold. */}
                <h1
                  className="font-menu text-[2.6rem] text-white leading-[1.02] tracking-[-0.015em]"
                  style={{ textShadow: "0 2px 18px rgba(0,0,0,0.55)" }}
                >
                  {restaurant.name}
                </h1>
                {restaurant.description && (
                  <p className="text-sm text-white/85 mt-0.5 line-clamp-1 drop-shadow-sm">
                    {restaurant.description}
                  </p>
                )}
                {reviewStats && reviewStats.total > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-sm" />
                    <span className="text-sm font-bold text-white drop-shadow-sm tabular-nums">
                      {reviewStats.average}
                    </span>
                    <span className="text-xs text-white/75">
                      ({reviewStats.total}+)
                    </span>
                  </div>
                )}
              </div>

              {/* Desktop: nombre + info a la izquierda, rating a la derecha */}
              <div className="hidden lg:flex absolute bottom-0 left-0 right-0 px-8 pb-5 items-end justify-between gap-4">
                <div className="min-w-0">
                  {/* Gemelo desktop del <h1> mobile de arriba: CSS oculta uno,
                      pero AMBOS quedan en el DOM y los crawlers leían el nombre
                      del restaurante duplicado. Solo el primero es <h1>. */}
                  <div
                    role="presentation"
                    className="font-menu text-[3.4rem] text-white leading-[1.02] tracking-[-0.015em] truncate"
                    style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
                  >
                    {restaurant.name}
                  </div>
                  {restaurant.description && (
                    <p className="text-sm text-white/75 mt-1 max-w-lg line-clamp-1">
                      {restaurant.description}
                    </p>
                  )}
                  {(restaurant.address || restaurant.operating_hours) && (
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                      {restaurant.address && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#047a65]" />
                          <span className="truncate max-w-[240px]">
                            {restaurant.address}
                          </span>
                        </span>
                      )}
                      {restaurant.operating_hours &&
                        (() => {
                          const days = [
                            "sunday",
                            "monday",
                            "tuesday",
                            "wednesday",
                            "thursday",
                            "friday",
                            "saturday",
                          ];
                          const dayKey = days[new Date().getDay()];
                          const dh = restaurant.operating_hours?.[dayKey];
                          if (!dh || dh.closed) return null;
                          const is24h =
                            dh.open === "00:00" && dh.close === "23:59";
                          return (
                            <span className="inline-flex items-center gap-1.5 text-[#047a65] font-medium">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              {is24h ? t.open24h : `${dh.open} – ${dh.close}`}
                            </span>
                          );
                        })()}
                    </div>
                  )}
                </div>
                {reviewStats && reviewStats.total > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-400/20 backdrop-blur-sm border border-amber-400/30 flex-shrink-0">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-white tabular-nums">
                      {reviewStats.average}
                    </span>
                    <span className="text-sm text-white/70">
                      ({reviewStats.total}+)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile pills — sticky debajo del header */}
          {mobileCategoryPills}

          {/* Dietary filter pills — mobile, below category pills */}
          {availableDietTags.length > 0 && (
            <div
              ref={mobileDietBarRef}
              className="lg:hidden sticky z-30 bg-[#f5f5f3] border-b border-gray-100"
              style={{
                // Con cover suma header+category pills+notch; sin cover solo las
                // category pills (40px) — el header en flujo ya consumió el notch.
                top: hasCover
                  ? `calc(${HEADER_HEIGHT + 40}px + env(safe-area-inset-top))`
                  : `40px`,
              }}
            >
              {dietaryPills}
            </div>
          )}

          {/* ── 3-Column row ── */}
          <div className="flex lg:min-h-[calc(100dvh-48px)]">
            {/* Left: Sidebar — sticky, stays in place while content scrolls */}
            <aside
              ref={(el) => {
                sidebarRef.current = el;
              }}
              className="hidden lg:flex flex-col w-[200px] flex-shrink-0 border-r border-gray-100 sticky top-0 h-[calc(100dvh-48px)] overflow-y-auto"
            >
              <CategorySidebar
                categories={groupsActive ? visibleCats : categories}
                products={products}
                activeCategory={
                  isLargeCatalog ? (activeCatFilter ?? null) : activePillId
                }
                onSelect={handleCategorySelect}
                allLabel={t.allCategories}
                locale={locale}
                defaultLocale={defaultLocale}
                countFor={groupsActive ? countForSidebar : undefined}
                subcategories={subcatsOfActiveGroup}
                onSelectSubcategory={scrollToSection}
              />
            </aside>

            {/* Center: wrapper so sticky pills + products stack vertically */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Sticky category pills — desktop only, pins once banner scrolls away */}
              <div
                ref={desktopPillsRef}
                className="hidden lg:block sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100"
              >
                <div className="relative px-2 py-2">
                  <button
                    onClick={() => scrollCats("left")}
                    className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-white via-white to-transparent flex items-center justify-start"
                    aria-label={t.scrollLeftAriaLabel}
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <div
                    ref={catScrollRef}
                    className="flex gap-2 overflow-x-auto scrollbar-hide px-6 pb-0.5"
                    style={{
                      WebkitOverflowScrolling: "touch",
                      touchAction: "pan-x",
                    }}
                  >
                    {visibleCats.map((cat) =>
                      categoryPill(
                        cat.id,
                        tName(cat, locale, defaultLocale),
                        activePillId === cat.id && !showFavs && !activeDiet,
                      ),
                    )}
                    {filterDivider}
                    {favPill}
                  </div>
                  <button
                    onClick={() => scrollCats("right")}
                    className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-end"
                    aria-label={t.scrollRightAriaLabel}
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {availableDietTags.length > 0 && (
                  <div className="border-t border-gray-100">{dietaryPills}</div>
                )}
              </div>

              {/* Center: Products — natural flow, no independent scroll */}
              <main id="menu-main" className={`flex-1 min-w-0 pb-4 lg:pb-8`}>
                {/* Mobile info bar (when no cover, show name/rating/description) */}
                {!restaurant.cover_image_url && (
                  <div className="lg:hidden px-4 pt-4 pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <h1 className="text-2xl font-black text-gray-950 leading-tight">
                        {restaurant.name}
                      </h1>
                      {reviewStats && reviewStats.total > 0 && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-bold text-gray-900 tabular-nums">
                            {reviewStats.average}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({reviewStats.total}+)
                          </span>
                        </div>
                      )}
                    </div>
                    {restaurant.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {restaurant.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Reorder banner — shown when customer has a previous order here */}
                {showReorderBanner && (
                  <div className="mx-4 lg:mx-8 mt-3 lg:mt-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#e6faf7] border border-[#b3efe6]">
                    <div className="w-9 h-9 rounded-xl bg-[#d0f7f1] flex items-center justify-center flex-shrink-0">
                      <RotateCcw
                        className="w-4 h-4 text-[#047a65]"
                        strokeWidth={2.5}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#047a65]">
                        {t.reorderLastOrder}
                      </p>
                      <p className="text-xs text-[#047a65] truncate mt-0.5">
                        {lastOrder!.items
                          .map((i) => `${i.qty}× ${i.productName}`)
                          .join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={handleReorder}
                      className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-[#05c8a7] text-[#04241E] text-xs font-bold active:scale-95 transition-transform"
                    >
                      {t.addToCart}
                    </button>
                    <button
                      onClick={() => setReorderDismissed(true)}
                      className="flex-shrink-0 p-1.5 text-[#047a65] hover:text-[#047a65] transition-colors"
                      aria-label={t.cancel}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Table context banner — shown when customer arrives via table QR */}
                {hasMounted && activeTableName && !tableBannerDismissed && (
                  <div className="mx-4 lg:mx-8 mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-950 text-white">
                    <span className="text-lg flex-shrink-0">🍽️</span>
                    <p className="flex-1 text-sm font-bold">
                      {t.youreAt}{" "}
                      <span className="text-[#05c8a7]">{activeTableName}</span>
                    </p>
                    <button
                      onClick={() => setTableBannerDismissed(true)}
                      className="flex-shrink-0 p-1 text-white/50 hover:text-white transition-colors"
                      aria-label={t.dismiss}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="px-4 lg:px-8 pt-3 lg:pt-6">
                  {/* Desktop restaurant info is now overlaid on the cover banner above.
              If there is NO cover image, show the info block here instead. */}
                  {!restaurant.cover_image_url && (
                    <div className="hidden lg:block mb-8">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          {/* Gemelo desktop del <h1> mobile (bloque lg:hidden
                              de arriba). Mismo motivo: un solo <h1> por página. */}
                          <div
                            role="presentation"
                            className="text-3xl font-black text-gray-950"
                          >
                            {restaurant.name}
                          </div>
                          {restaurant.description && (
                            <p className="text-base text-gray-500 mt-1.5 max-w-xl">
                              {restaurant.description}
                            </p>
                          )}
                        </div>
                        {reviewStats && reviewStats.total > 0 && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 flex-shrink-0">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-bold text-gray-900 tabular-nums">
                              {reviewStats.average}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({reviewStats.total}+)
                            </span>
                          </div>
                        )}
                      </div>
                      {(restaurant.address || restaurant.operating_hours) && (
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                          {restaurant.address && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate max-w-[280px]">
                                {restaurant.address}
                              </span>
                            </span>
                          )}
                          {restaurant.operating_hours &&
                            (() => {
                              const days = [
                                "sunday",
                                "monday",
                                "tuesday",
                                "wednesday",
                                "thursday",
                                "friday",
                                "saturday",
                              ];
                              const dayKey = days[new Date().getDay()];
                              const dh = restaurant.operating_hours?.[dayKey];
                              if (!dh || dh.closed) return null;
                              const is24h =
                                dh.open === "00:00" && dh.close === "23:59";
                              return (
                                <span
                                  className={`inline-flex items-center gap-1.5 ${is24h ? "text-[#047a65] font-medium" : ""}`}
                                >
                                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                                  {is24h
                                    ? t.open24h
                                    : `${dh.open} – ${dh.close}`}
                                </span>
                              );
                            })()}
                        </div>
                      )}
                    </div>
                  )}

                  {searchResults !== null ? (
                    <div>
                      <motion.p
                        key={searchResults.length}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-gray-500 mb-4"
                      >
                        {searchResults.length}{" "}
                        {searchResults.length === 1
                          ? t.resultSingular
                          : t.resultPlural}
                      </motion.p>
                      {searchResults.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35 }}
                          className="text-center py-20 text-gray-400 flex flex-col items-center gap-4"
                        >
                          <motion.svg
                            width="64"
                            height="64"
                            viewBox="0 0 64 64"
                            fill="none"
                            aria-hidden="true"
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 260,
                              damping: 20,
                              delay: 0.1,
                            }}
                          >
                            <circle
                              cx="28"
                              cy="28"
                              r="18"
                              stroke="#d1d5db"
                              strokeWidth="3"
                              fill="none"
                            />
                            <path
                              d="M41 41L52 52"
                              stroke="#d1d5db"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <path
                              d="M22 28h12M28 22v12"
                              stroke="#d1d5db"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              opacity="0.4"
                            />
                          </motion.svg>
                          <div>
                            <p className="font-bold text-gray-700">
                              {t.noResults}
                            </p>
                            <p className="text-sm text-gray-400 mt-1 leading-relaxed max-w-[180px] mx-auto">
                              {t.tryDifferentKeyword}
                            </p>
                          </div>
                        </motion.div>
                      ) : (
                        <>
                          {/* Cards then rows, same as the category sections, but
                              relevance order is preserved inside each block —
                              splitByDisplay is stable, so the best-matching
                              drink still leads the row list. */}
                          <motion.div
                            className={cn(
                              "grid grid-cols-2 lg:grid-cols-3 gap-3",
                              searchCards.length === 0 && "hidden",
                            )}
                            initial="hidden"
                            animate="visible"
                            variants={{
                              hidden: {},
                              visible: {
                                transition: {
                                  staggerChildren: isDesktopView ? 0.05 : 0,
                                },
                              },
                            }}
                          >
                            {searchCards.map((product) => (
                              <motion.div
                                key={product.id}
                                variants={
                                  isDesktopView
                                    ? {
                                        hidden: { opacity: 0, y: 14 },
                                        visible: {
                                          opacity: 1,
                                          y: 0,
                                          transition: {
                                            duration: 0.28,
                                            ease: "easeOut",
                                          },
                                        },
                                      }
                                    : { hidden: {}, visible: {} }
                                }
                              >
                                <ProductCard
                                  product={product}
                                  restaurantId={restaurant.id}
                                  onSelect={handleProductSelect}
                                  onQuickAdd={handleQuickAdd}
                                  fmtPrice={fmtPrice}
                                  addLabel={t.addToCart}
                                  customizeLabel={t.customize}
                                  popularLabel={t.popular}
                                  soldOutLabel={t.soldOut}
                                  unavailableLabel={t.unavailable}
                                  addedShortLabel={t.addedShort}
                                  locale={locale}
                                  defaultLocale={defaultLocale}
                                />
                              </motion.div>
                            ))}
                          </motion.div>
                          {searchRows.length > 0 && (
                            <div className={cn("border-t border-gray-100 lg:columns-2 lg:gap-x-10", searchCards.length > 0 && "mt-3")}>
                              {searchRows.map((product) => (
                                <ProductRow
                                  key={product.id}
                                  product={product}
                                  restaurantId={restaurant.id}
                                  onSelect={handleProductSelect}
                                  onQuickAdd={handleQuickAdd}
                                  fmtPrice={fmtPrice}
                                  addLabel={t.addToCart}
                                  customizeLabel={t.customize}
                                  popularLabel={t.popular}
                                  soldOutLabel={t.soldOut}
                                  unavailableLabel={t.unavailable}
                                  addedShortLabel={t.addedShort}
                                  locale={locale}
                                  defaultLocale={defaultLocale}
                                />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : showFavs ? (
                    <div>
                      <div className="flex items-center gap-3 mb-4 py-2">
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                        <h2 className="text-lg font-bold text-gray-900">
                          {t.favoritesTitle}
                        </h2>
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full tabular-nums">
                          {favIds.length}
                        </span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>
                      {favIds.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                          <Heart className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                          <p className="font-medium">{t.noFavoritesYet}</p>
                          <p className="text-sm mt-1">{t.noFavoritesHint}</p>
                        </div>
                      ) : (
                        (() => {
                          const { cards: favCards, rows: favRows } =
                            splitByDisplay(
                              products.filter((p) => favIds.includes(p.id)),
                            );
                          return (
                            <>
                              {favCards.length > 0 && (
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                  {favCards.map((product) => (
                                    <ProductCard
                                      key={product.id}
                                      product={product}
                                      restaurantId={restaurant.id}
                                      onSelect={handleProductSelect}
                                      onQuickAdd={handleQuickAdd}
                                      fmtPrice={fmtPrice}
                                      addLabel={t.addToCart}
                                      customizeLabel={t.customize}
                                      popularLabel={t.popular}
                                      soldOutLabel={t.soldOut}
                                      unavailableLabel={t.unavailable}
                                      addedShortLabel={t.addedShort}
                                      locale={locale}
                                      defaultLocale={defaultLocale}
                                    />
                                  ))}
                                </div>
                              )}
                              {favRows.length > 0 && (
                                <div className={cn("border-t border-gray-100 lg:columns-2 lg:gap-x-10", favCards.length > 0 && "mt-3")}>
                                  {favRows.map((product) => (
                                    <ProductRow
                                      key={product.id}
                                      product={product}
                                      restaurantId={restaurant.id}
                                      onSelect={handleProductSelect}
                                      onQuickAdd={handleQuickAdd}
                                      fmtPrice={fmtPrice}
                                      addLabel={t.addToCart}
                                      customizeLabel={t.customize}
                                      popularLabel={t.popular}
                                      soldOutLabel={t.soldOut}
                                      unavailableLabel={t.unavailable}
                                      addedShortLabel={t.addedShort}
                                      locale={locale}
                                      defaultLocale={defaultLocale}
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()
                      )}
                    </div>
                  ) : products.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="text-center py-20 flex flex-col items-center gap-4"
                    >
                      <motion.div
                        initial={{ scale: 0.7 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 260,
                          damping: 20,
                          delay: 0.1,
                        }}
                        className="w-20 h-20 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center"
                      >
                        <svg
                          width="36"
                          height="36"
                          viewBox="0 0 36 36"
                          fill="none"
                        >
                          <path
                            d="M6 10h24M6 18h24M6 26h14"
                            stroke="#d1d5db"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </motion.div>
                      <p className="font-semibold text-gray-600">
                        {t.noProductsYet}
                      </p>
                    </motion.div>
                  ) : activeDiet && filteredProducts.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-20 text-gray-400 flex flex-col items-center gap-3"
                    >
                      <motion.p
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          damping: 20,
                        }}
                        className="text-4xl"
                      >
                        {DIETARY_TAGS.find((d) => d.id === activeDiet)?.emoji}
                      </motion.p>
                      <p className="font-medium">{t.noDietMatch}</p>
                      <button
                        onClick={() => setActiveDiet(null)}
                        className="mt-1 text-sm text-[#047a65] font-semibold hover:text-[#047a65] transition-colors"
                      >
                        {t.viewFullMenu}
                      </button>
                    </motion.div>
                  ) : activeDiet ? (
                    // Dietary filter active with matches: show them as one compact grid
                    // (not split across categories), so a tag with few products reads as
                    // "N results" instead of a near-empty menu scattered over categories.
                    <div>
                      <div className="flex items-center gap-2 mb-4 py-1">
                        <span aria-hidden="true" className="text-lg">
                          {DIETARY_TAGS.find((d) => d.id === activeDiet)?.emoji}
                        </span>
                        <h2 className="text-lg font-bold text-gray-900">
                          {locale === "en"
                            ? getTagConfig(activeDiet)?.labelEn
                            : getTagConfig(activeDiet)?.labelEs}
                        </h2>
                        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full tabular-nums">
                          {filteredProducts.length}
                        </span>
                        <button
                          onClick={() => setActiveDiet(null)}
                          className="ml-auto text-sm text-[#047a65] font-semibold hover:text-[#047a65] transition-colors"
                        >
                          {t.viewFullMenu}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {filteredProducts.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            restaurantId={restaurant.id}
                            onSelect={handleProductSelect}
                            onQuickAdd={handleQuickAdd}
                            fmtPrice={fmtPrice}
                            addLabel={t.addToCart}
                            customizeLabel={t.customize}
                            popularLabel={t.popular}
                            soldOutLabel={t.soldOut}
                            unavailableLabel={t.unavailable}
                            addedShortLabel={t.addedShort}
                            locale={locale}
                            defaultLocale={defaultLocale}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <MenuErrorBoundary section="products" locale={locale}>
                      <div
                        key={activeCatFilter ?? "all"}
                        ref={catListRef}
                        className="space-y-8 menu-cat-fade"
                      >
                        {/* "Pedir de nuevo" (Pedro 2026-11-11): solo el último plato
                            pedido, solo en la portada (Popular). Antes salía en TODAS
                            las categorías —incluso dentro de Burgers— con sugerencias
                            al azar sacadas de pedidos de prueba y un ícono gris en los
                            productos sin foto. Si el banner "Repetir último pedido"
                            está visible, ya cubre esto: no se duplica. */}
                        {(() => {
                          const item = recommendations?.last_order;
                          if (!item || showReorderBanner) return null;
                          if (activeCatFilter && activeCatFilter !== POPULAR_ID) return null;
                          const product = products.find((p) => p.id === item.product_id);
                          if (!product) return null;
                          const handleClick = () => {
                            if (
                              item.has_modifiers ||
                              (product.variants?.length ?? 0) > 0 ||
                              (product.extras?.length ?? 0) > 0
                            ) {
                              setCustomization({ product, editIndex: null });
                            } else {
                              handleQuickAdd(product);
                            }
                          };
                          const src = item.image_url;
                          return (
                            <section className="mb-2">
                              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                {t.forYouLastOrder}
                              </p>
                              <button
                                onClick={handleClick}
                                className="w-full flex items-center gap-3 rounded-2xl border border-gray-100 bg-white shadow-sm p-2.5 active:scale-[0.98] transition-transform text-left"
                              >
                                {src && (
                                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                    <Image
                                      src={src}
                                      alt={item.name}
                                      fill
                                      sizes="56px"
                                      loader={src.includes(".supabase.co/storage/") ? supabaseLoader : undefined}
                                      className="object-cover"
                                    />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-gray-900 truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-sm font-bold text-[#047a65] tabular-nums">
                                    {fmtPrice(item.price)}
                                  </span>
                                </div>
                                <span className="flex-shrink-0 rounded-full bg-[#05c8a7]/10 px-3 py-1.5 text-xs font-bold text-[#047a65]">
                                  {t.orderReorder}
                                </span>
                              </button>
                            </section>
                          );
                        })()}
                        {(() => {
                          let globalProductIdx = 0;
                          return displayedGroups.map(
                            ({ category, items, available }) => {
                              const isPopular = category.id === POPULAR_ID;
                              const isLocked = !available;
                              // Photo cards first, then the photo-less items as a
                              // continuous list. Interleaving them leaves holes in
                              // the grid; grouping them is also what makes the
                              // photographed dishes read as the highlighted ones.
                              const { cards: cardItems, rows: rowItems } =
                                splitByDisplay(items);
                              return (
                                <section
                                  key={category.id}
                                  data-cat-id={category.id}
                                  style={{ contentVisibility: "auto" }}
                                  ref={(el) => {
                                    if (el)
                                      sectionRefs.current.set(category.id, el);
                                    else
                                      sectionRefs.current.delete(category.id);
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-4 pt-3">
                                    {isPopular && (
                                      <span className="text-lg leading-none">
                                        🔥
                                      </span>
                                    )}
                                    {/* Serif editorial: separa el título de sección
                                        del nombre de plato, que sigue en Inter.
                                        Sin font-extrabold (Instrument Serif solo
                                        tiene peso 400 y se falsearía). */}
                                    <h2 className="font-menu text-[1.45rem] text-gray-950 tracking-[-0.01em] leading-none">
                                      {isPopular
                                        ? t.popularItems
                                        : tName(
                                            category,
                                            locale,
                                            defaultLocale,
                                          )}
                                    </h2>
                                    {isLocked && category.available_from && (
                                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                        <Clock className="w-3 h-3" />
                                        {category.available_from} –{" "}
                                        {category.available_to}
                                      </span>
                                    )}
                                    {!isLocked && (
                                      <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                                        {items.length}
                                      </span>
                                    )}
                                    <div className="flex-1 h-px bg-gray-100" />
                                  </div>
                                  <div
                                    className={cn(
                                      "relative",
                                      isLocked && "pointer-events-none",
                                    )}
                                  >
                                    {isLocked && (
                                      <div className="absolute inset-0 z-10 rounded-2xl bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                                        <div
                                          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm"
                                          role="status"
                                          aria-live="polite"
                                        >
                                          <Clock
                                            className="w-4 h-4 text-gray-400"
                                            aria-hidden="true"
                                          />
                                          <span className="text-sm font-semibold text-gray-500">
                                            {locale === "en"
                                              ? `Available ${category.available_from} – ${category.available_to}`
                                              : `Disponible ${category.available_from} – ${category.available_to}`}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {lightMobileProductGrid ? (
                                      <div
                                        className={cn(
                                          "grid grid-cols-2 lg:grid-cols-3 gap-3",
                                          isLocked && "opacity-40",
                                          cardItems.length === 0 && "hidden",
                                        )}
                                        {...(isLocked
                                          ? { "aria-hidden": true }
                                          : {})}
                                      >
                                        {cardItems.map((product) => {
                                          const isPriority =
                                            globalProductIdx < 4;
                                          globalProductIdx++;
                                          return (
                                            <div key={product.id}>
                                              <ProductCard
                                                product={product}
                                                restaurantId={restaurant.id}
                                                onSelect={handleProductSelect}
                                                onQuickAdd={handleQuickAdd}
                                                fmtPrice={fmtPrice}
                                                addLabel={t.addToCart}
                                                customizeLabel={t.customize}
                                                popularLabel={t.popular}
                                                soldOutLabel={t.soldOut}
                                                unavailableLabel={t.unavailable}
                                                addedShortLabel={t.addedShort}
                                                locale={locale}
                                                defaultLocale={defaultLocale}
                                                priority={isPriority}
                                                inPopularSection={isPopular}
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <motion.div
                                        className={cn(
                                          "grid grid-cols-2 lg:grid-cols-3 gap-3",
                                          isLocked && "opacity-40",
                                          cardItems.length === 0 && "hidden",
                                        )}
                                        {...(isLocked
                                          ? { "aria-hidden": true }
                                          : {})}
                                        initial={
                                          isDesktopView ? "hidden" : false
                                        }
                                        whileInView={
                                          isDesktopView ? "visible" : undefined
                                        }
                                        viewport={
                                          isDesktopView
                                            ? { once: true, margin: "-40px" }
                                            : undefined
                                        }
                                        variants={
                                          isDesktopView
                                            ? {
                                                hidden: {},
                                                visible: {
                                                  transition: {
                                                    staggerChildren: 0.06,
                                                  },
                                                },
                                              }
                                            : undefined
                                        }
                                      >
                                        {cardItems.map((product) => {
                                          // Solo las primeras imágenes above-the-fold
                                          // en priority (eager). 8 saturaba la conexión
                                          // mobile en el LCP de tiendas nuevas sin CDN
                                          // caliente; el resto carga lazy al scrollear.
                                          const isPriority =
                                            globalProductIdx < 4;
                                          globalProductIdx++;
                                          return (
                                            <motion.div
                                              key={product.id}
                                              variants={
                                                isDesktopView
                                                  ? {
                                                      hidden: {
                                                        opacity: 0,
                                                        y: 16,
                                                      },
                                                      visible: {
                                                        opacity: 1,
                                                        y: 0,
                                                        transition: {
                                                          duration: 0.35,
                                                          ease: "easeOut",
                                                        },
                                                      },
                                                    }
                                                  : undefined
                                              }
                                            >
                                              <ProductCard
                                                product={product}
                                                restaurantId={restaurant.id}
                                                onSelect={handleProductSelect}
                                                onQuickAdd={handleQuickAdd}
                                                fmtPrice={fmtPrice}
                                                addLabel={t.addToCart}
                                                customizeLabel={t.customize}
                                                popularLabel={t.popular}
                                                soldOutLabel={t.soldOut}
                                                unavailableLabel={t.unavailable}
                                                addedShortLabel={t.addedShort}
                                                locale={locale}
                                                defaultLocale={defaultLocale}
                                                priority={isPriority}
                                                inPopularSection={isPopular}
                                              />
                                            </motion.div>
                                          );
                                        })}
                                      </motion.div>
                                    )}
                                    {rowItems.length > 0 && (
                                      <div
                                        className={cn(
                                          "border-t border-gray-100 lg:columns-2 lg:gap-x-10",
                                          isLocked && "opacity-40",
                                          cardItems.length > 0 && "mt-3",
                                        )}
                                        {...(isLocked
                                          ? { "aria-hidden": true }
                                          : {})}
                                      >
                                        {/* Two columns from lg so a list of drinks
                                            doesn't stretch a name and a price to
                                            opposite ends of a 1150px row. */}
                                        {rowItems.map((product) => (
                                          <ProductRow
                                            key={product.id}
                                            product={product}
                                            restaurantId={restaurant.id}
                                            onSelect={handleProductSelect}
                                            onQuickAdd={handleQuickAdd}
                                            fmtPrice={fmtPrice}
                                            addLabel={t.addToCart}
                                            customizeLabel={t.customize}
                                            popularLabel={t.popular}
                                            soldOutLabel={t.soldOut}
                                            unavailableLabel={t.unavailable}
                                            addedShortLabel={t.addedShort}
                                            locale={locale}
                                            defaultLocale={defaultLocale}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </section>
                              );
                            },
                          );
                        })()}
                      </div>
                    </MenuErrorBoundary>
                  )}
                  {/* Recent reviews */}
                  {recentReviews && recentReviews.length > 0 && (
                    <section className="mt-8 mb-6">
                      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        {t.customersTestimonial}
                        {reviewStats && reviewStats.total > 0 && (
                          <span className="text-sm font-normal text-gray-400 ml-1">
                            ({reviewStats.average} / 5 · {reviewStats.total}{" "}
                            {t.reviews})
                          </span>
                        )}
                      </h3>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                        {recentReviews.map((review) => {
                          const reviewDate = new Date(review.created_at);
                          const diffDays = Math.floor(
                            (Date.now() - reviewDate.getTime()) /
                              (1000 * 60 * 60 * 24),
                          );
                          const relativeDate =
                            diffDays === 0
                              ? t.todayLabel
                              : diffDays === 1
                                ? t.yesterdayLabel
                                : diffDays < 7
                                  ? t.daysAgoLabel.replace(
                                      "{n}",
                                      String(diffDays),
                                    )
                                  : diffDays < 30
                                    ? t.weeksAgoLabel.replace(
                                        "{n}",
                                        String(Math.floor(diffDays / 7)),
                                      )
                                    : reviewDate.toLocaleDateString(
                                        locale === "en" ? "en-US" : "es-MX",
                                        { month: "short", year: "numeric" },
                                      );
                          return (
                            <div
                              key={review.id}
                              className="flex-shrink-0 w-[260px] snap-start bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-[#d0f7f1] flex items-center justify-center text-xs font-bold text-[#047a65] flex-shrink-0">
                                  {review.customer_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {review.customer_name}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                          key={s}
                                          className={cn(
                                            "w-3 h-3",
                                            s <= review.rating
                                              ? "text-amber-500 fill-amber-500"
                                              : "text-gray-200",
                                          )}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-gray-400">
                                      {relativeDate}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                                {review.comment}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}

                  {/* ── Reservation form ── */}
                  {(restaurant as any).reservations_enabled && (
                    <ReservationWidget
                      restaurantId={restaurant.id}
                      locale={locale}
                    />
                  )}

                  {/* ── Restaurant info footer ── */}
                  {(restaurant.address ||
                    restaurant.phone ||
                    restaurant.operating_hours) && (
                    <section className="mt-12 mb-6 border-t border-gray-100 pt-8">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {restaurant.address && (
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#e6faf7] flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-4 h-4 text-[#047a65]" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {t.addressLabel}
                              </p>
                              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
                                {restaurant.address}
                              </p>
                              <a
                                href={
                                  restaurant.latitude && restaurant.longitude
                                    ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`
                                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#047a65] hover:text-[#047a65] mt-1.5 transition-colors"
                              >
                                {t.getDirections}
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25"
                                  />
                                </svg>
                              </a>
                            </div>
                          </div>
                        )}

                        {restaurant.operating_hours &&
                          (() => {
                            const dayNames =
                              locale === "en"
                                ? [
                                    "Sunday",
                                    "Monday",
                                    "Tuesday",
                                    "Wednesday",
                                    "Thursday",
                                    "Friday",
                                    "Saturday",
                                  ]
                                : [
                                    "Domingo",
                                    "Lunes",
                                    "Martes",
                                    "Miércoles",
                                    "Jueves",
                                    "Viernes",
                                    "Sábado",
                                  ];
                            const dayKeys = [
                              "sunday",
                              "monday",
                              "tuesday",
                              "wednesday",
                              "thursday",
                              "friday",
                              "saturday",
                            ];
                            const todayIdx = new Date().getDay();
                            const todayKey = dayKeys[todayIdx];
                            const todayHours =
                              restaurant.operating_hours?.[todayKey];
                            return (
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#e6faf7] flex items-center justify-center flex-shrink-0">
                                  <Clock className="w-4 h-4 text-[#047a65]" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {t.schedule}
                                  </p>
                                  <p className="text-sm text-gray-500 mt-0.5">
                                    <span className="font-medium text-gray-700">
                                      {dayNames[todayIdx]}:
                                    </span>{" "}
                                    {todayHours && !todayHours.closed ? (
                                      todayHours.open === "00:00" &&
                                      todayHours.close === "23:59" ? (
                                        <span className="text-[#047a65] font-medium">
                                          {t.open24h}
                                        </span>
                                      ) : (
                                        `${todayHours.open} – ${todayHours.close}`
                                      )
                                    ) : (
                                      t.closedDay
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}

                        {restaurant.phone && (
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#e6faf7] flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-[#047a65]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {t.phoneLabel}
                              </p>
                              <a
                                href={`tel:${restaurant.phone}`}
                                className="text-sm text-[#047a65] font-medium hover:text-[#047a65] transition-colors mt-0.5 block"
                              >
                                {restaurant.phone}
                              </a>
                            </div>
                          </div>
                        )}

                        {restaurant.google_business_url && (
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <svg
                                className="w-4 h-4"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <path
                                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  fill="#4285F4"
                                />
                                <path
                                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  fill="#34A853"
                                />
                                <path
                                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                  fill="#FBBC05"
                                />
                                <path
                                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                  fill="#EA4335"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Google
                              </p>
                              <a
                                href={restaurant.google_business_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors mt-0.5 block"
                              >
                                {t.seeOnGoogleMaps}
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Powered by MENIUS — todas las tiendas */}
                  <div className="mt-8 mb-4 flex flex-col items-center gap-1.5">
                    <a
                      href="https://menius.app?ref=menu-footer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity duration-200"
                    >
                      <span className="flex items-center justify-center w-4 h-4 rounded-[4px] bg-gray-400 text-white text-[9px] font-black select-none">
                        M
                      </span>
                      <span className="text-[11px] text-gray-400 font-normal">
                        {t.poweredBy}
                      </span>
                      <span className="text-[11px] text-gray-500 font-semibold">
                        MENIUS
                      </span>
                    </a>
                    <a
                      href="https://menius.app?ref=menu-footer-cta"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      {t.createYourMenu} →
                    </a>
                  </div>
                </div>
                {/* end px wrapper */}
              </main>
            </div>
            {/* end center column wrapper */}

            {/* Right: Cart — sticky, stays in place while content scrolls.
                xl and not lg: between 1024 and 1279px the sidebar (200px) plus
                this panel (340px) left the grid too narrow for its 3rd column,
                so tablets got two cramped cards next to an empty cart. On
                tablet the floating cart bar + bottom sheet take over instead
                (their breakpoints move with this one — see the xl:hidden below). */}
            <aside
              ref={cartColRef}
              className="hidden xl:flex flex-col w-[340px] flex-shrink-0 border-l border-gray-100 sticky top-0 h-[calc(100dvh-48px)] overflow-y-auto"
            >
              <MenuErrorBoundary section="cart" inline locale={locale}>
                <CartPanel
                  fmtPrice={fmtPrice}
                  t={t}
                  onEdit={handleEditCartItem}
                  onCheckout={handleOpenCheckout}
                  estimatedMinutes={
                    restaurant.estimated_delivery_minutes ?? undefined
                  }
                  etaRestaurant={restaurant} taxPending={(restaurant.tax_rate ?? 0) > 0 && !restaurant.tax_included}
                  deliveryFee={restaurant.order_types_enabled?.includes('delivery') ? (restaurant.delivery_fee ?? undefined) : undefined}
                  lastOrder={
                    lastOrder?.restaurantId === restaurant.id ? lastOrder : null
                  }
                  onReorder={handleReorder}
                  suggestions={cartBasedSuggestions}
                  onSuggestionAdd={handleCartSuggestionAdd}
                  loyaltyData={loyaltyData}
                />
              </MenuErrorBoundary>
            </aside>
          </div>
          {/* end 3-column row */}
        </div>
        {/* end outer scroll */}

        {/* ── Fly-to-cart particles (desktop only) — isolated component, no root re-renders ── */}
        <CartFlyParticles cartColRef={cartColRef} />

        {/* ── Mobile: jump-to-subcategory button ──
            A group like Breakfast stacks 81 products across 13 subsections, and
            without this the only way to reach "French Toast" is scrolling blind.
            Deliberately optional — Baymard measured 31% of users never reaching
            the product list when a category page forces an intermediate tap, so
            browsing by scroll stays untouched and this is just a shortcut.
            Sits above the cart bar; both are fixed to the bottom edge. */}
        {subcatsOfActiveGroup.length > 0 && !showSubcatSheet && (
          <div
            className="fixed left-0 right-0 z-30 xl:hidden pointer-events-none flex justify-center px-4"
            style={{
              bottom: cartCount > 0
                ? `calc(84px + env(safe-area-inset-bottom))`
                : `max(env(safe-area-inset-bottom), 16px)`,
            }}
          >
            <button
              onClick={() => setShowSubcatSheet(true)}
              className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900/95 text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.25)] backdrop-blur-sm active:scale-95 transition-transform"
            >
              <AlignJustify className="w-4 h-4" aria-hidden="true" />
              {groupNameFromId(activeCatFilter!)}
              <span className="text-white/60 tabular-nums">
                {subcatsOfActiveGroup.length}
              </span>
            </button>
          </div>
        )}

        {/* ── Mobile: Bottom cart bar ── */}
        {ordersLeft === 0 ? (
          /* Limit reached — generic "paused" bar, no mention of billing */
          <div className="fixed bottom-0 left-0 right-0 z-30 xl:hidden pointer-events-none">
            <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-gradient-to-t from-white via-white/95 to-transparent">
              <div className="max-w-lg mx-auto pointer-events-auto">
                <div className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gray-100 text-gray-500 text-sm font-semibold">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                  {t.ordersLimitReached}
                </div>
              </div>
            </div>
          </div>
        ) : (
          cartCount > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-30 xl:hidden pointer-events-none">
              <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-gradient-to-t from-white via-white/95 to-transparent">
                <div className="max-w-lg mx-auto pointer-events-auto">
                  <button
                    onClick={() => setOpen(true)}
                    className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-[#05c8a7] text-[#04241E] shadow-[0_8px_30px_rgba(5,200,167,0.4)] active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <ShoppingCart className="w-5 h-5" />
                        <motion.span
                          key={cartCount}
                          initial={{ scale: 1.4 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 20,
                          }}
                          className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#04241E] text-white text-[10px] font-extrabold px-1"
                        >
                          {cartCount}
                        </motion.span>
                      </div>
                      <span className="text-sm font-semibold opacity-90">
                        {t.myOrder}
                      </span>
                    </div>
                    <span className="font-extrabold text-base tabular-nums">
                      {fmtPrice(cartTotal)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* ── Mobile: Cart Bottom Sheet ── */}
        <AnimatePresence>
          {isOpen && (
            <div
              className="fixed inset-0 z-50 xl:hidden flex flex-col justify-end"
              role="dialog"
              aria-modal="true"
              aria-labelledby="cart-sheet-title"
            >
              <motion.div
                className="absolute inset-0 bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col"
                style={{
                  maxHeight: "calc(95dvh - env(safe-area-inset-bottom, 0px))",
                }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{
                  type: "tween" as const,
                  duration: 0.22,
                  ease: [0.25, 0.46, 0.45, 0.94] as const,
                }}
                drag="y"
                dragControls={cartDragControls}
                dragConstraints={{ top: 0 }}
                dragElastic={0.15}
                dragListener={false}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 80 || info.velocity.y > 500)
                    setOpen(false);
                }}
              >
                {/* Drag handle + hidden title for screen readers */}
                <div
                  className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing"
                  onPointerDown={(e) => cartDragControls.start(e)}
                  style={{ touchAction: "none" }}
                >
                  <div
                    className="w-10 h-1.5 rounded-full bg-gray-300"
                    aria-hidden="true"
                  />
                </div>
                <h2 id="cart-sheet-title" className="sr-only">
                  {t.myOrder}
                </h2>
                <div className="flex-1 overflow-hidden min-h-0">
                  <CartPanel
                    fmtPrice={fmtPrice}
                    t={t}
                    onEdit={(idx) => {
                      setOpen(false);
                      handleEditCartItem(idx);
                    }}
                    onCheckout={handleOpenCheckout}
                    onClose={() => setOpen(false)}
                    estimatedMinutes={
                      restaurant.estimated_delivery_minutes ?? undefined
                    }
                    etaRestaurant={restaurant} taxPending={(restaurant.tax_rate ?? 0) > 0 && !restaurant.tax_included}
                    deliveryFee={restaurant.order_types_enabled?.includes('delivery') ? (restaurant.delivery_fee ?? undefined) : undefined}
                    lastOrder={
                      lastOrder?.restaurantId === restaurant.id
                        ? lastOrder
                        : null
                    }
                    onReorder={() => {
                      handleReorder();
                      setOpen(false);
                    }}
                    suggestions={cartBasedSuggestions}
                    onSuggestionAdd={handleCartSuggestionAdd}
                    loyaltyData={loyaltyData}
                  />
                </div>
                {/* No safe-area spacer here: CartPanel's footer already pads
                    with max(.75rem, env(safe-area-inset-bottom)). A second one
                    left ~34px of dead white under the checkout button on iPhone. */}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ── Customization Sheet ── */}
        <MenuErrorBoundary section="customization" inline locale={locale}>
          <AnimatePresence
            onExitComplete={() => {
              // Search drops behind the product sheet while one is open over
              // it; restore its normal layer only once the sheet has fully
              // animated out (and no other sheet replaced it).
              if (!customizationRef.current) setSearchBehindSheet(false);
            }}
          >
            {customization && (
              <CustomizationSheet
                // Keyed per product/edit: opening a suggestion from inside an
                // open sheet otherwise reuses the instance, and product B
                // inherits A's selections/added state (couldn't be added).
                key={`${customization.product.id}-${customization.editIndex ?? "new"}`}
                product={customization.product}
                editIndex={customization.editIndex}
                onClose={handleCloseCustomization}
                onViewCart={handleViewCartFromCustomization}
                onAddToCart={showToast}
                fmtPrice={fmtPrice}
                t={t}
                locale={locale}
                defaultLocale={defaultLocale}
                suggestedProducts={suggestedProducts}
                onSuggestAdd={(p) => {
                  // Si el producto tiene variantes, extras o modifier groups,
                  // abrir el sheet de customización. Si no, quick-add directo.
                  if (
                    (p.variants?.length ?? 0) > 0 ||
                    (p.extras?.length ?? 0) > 0 ||
                    p.has_modifiers
                  ) {
                    setCustomization({ product: p, editIndex: null });
                    setOpen(false);
                  } else {
                    handleQuickAdd(p);
                  }
                }}
              />
            )}
          </AnimatePresence>
        </MenuErrorBoundary>

        {/* Reorder: floating "order again" button. Self-gates — only renders when a
            saved phone has a previous order at this restaurant. */}
        <RepeatOrderButton
          restaurantId={restaurant.id}
          locale={locale as "es" | "en"}
        />

        {/* ── Mobile Full-screen Search Overlay ── */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              className={cn(
                "fixed inset-0 bg-white flex flex-col lg:hidden",
                // z-45: under the product sheet and the cart sheet (z-50, e.g.
                // "View cart" from a product opened here) but still over the
                // header/pills (z-40) and cart bar (z-30).
                customization || searchBehindSheet || isOpen
                  ? "z-[45]"
                  : "z-[70]",
              )}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100"
                role="search"
              >
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                  aria-label={t.closeSearch}
                  className="p-1.5 -ml-1 rounded-lg active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
                >
                  <ArrowLeft
                    className="w-5 h-5 text-gray-600"
                    aria-hidden="true"
                  />
                </button>
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    aria-label={t.searchPlaceholder}
                    className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#05c8a7]/20 focus:border-[#05c8a7] placeholder-gray-400"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      aria-label={t.clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {!searchQuery.trim() ? (
                  <div className="pt-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      {t.searchSuggestions}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {searchSuggestions.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setShowSearch(false);
                            setSearchQuery("");
                            setActiveCatFilter(cat.id);
                            setActiveCategory(cat.id);
                          }}
                          className="px-3.5 py-2 rounded-full border border-gray-200 text-sm text-gray-700 active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
                        >
                          {tName(cat, locale, defaultLocale)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      {searchResults.length}{" "}
                      {searchResults.length === 1
                        ? t.resultSingular
                        : t.resultPlural}
                    </p>
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => openProductFromSearch(product)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                      >
                        {!showsAsRow(product) && product.image_url && (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="48px"
                              loader={
                                product.image_url.includes(
                                  ".supabase.co/storage/",
                                )
                                  ? supabaseLoader
                                  : undefined
                              }
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-gray-900 truncate">
                            {tName(product, locale, defaultLocale)}
                          </p>
                          {tDesc(product, locale, defaultLocale) && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {tDesc(product, locale, defaultLocale)}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">
                          {fmtPrice(Number(product.price))}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : naturalSearch.active ? (
                  /* El motor léxico no encontró nada, pero la interpretación de
                     la frase sí. Se marca como sugerencia, no como coincidencia
                     exacta, para que el comensal entienda por qué ve esto. */
                  <div className="space-y-1">
                    <div className="mb-3 flex items-start gap-2">
                      <Sparkles
                        className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        {/* Sin uppercase: es una oración, no una etiqueta. En
                            mayúsculas una frase entera se lee como grito. */}
                        <p className="text-sm font-semibold text-gray-900 leading-snug">
                          {naturalSearch.reply ?? t.searchSuggestions}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {naturalSearch.results.length}{" "}
                          {naturalSearch.results.length === 1
                            ? t.resultSingular
                            : t.resultPlural}
                        </p>
                      </div>
                    </div>
                    {naturalSearch.results.slice(0, 20).map((product) => (
                      <button
                        key={product.id}
                        onClick={() => openProductFromSearch(product)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                      >
                        {!showsAsRow(product) && product.image_url && (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              sizes="48px"
                              loader={
                                product.image_url.includes(".supabase.co/storage/")
                                  ? supabaseLoader
                                  : undefined
                              }
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-gray-900 truncate">
                            {tName(product, locale, defaultLocale)}
                          </p>
                          {tDesc(product, locale, defaultLocale) && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {tDesc(product, locale, defaultLocale)}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">
                          {fmtPrice(Number(product.price))}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : naturalSearch.loading ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <span className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-[#05c8a7] animate-spin" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-gray-400">{t.searchPlaceholder}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <span className="text-3xl select-none" aria-hidden="true">
                        🔍
                      </span>
                    </div>
                    <p className="text-base font-bold text-gray-900 mb-1">
                      {t.noResults}
                    </p>
                    <p className="text-sm text-gray-400 leading-relaxed max-w-[200px]">
                      {t.tryDifferentSearch}
                    </p>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setActiveDiet(null);
                        setShowFavs(false);
                      }}
                      className="mt-5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold active:scale-95 transition-transform"
                    >
                      {t.clearFilters}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Live region for screen reader announcements ── */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          role="status"
        >
          {toastName ? `${toastName} ${t.addedCartSuffix}` : ""}
        </div>

        {/* ── Toast: "X se ha agregado al carrito" — centrado en pantalla ── */}
        {toastName && (
          <div
            className="fixed bottom-[88px] left-0 right-0 lg:bottom-8 z-[60] flex justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gray-900/95 text-white text-sm font-semibold shadow-2xl">
              <span className="w-5 h-5 rounded-full bg-[#05c8a7] flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </span>
              {toastName} {t.addedCartSuffix}
            </div>
          </div>
        )}

        {/* ── Stock-out alert: item in cart just went 86'd ── */}
        {stockOutAlert && (
          <div className="fixed top-4 left-4 right-4 z-[70] flex justify-center pointer-events-none">
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-red-600 text-white text-sm font-semibold shadow-xl max-w-sm w-full">
              <AlertCircle
                className="w-4 h-4 flex-shrink-0"
                aria-hidden="true"
              />
              <span className="flex-1">
                {stockOutAlert.startsWith(RAW_ALERT)
                  ? stockOutAlert.slice(RAW_ALERT.length)
                  : locale === "es"
                  ? `"${stockOutAlert}" ya no está disponible y fue removido de tu carrito.`
                  : `"${stockOutAlert}" is no longer available and was removed from your cart.`}
              </span>
            </div>
          </div>
        )}

        {/* ── Cart resumption toast — shown once when returning with items in cart ── */}
        {cartResumeShown && !toastName && (
          <div className="fixed bottom-28 left-4 right-4 z-[60] flex justify-center lg:bottom-6 lg:left-auto lg:right-6 pointer-events-none">
            <button
              className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#05c8a7] text-[#04241E] text-sm font-semibold shadow-lg active:scale-95 transition-transform"
              onClick={() => {
                setCartResumeShown(false);
                setOpen(true);
              }}
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              {t.continueOrderItems.replace("{n}", String(rawCartCount))}
            </button>
          </div>
        )}

        {/* ── Orders Paused Banner (realtime) ── */}
        {!!pausedUntil && new Date(pausedUntil) > new Date() && (
          <div className="fixed top-0 left-0 right-0 z-[92] flex justify-center px-4 pt-2 pointer-events-none">
            <div className="pointer-events-none flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-orange-600 text-white shadow-xl border border-orange-400/30 text-sm font-semibold animate-in slide-in-from-top-2 duration-300 max-w-sm w-full">
              <span className="text-base" aria-hidden="true">
                ⏸️
              </span>
              <span className="flex-1">{t.ordersPaused}</span>
            </div>
          </div>
        )}

        {/* ── Menu Update Banner ── */}
        <MenuUpdateBanner restaurantId={restaurant.id} locale={locale} />

        {/* ── PWA Install Banner ── */}
        <InstallBanner
          restaurantName={restaurant.name}
          slug={restaurant.slug}
          logoUrl={(restaurant as any).logo_url ?? null}
          locale={locale === "en" ? "en" : "es"}
          recurring={isRecurringVisitor}
        />

        {/* ── Language Switcher (floating pill) ── */}
        {hasMultiLang && (
          <>
            <AnimatePresence>
              {showLangPicker && (
                <motion.div
                  className="fixed inset-0 bg-black/20 z-[70]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowLangPicker(false)}
                />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showLangPicker && (
                <motion.div
                  className={cn(
                    "fixed left-4 z-[71] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden",
                    cartCount > 0 ? "bottom-48 lg:bottom-16" : "bottom-16",
                  )}
                  initial={{ y: 20, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 10, opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                >
                  {availableLocales.map((code) => {
                    const loc = SUPPORTED_LOCALES.find((l) => l.code === code);
                    const active = locale === code;
                    return (
                      <button
                        key={code}
                        onClick={() => {
                          setLocale(code);
                          setShowLangPicker(false);
                        }}
                        className={cn(
                          "flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-[#e6faf7] text-[#047a65] font-semibold"
                            : "text-gray-700 hover:bg-gray-50",
                        )}
                      >
                        <span className="text-base">{loc?.flag ?? "🌐"}</span>
                        <span>{loc?.label ?? code}</span>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={() => setShowLangPicker((s) => !s)}
              className={cn(
                "fixed left-4 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 shadow-lg text-sm font-medium text-gray-700 hover:shadow-xl transition-shadow active:scale-95",
                cartCount > 0 ? "bottom-36 lg:bottom-6" : "bottom-6",
              )}
              aria-label={t.changeLanguageAriaLabel}
            >
              <Globe className="w-4 h-4 text-gray-500" />
              <span>{getLocaleFlag(locale)}</span>
            </button>
          </>
        )}

        {/* ── CATEGORY BOTTOM SHEET (mobile only) ── */}
        <AnimatePresence>
          {showCatSheet && (
            <>
              {/* Backdrop */}
              <motion.div
                className="lg:hidden fixed inset-0 z-[80] bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCatSheet(false)}
              />
              {/* Sheet */}
              <motion.div
                className="lg:hidden fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-3xl overflow-hidden flex flex-col"
                style={{ maxHeight: "80dvh" }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 320 }}
                role="dialog"
                aria-modal="true"
                aria-label={t.browseCategoriesAriaLabel}
              >
                {/* Drag indicator pill */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 rounded-full bg-gray-200" />
                </div>

                {/* Restaurant name header */}
                <div className="text-center px-6 pt-2 pb-4 flex-shrink-0">
                  <p className="font-bold text-[18px] text-gray-900 leading-tight">
                    {restaurant.name}
                  </p>
                </div>

                {/* Category list — scrollable */}
                <div className="overflow-y-auto flex-1 pb-4">
                  <p className="px-6 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {t.exploreMenu}
                  </p>
                  {visibleCats.map((cat) => {
                    const label = tName(cat, locale, defaultLocale);
                    const isActive = isLargeCatalog
                      ? activeCatFilter === cat.id
                      : activePillId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          handleCategorySelect(cat.id);
                          setShowCatSheet(false);
                        }}
                        className={cn(
                          "w-full text-left px-6 py-3.5 text-[15px] transition-colors flex items-center justify-between",
                          isActive
                            ? "font-semibold text-gray-900 bg-gray-50"
                            : "font-normal text-gray-700 active:bg-gray-50",
                        )}
                      >
                        <span>{label}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#05c8a7] flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Dismiss button */}
                <div className="flex-shrink-0 px-5 pb-5 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowCatSheet(false)}
                    className="w-full py-3 rounded-2xl border border-gray-200 bg-transparent text-gray-600 font-semibold text-[15px] active:bg-gray-50 transition-colors"
                  >
                    {t.dismiss}
                  </button>
                </div>
                {/* Safe area spacer — decoupled to prevent reflow during slide-in animation */}
                <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom)]" />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ── SUBCATEGORY JUMP SHEET ──
            The "section menu" NN/g prescribes for 6–15 subcategories. Item
            counts are part of the point: "Buttermilk Pancakes 14" tells the
            customer how much is there before jumping. */}
        <AnimatePresence>
          {showSubcatSheet && (
            <>
              <motion.div
                className="xl:hidden fixed inset-0 z-[80] bg-black/40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSubcatSheet(false)}
              />
              <motion.div
                className="xl:hidden fixed bottom-0 left-0 right-0 z-[81] bg-white rounded-t-3xl overflow-hidden flex flex-col"
                style={{ maxHeight: "75dvh" }}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 320 }}
                role="dialog"
                aria-modal="true"
                aria-label={t.jumpToSection}
              >
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                  <div className="w-10 h-1 rounded-full bg-gray-200" />
                </div>

                <div className="px-6 pt-2 pb-3 flex-shrink-0">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {t.jumpToSection}
                  </p>
                  <p className="font-bold text-[17px] text-gray-900 leading-tight mt-0.5">
                    {activeCatFilter ? groupNameFromId(activeCatFilter) : ""}
                  </p>
                </div>

                <div className="overflow-y-auto flex-1 pb-2">
                  {subcatsOfActiveGroup.map(({ category, items }) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setShowSubcatSheet(false);
                        // Next frame: the sheet's exit animation must not fight
                        // the smooth scroll on the container underneath.
                        requestAnimationFrame(() =>
                          scrollToSection(category.id),
                        );
                      }}
                      className="w-full text-left px-6 py-3.5 text-[15px] text-gray-700 active:bg-gray-50 transition-colors flex items-center justify-between gap-3"
                    >
                      <span className="truncate">
                        {tName(category, locale, defaultLocale)}
                      </span>
                      <span className="text-[13px] font-medium text-gray-400 tabular-nums flex-shrink-0">
                        {items.length}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex-shrink-0 px-5 pb-5 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowSubcatSheet(false)}
                    className="w-full py-3 rounded-2xl border border-gray-200 bg-transparent text-gray-600 font-semibold text-[15px] active:bg-gray-50 transition-colors"
                  >
                    {t.dismiss}
                  </button>
                </div>
                <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom)]" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </StoreConfigProvider>
  );
}
