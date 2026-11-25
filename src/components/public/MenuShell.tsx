"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShoppingCart,
  X,
  MapPin,
  Clock,
  Heart,
  Star,
  ArrowLeft,
  ArrowUp,
  Search,
  RotateCcw,
  AlertCircle,
  AlignJustify,
  Sparkles,
  SearchX,
  UtensilsCrossed,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useCartStore } from "@/store/cartStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { formatPrice, cn } from "@/lib/utils";
import { hasRealPopularity } from "@/lib/social-proof";
import { ProductListItem } from "./ProductListItem";
import { getTranslations, type Locale } from "@/lib/translations";
import type { Restaurant, Category, Product, DietaryTag, ModifierGroup, ModifierOption, ModifierSelection } from "@/types";
import { rebuildSelections } from "@/lib/reorder";
import { DIETARY_TAGS, getTagConfig } from "@/lib/dietary-tags";
import { tName, tDesc } from "@/lib/i18n";
import { searchMenu, suggestedCategories } from "@/lib/menu-search";
import { cartSuggestions } from "@/lib/cart-suggestions";
import { trackEvent } from "@/lib/analytics";

import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { getSupabaseBrowser } from "@/lib/supabase/browser";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabaseLoader } from "@/lib/image-loader";
import { wheelToHorizontal } from "@/lib/wheel-to-horizontal";
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
  GROUP_PREFIX,
} from "@/lib/category-groups";
import { CartPanel } from "./CartPanel";
import { AddedToOrderCard } from "./AddedToOrderCard";
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
import { MenuSheet, type MenuSheetEntry } from "./MenuSheet";
import { TodaySheet, todayItemCount, type SoupSize } from "./TodaySheet";
import { hasHours, isOptionAvailableAt, optionHoursLabel, hoursRangeLabel, clockLabel } from "@/lib/option-hours";
import { inTimeZone, isOpenAt, nextOpening, type OperatingHours } from "@/lib/orders/business-hours";
import { RestaurantInfoSheet, dayHoursText, websiteHref } from "./RestaurantInfoSheet";
import { ReviewsSheet } from "./ReviewsSheet";
import { DietIcon } from "./DietIcon";
import { prettyPhone, telHref } from "@/lib/phone-format";
import { usablePaymentMethods } from "@/lib/payments/online-ready";
import { DEEP_LINK_ATTR } from "./DeepLinkGuard";
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
  /** Hoja del día (sopas y especiales puestos desde el Counter). */
  today?: { day: string; soupSizes: SoupSize[] | null } | null;
}

interface CustomizationTarget {
  product: Product;
  editIndex: number | null;
}

/**
 * Card images preloaded with high priority: only the first row, the one a phone
 * shows on load (its photo is the LCP). 4 competed with the cover and the
 * restaurant-name font once the menu became server-rendered (2026-11-16); 0 left
 * the LCP photo lazy-loading late.
 */
const PRIORITY_CARD_IMAGES = 2;

const POPULAR_ID = "__popular__";
/** Hoja del día (TodaySheet): botón "Today" de la barra, la hoja "Menu" y la columna de escritorio. */
const TODAY_ID = "__today__";
/** Prefijo de stockOutAlert: el texto se muestra tal cual, sin la plantilla "«X» ya no está disponible". */
const RAW_ALERT = "\u0001";
// A remembered menu position older than this is a different visit, not a
// "back from checkout" — land on the default view instead.
const MENU_POS_TTL_MS = 30 * 60 * 1000;

/** Shows the menu DeepLinkGuard hid while a ?category= / ?item= link lands. */
function revealDeepLink() {
  document.documentElement.removeAttribute(DEEP_LINK_ATTR);
}

/** The header cart button that is on screen (tablet and desktop headers both render one). */
const getCartPill = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-cart-pill]")).find((e) => e.offsetParent) ?? null;

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
  today = null,
}: MenuShellProps) {
  const router = useRouter();
  const defaultLocale = initialLocale;
  const availableLocales = availableLocalesRaw ?? [initialLocale];
  const hasMultiLang = availableLocales.length > 1;
  const [locale, setLocale] = useState<Locale>(initialLocale);
  // Back arrow to the restaurant's own site, only for visitors who came from it:
  // someone who scanned a QR or came from Google was never there.
  const [siteBackUrl, setSiteBackUrl] = useState<string | undefined>(undefined);
  const restaurantWebsite = restaurant.website;
  useEffect(() => {
    const site = websiteHref({ website: restaurantWebsite });
    if (!site || backUrl || !document.referrer) return;
    try {
      const ref = new URL(document.referrer);
      const s = new URL(site);
      const base = s.pathname.replace(/\/$/, '');
      if (ref.origin === s.origin && ref.pathname.replace(/\/$/, '').startsWith(base)) setSiteBackUrl(site);
    } catch {
      // malformed URL in the free-text column: no arrow
    }
  }, [restaurantWebsite, backUrl]);
  // The root layout can't know the menu's language (no cookies() there, to
  // keep ISR) and sets <html lang> from the MENIUS UI preference, so an
  // English menu was announced as Spanish to screen readers (WCAG 3.1.1).
  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [locale]);
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
  const [tableBannerDismissed, setTableBannerDismissed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const closeInfo = useCallback(() => setShowInfo(false), []);
  const [showReviews, setShowReviews] = useState(false);
  const closeReviews = useCallback(() => setShowReviews(false), []);
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

  // Cerrar el banner tiene que durar (Pedro 2026-11-12): antes la X solo
  // escondía el banner hasta recargar, y en su lugar aparecía la tarjeta
  // "Volver a pedir" — sin X —, así que parecía imposible sacarlo. El "no" se
  // guarda atado a la fecha de ESE pedido: con un pedido nuevo vuelve a ofrecerse.
  const reorderDismissKey = `menius_reorder_dismissed_${restaurant.id}`;
  useEffect(() => {
    if (!hasMounted || !lastOrder) return;
    try {
      if (localStorage.getItem(reorderDismissKey) === lastOrder.date) {
        setReorderDismissed(true);
      }
    } catch {
      // Modo privado: el banner se puede cerrar igual, solo que no se recuerda.
    }
  }, [hasMounted, lastOrder, reorderDismissKey]);
  const dismissReorder = useCallback(() => {
    setReorderDismissed(true);
    try {
      if (lastOrder) localStorage.setItem(reorderDismissKey, lastOrder.date);
    } catch {
      // idem
    }
  }, [lastOrder, reorderDismissKey]);

  // Tarjeta "Lo que pediste" (Pedro 2026-11-16): sale de la base (último pedido
  // del cliente reconocido por teléfono/email), no del lastOrder local, así que
  // aparecía con el carrito lleno o en otro dispositivo — donde el banner de
  // arriba no existe — y no tenía X. Su "no" se recuerda atado a ESE plato:
  // si el próximo pedido trae otro, vuelve a ofrecerse.
  const lastDishDismissKey = `menius_lastdish_dismissed_${restaurant.id}`;
  const lastDishId = recommendations?.last_order?.product_id ?? null;
  const [lastDishDismissed, setLastDishDismissed] = useState(false);
  useEffect(() => {
    if (!lastDishId) return;
    try {
      setLastDishDismissed(localStorage.getItem(lastDishDismissKey) === lastDishId);
    } catch {
      // Modo privado: se cierra igual, solo que no se recuerda.
    }
  }, [lastDishId, lastDishDismissKey]);
  const dismissLastDish = useCallback(() => {
    setLastDishDismissed(true);
    try {
      if (lastDishId) localStorage.setItem(lastDishDismissKey, lastDishId);
    } catch {
      // idem
    }
  }, [lastDishId, lastDishDismissKey]);


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

    // No "resume your cart" pill: below xl the "My Order" bar already shows a
    // saved cart and from xl the cart is a permanent column, so the pill was
    // the same button twice (and covered the cart's total / checkout button).

    return () => {
      if (hasIdle) {
        window.cancelIdleCallback(idleId as number);
      } else {
        window.clearTimeout(idleId as number);
      }
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
  const [storeClock, setStoreClock] = useState(0);
  useEffect(() => {
    setStoreClock(Date.now());
    const id = window.setInterval(() => setStoreClock(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The cart as it was before the last quick-add, for the toast's "Undo".
  const undoCartRef = useRef<Pick<
    ReturnType<typeof useCartStore.getState>,
    "items" | "reorderSkipped"
  > | null>(null);
  // Line added from the product sheet, for the same "Undo". The sheet adds after
  // its own state changes, so there is no clean "before" snapshot: undo removes
  // exactly that line. Before, the toast reused the last quick-add's snapshot
  // and could roll the cart back to an older state.
  const undoUidRef = useRef<string | null>(null);
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
  const mobilePillsRef = useRef<HTMLDivElement | null>(null);
  // La rueda del mouse mueve las pills de costado (PC con ventana angosta). Ver wheel-to-horizontal.ts.
  const pillsWheelOffRef = useRef<(() => void) | undefined>(undefined);
  const mobilePillsRefCb = useCallback((node: HTMLDivElement | null) => {
    pillsWheelOffRef.current?.();
    pillsWheelOffRef.current = node ? wheelToHorizontal(node) : undefined;
    mobilePillsRef.current = node;
  }, []);
  const dietWheelOffRef = useRef<(() => void) | undefined>(undefined);
  const dietPillsRefCb = useCallback((node: HTMLDivElement | null) => {
    dietWheelOffRef.current?.();
    dietWheelOffRef.current = node ? wheelToHorizontal(node) : undefined;
  }, []);
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
  // Start false and measure after mount (the effect below). Reading window in the
  // initializer was harmless while the menu rendered client-side only; since the
  // menu is server-rendered (2026-11-16) it made the first desktop render differ
  // from the server HTML (motion props, and lightMobileProductGrid swaps <div>
  // for <motion.div>) — a hydration mismatch. Layout itself is Tailwind `lg:`.
  const [isDesktopView, setIsDesktopView] = useState(false);
  // xl (≥1280) shows the cart as a persistent column and hides the cart sheet
  // (xl:hidden). Tracked so back-to-close never pushes a history entry for an
  // overlay that isn't on screen — back would then "close" something invisible.
  const [isXlView, setIsXlView] = useState(false);
  // md (≥768): categories marked "list" switch back to the grid — the list exists
  // for phone density, which a 3-column tablet grid doesn't have. Starts false
  // and is set after mount (not in the initializer): SSR renders the phone
  // layout, and an initializer reading window would make the first client
  // render differ from the server HTML on tablets.
  const [isTabletUp, setIsTabletUp] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsDesktopView(window.innerWidth >= 1024);
      setIsXlView(window.innerWidth >= 1280);
      setIsTabletUp(window.innerWidth >= 768);
    };
    check();
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


  // "pepsi" typed in a burger's add-on search: the soda opens right after the
  // burger is added, so the diner never loses the dish they were building.
  const [queuedNext, setQueuedNext] = useState<Product | null>(null);

  // Tablet/desktop "Added to your order" card under the header cart button
  // (AddedToOrderCard). Phones keep the toast and the bottom bar.
  const [addedUid, setAddedUid] = useState<string | null>(null);
  // The card stands in for the toast: closing it must not reveal the toast
  // still pending behind it.
  const closeAddedCard = useCallback(() => {
    setAddedUid(null);
    setToastName(null);
  }, []);
  // Opening the cart or another dish replaces the confirmation for good.
  useEffect(() => {
    if (isTabletUp && (isOpen || customization)) closeAddedCard();
  }, [isTabletUp, isOpen, customization, closeAddedCard]);
  const lastCartUid = () => {
    const items = useCartStore.getState().items;
    return items[items.length - 1]?.uid ?? null;
  };



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
  const scrollToSection = useCallback((catId: string, opts?: { instant?: boolean }) => {
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
        // Instant for deep links: the visitor never saw where the menu started,
        // so animating from the top only reads as the page jumping.
        mainRef.current.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: opts?.instant ? "auto" : "smooth",
        });

        requestAnimationFrame(() => {
          if (sidebarRef.current)
            sidebarRef.current.scrollTop = savedSidebarScroll;
        });

        // Unlock scroll-spy when the animation ends; fall back to 1.5 s.
        // (scrollend is not supported on iOS Safari < 16.4 — the timeout is the safety net.)
        // 1.5s covers long pages where iOS smooth-scroll can take > 1s.
        // Sections off screen use content-visibility with a 900px estimate;
        // as the smooth scroll passes them they render at their real height
        // and the target drifts ("French Toast" landed mid-screen). Once the
        // scroll ends, measure again and close the gap without animation —
        // twice, since the correction can reveal one more section.
        const correct = () => {
          const m = mainRef.current;
          if (!m) return;
          const drift =
            section.getBoundingClientRect().top -
            m.getBoundingClientRect().top -
            margin +
            8;
          if (Math.abs(drift) > 4) {
            m.scrollTo({ top: Math.max(0, m.scrollTop + drift), behavior: "auto" });
          }
        };
        const unlock = () => {
          correct();
          requestAnimationFrame(() => {
            correct();
            isScrollingRef.current = false;
          });
        };
        if (opts?.instant) {
          // No animation to wait for (and no scrollend if the position did not change).
          requestAnimationFrame(unlock);
          return;
        }
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
  const [mobilePillsH, setMobilePillsH] = useState(56);
  useEffect(() => {
    const el = mobilePillsBarRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (el.offsetHeight > 0) setMobilePillsH(el.offsetHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
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
    // Halfway through the hero is neither: the header has already gone opaque
    // and a sliver of cover photo (with the rating cut in half) stayed wedged
    // between it and the pills. Once the hero is partly gone, finish the job.
    const HERO_PARTLY_SCROLLED = 24;
    if (main.scrollTop > target || main.scrollTop > HERO_PARTLY_SCROLLED) {
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
    // 4 s: with an action in it, 2 s was too short to reach "Undo".
    toastTimer.current = setTimeout(() => setToastName(null), 4000);
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

  const undoQuickAdd = useCallback(() => {
    const prev = undoCartRef.current;
    const uid = undoUidRef.current;
    if (prev) {
      useCartStore.setState(prev);
    } else if (uid) {
      const { items, removeItem } = useCartStore.getState();
      const index = items.findIndex((i) => i.uid === uid);
      if (index >= 0) removeItem(index);
    }
    undoCartRef.current = null;
    undoUidRef.current = null;
    clearTimeout(toastTimer.current);
    setToastName(null);
  }, []);

  const handleQuickAdd = useCallback(
    (product: Product) => {
      const { items, reorderSkipped } = useCartStore.getState();
      undoCartRef.current = { items, reorderSkipped };
      undoUidRef.current = null;
      addItem(product, null, [], 1, "");
      showToast(product.name);
      if (isTabletUp && !customizationRef.current && !useCartStore.getState().isOpen) {
        setAddedUid(lastCartUid());
      }
      trackEvent("product_added_to_cart", {
        product_id: product.id,
        product_name: product.name,
        price: product.price,
        restaurant_id: restaurant.id,
      });
    },
    [addItem, showToast, restaurant.id, isTabletUp],
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
  // and had to reopen the cart to check the change. Every size has the cart
  // as an overlay now (no xl column since 2026-11-25), so it always reopens.
  const handleCloseCustomization = useCallback(() => {
    const wasEditing = customization !== null && customization.editIndex !== null;
    setQueuedNext(null);
    setCustomization(null);
    if (wasEditing) setOpen(true);
  }, [customization, setOpen]);

  const openCart = useCallback(() => setOpen(true), [setOpen]);

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
  // Each gate matches where the overlay is actually visible: the subcategory
  // sheet is xl:hidden, search and the category sheet lg:hidden; the cart is an
  // overlay at every size.
  const closeCart = useCallback(() => setOpen(false), [setOpen]);
  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery("");
  }, []);
  const closeCatSheet = useCallback(() => setShowCatSheet(false), []);
  const closeSubcatSheet = useCallback(() => setShowSubcatSheet(false), []);
  useBackToClose(isOpen, closeCart);
  useBackToClose(showSearch && !isDesktopView, closeSearch);
  useBackToClose(showCatSheet && !isDesktopView, closeCatSheet);
  useBackToClose(showSubcatSheet && !isXlView, closeSubcatSheet);
  useBackToClose(showInfo, closeInfo);
  useBackToClose(showReviews, closeReviews);
  useBackToClose(customization !== null, handleCloseCustomization);

  // Dishes served only part of the day (Oatmeal 5:30–11 AM, restaurant time).
  // Applied after mount only: the page is ISR-cached, so the server's clock is
  // not "now" and marking them during SSR would mismatch on hydration. A
  // one-minute clock re-evaluates them while the menu stays open.
  // Category hours (Breakfast 6–11) share the clock: read in the restaurant's
  // zone, never the phone's, and only after mount for the same ISR reason.
  const categoryHoursById = useMemo(() => {
    const m = new Map<string, { available_from: string | null; available_until: string | null }>();
    for (const c of categories) {
      const h = { available_from: c.available_from ?? null, available_until: c.available_to ?? null };
      if (hasHours(h)) m.set(c.id, h);
    }
    return m;
  }, [categories]);
  const anyProductHours = useMemo(
    () => categoryHoursById.size > 0 || products.some(hasHours),
    [products, categoryHoursById],
  );
  const [hoursClock, setHoursClock] = useState(0);
  useEffect(() => {
    if (!anyProductHours) return;
    setHoursClock(Date.now());
    const id = window.setInterval(() => setHoursClock(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [anyProductHours]);

  // Closed / paused, as one strip under the cover. Same rules as the checkout
  // (paused wins; demos never pause; no hours = always open).
  const storeNotice = useMemo<{ title: string; when?: string; hint?: string } | null>(() => {
    if (storeClock === 0) return null;
    const tz = restaurant.timezone || "UTC";
    const local = inTimeZone(new Date(storeClock), tz);
    const toMin = (d: Date) => d.getHours() * 60 + d.getMinutes();
    if (!isDemo && pausedUntil && Date.parse(pausedUntil) > storeClock) {
      const until = new Date(pausedUntil);
      // "Back at 7:30 PM" only when it's within the day; a pause "until
      // further notice" (far future) just says paused.
      const soon = until.getTime() - storeClock < 12 * 3_600_000;
      return {
        title: t.storePausedTitle,
        when: soon ? t.storeBackAt.replace("{time}", clockLabel(toMin(inTimeZone(until, tz)), locale)) : undefined,
      };
    }
    const hours = restaurant.operating_hours as OperatingHours | null | undefined;
    if (!hours || Object.keys(hours).length === 0 || isOpenAt(hours, local)) return null;
    const next = nextOpening(hours, local);
    let when: string | undefined;
    if (next) {
      const time = clockLabel(next.minutes, locale);
      if (next.daysAhead === 0) when = t.storeOpensAt.replace("{time}", time);
      else if (next.daysAhead === 1) when = t.storeOpensTomorrowAt.replace("{time}", time);
      else {
        // 2026-01-04 was a Sunday: +getDay() gives that weekday's name.
        const day = new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
          new Date(2026, 0, 4 + ((local.getDay() + next.daysAhead) % 7)),
        );
        when = t.storeOpensDayAt.replace("{day}", day).replace("{time}", time);
      }
    }
    return { title: t.ckClosedNow, when, hint: t.storeScheduleHint };
  }, [storeClock, restaurant.timezone, restaurant.operating_hours, isDemo, pausedUntil, t, locale]);
  const storeNoticeLine = storeNotice
    ? [storeNotice.title, storeNotice.when].filter(Boolean).join(" · ")
    : null;

  // Every product as it stands right now: realtime sold-out overrides and
  // dishes outside their hours. Search, favourites and suggestions read this so
  // an out-of-hours dish cannot be added from any corner of the menu.
  const liveProducts = useMemo(() => {
    const base = products;
    const local =
      hoursClock > 0 ? inTimeZone(new Date(hoursClock), restaurant.timezone || "UTC") : null;
    if (stockOverrides.size === 0 && !local) return base;
    return base.map((p) => {
      const override = stockOverrides.get(p.id);
      let q = override !== undefined ? { ...p, in_stock: override } : p;
      // Out of hours reads like sold out everywhere a card checks in_stock
      // (no add, no sheet, off Popular), but labelled with when it's served.
      if (local && q.in_stock !== false) {
        // The dish's own hours first, then its category's.
        const catHours = q.category_id ? categoryHoursById.get(q.category_id) : undefined;
        const closed =
          hasHours(q) && !isOptionAvailableAt(q, local)
            ? q
            : catHours && !isOptionAvailableAt(catHours, local)
              ? catHours
              : null;
        if (closed) {
          q = {
            ...q,
            in_stock: false,
            unavailable_note: t.servedHours(optionHoursLabel(closed, locale) ?? ""),
          };
        }
      }
      return q;
    });
  }, [products, stockOverrides, hoursClock, restaurant.timezone, t, locale, categoryHoursById]);

  // Reorder with the diner's choices: each dish with options is rebuilt from
  // today's menu (prices, option hours, new required questions) before it goes
  // back in the cart. Whatever can't be repeated as-is is listed in the cart.
  const reorderBusy = useRef(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const handleReorder = useCallback(async () => {
    if (!lastOrder || reorderBusy.current) return;
    reorderBusy.current = true;
    setReorderLoading(true);
    try {
      const local = inTimeZone(new Date(), restaurant.timezone || "UTC");
      const isAvailable = (o: ModifierOption) =>
        !o.sold_out && (!hasHours(o) || isOptionAvailableAt(o, local));
      const byId = new Map(liveProducts.map((p) => [p.id, p]));
      const groupsCache = new Map<string, Promise<ModifierGroup[] | null>>();
      const groupsFor = (productId: string) => {
        let pending = groupsCache.get(productId);
        if (!pending) {
          pending = fetch(`/api/product-modifiers?productId=${productId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => (d?.modifier_groups as ModifierGroup[] | undefined) ?? null)
            .catch(() => null);
          groupsCache.set(productId, pending);
        }
        return pending;
      };
      const resolved: Record<number, ModifierSelection[]> = {};
      await Promise.all(
        lastOrder.items.map(async (saved, idx) => {
          const product = byId.get(saved.productId);
          // Orders saved before options were kept have no `modifiers`: those
          // dishes still ask for their options again.
          if (!product?.has_modifiers || product.in_stock === false || !saved.modifiers) return;
          const groups = await groupsFor(product.id);
          if (!groups) return;
          const sel = rebuildSelections(groups, saved.modifiers, isAvailable);
          if (sel) resolved[idx] = sel;
        }),
      );
      // liveProducts, not products: a dish sold out or outside its hours stays
      // out of the cart and is listed as unavailable instead.
      const added = reorder(liveProducts, resolved);
      // Acting on the banner answers it: it must not come back on the next
      // visit (it used to, because only the X saved the choice).
      dismissReorder();
      if (added > 0) setOpen(true);
    } finally {
      reorderBusy.current = false;
      setReorderLoading(false);
    }
  }, [lastOrder, reorder, liveProducts, setOpen, restaurant.timezone, dismissReorder]);

  // "Pedir lo mismo" desde un email (?repeat=<pedido>&t=<token>): el pedido se
  // trae de la base (sirve en cualquier dispositivo) y pasa por el mismo
  // handleReorder, con precios y opciones de hoy. Tocar el link dos veces no
  // duplica el carrito: si ese pedido ya se agregó y el carrito tiene cosas,
  // solo se abre.
  const repeatPending = useRef(false);
  useEffect(() => {
    if (!hasMounted) return;
    const sp = new URLSearchParams(window.location.search);
    const orderId = sp.get("repeat");
    const token = sp.get("t");
    if (!orderId || !token) return;
    sp.delete("repeat");
    sp.delete("t");
    const qs = sp.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
    );
    const doneKey = `menius_repeat_done_${orderId}`;
    try {
      if (localStorage.getItem(doneKey) && useCartStore.getState().items.length > 0) {
        setOpen(true);
        return;
      }
    } catch {
      // Modo privado: se agrega igual.
    }
    fetch(`/api/public/order-repeat?o=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { restaurantId?: string; date?: string; items?: unknown[] } | null) => {
        if (!d || d.restaurantId !== restaurant.id || !Array.isArray(d.items) || d.items.length === 0) return;
        try {
          localStorage.setItem(doneKey, "1");
        } catch {
          // idem
        }
        repeatPending.current = true;
        useCartStore.setState({
          lastOrder: {
            restaurantId: restaurant.id,
            items: d.items as NonNullable<ReturnType<typeof useCartStore.getState>["lastOrder"]>["items"],
            date: d.date ?? new Date().toISOString(),
          },
        });
      })
      .catch(() => {
        // Link vencido o sin red: queda el menú normal.
      });
  }, [hasMounted, restaurant.id, setOpen]);
  useEffect(() => {
    if (!repeatPending.current || !lastOrder) return;
    repeatPending.current = false;
    void handleReorder();
  }, [lastOrder, handleReorder]);

  // Skipped dish tapped in the cart ("Choose the options again for: …").
  const openProductById = useCallback(
    (productId: string) => {
      const product = liveProducts.find((p) => p.id === productId);
      if (!product || product.in_stock === false) return;
      setOpen(false);
      setCustomization({ product, editIndex: null });
    },
    [liveProducts, setOpen],
  );

  // "Pedir lo mismo" desde el seguimiento: llega con ?reorder=1 y el pedido ya
  // guardado como último pedido → se pone en el carrito una sola vez.
  const reorderParamDone = useRef(false);
  useEffect(() => {
    // Wait for the hours clock: before it ticks, liveProducts doesn't know
    // yet which dishes are out of hours.
    if (!hasMounted || reorderParamDone.current) return;
    if (anyProductHours && hoursClock === 0) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('reorder') !== '1') return;
    reorderParamDone.current = true;
    if (lastOrder?.restaurantId === restaurant.id && lastOrder.items.length > 0) handleReorder();
    params.delete('reorder');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, [hasMounted, lastOrder, restaurant.id, handleReorder, anyProductHours, hoursClock]);

  const filteredProducts = useMemo(
    () =>
      !activeDiet
        ? liveProducts
        : liveProducts.filter((p) => p.dietary_tags?.includes(activeDiet)),
    [liveProducts, activeDiet],
  );

  const availableDietTags = useMemo(() => {
    const seen = new Set<DietaryTag>();
    for (const p of products) {
      if (p.dietary_tags) for (const tag of p.dietary_tags) seen.add(tag);
    }
    return DIETARY_TAGS.filter((t) => seen.has(t.id as DietaryTag));
  }, [products]);

  // Category open right now, in the restaurant's zone (it used to read the
  // diner's phone clock: a visitor in another zone, or with the clock off, saw
  // Breakfast open at dinner). Open until mounted, so SSR and hydration agree;
  // the server re-checks at checkout either way.
  const isCategoryAvailableNow = useCallback(
    (cat: { id: string }) => {
      const h = categoryHoursById.get(cat.id);
      if (!h || hoursClock === 0) return true;
      return isOptionAvailableAt(h, inTimeZone(new Date(hoursClock), restaurant.timezone || "UTC"));
    },
    [categoryHoursById, hoursClock, restaurant.timezone],
  );
  const categoryHoursLabel = useCallback(
    (cat: { id: string }) => {
      const h = categoryHoursById.get(cat.id);
      return h ? optionHoursLabel(h, locale) : null;
    },
    [categoryHoursById, locale],
  );

  const popularProducts = useMemo(() => {
    const inStock = filteredProducts.filter((p) => p.in_stock !== false);

    // Real sales data first — popularity_rank/orders_last_7d are filled weekly by
    // the recalc-popularity cron and until now only drove a badge on the card.
    // is_featured is the fallback: a new restaurant has no order history yet.
    // Only products above the real-volume minimum count as "ranked": a handful
    // of (often test) orders used to fill all 10 slots and hide every dish the
    // owner featured.
    const ranked = inStock
      .filter((p) => hasRealPopularity(p))
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

  // Classifier shared between suggestedProducts and the data-merge below.
  // Whole words only: as bare substrings "te" (tea) matched omelet-te and
  // chocola-te, "latte" matched p-latte-r and "corn" matched corned beef, so an
  // omelette, chocolate-chip pancakes and a seafood platter were all "drinks".
  // No "waffle" in desserts: in a diner a Belgian waffle is breakfast, and it
  // put an $18.95 chicken & waffle under a burger as "dessert".
  const classifyProduct = useCallback(
    (
      catName: string,
      productName: string,
    ): "drink" | "dessert" | "side" | "main" => {
      const text = `${catName} ${productName}`.toLowerCase();
      if (
        /(?:^|[^a-zà-ÿ])(?:bebida|bebidas|drink|drinks|refresco|soda|agua\b|jugo|jugos|juice|juices|cerveza|beer|vino|wine|shake|batido|batidos|caf[eé]|coffee|t[eé]\b|smoothie|smoothies|limon|milkshake|horchata|margarita|coctel|cocktail|limonada|frapp[eé]|cappuccino|latte|espresso|gatorade|red bull|energy|agua mineral|sparkling|kombucha|infusion|chai|matcha|mojito|sangria|michelada|tepache|agua fresca|jamaica|tamarindo|hibiscus|lemonade|limeade|iced tea|naranjada|fresco|fresca|refresco|zumo|beber|brebaje)s?(?![a-zà-ÿ])/i.test(
          text,
        )
      )
        return "drink";
      if (
        /(?:^|[^a-zà-ÿ])(?:postre|postres|dessert|desserts|helado|helados|ice cream|pastel|cake|brownie|dulce|sweet|cookie|tiramisú|flan|churro|cheesecake|mousse|pudding|gelato|sorbet|donut|muffin|crepe|tarta|pie|eclair|profiterole|macaron|tres leches|panna cotta|tiramisu|cannoli|semifreddo|paleta|gelatina|mazapán)s?(?![a-zà-ÿ])/i.test(
          text,
        )
      )
        return "dessert";
      if (
        /(?:^|[^a-zà-ÿ])(?:acompañ|acompañamiento|side|sides|ensalada|salad|sopa|soup|papa|fries|chips|guarnición|arroz|rice|wings|alitas|nachos|onion ring|mozzarella stick|guacamole|dip|coleslaw|breadstick|garlic bread|pan de ajo|bastones|elote|corn|coliflor|cauliflower|brócoli|broccoli|jalapeño|poppers|tater tot|yuca|plantain|patacón|tostón|boniato|camote|edamame|dumplings|gyoza|spring roll|rollo|extras?|adicional|complemento|entrante|entrada|appetizer|starter)s?(?![a-zà-ÿ])/i.test(
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

    const productMap = new Map(liveProducts.map((p) => [p.id, p]));
    // Candidates are typed by their CATEGORY only — "Desserts", "Side Orders",
    // "Juices" is how the owner already sorted them. Guessing from the dish
    // name can't be made reliable: "Crab Cakes Benedict" reads as cake. A dish
    // whose category says nothing counts as a main.
    const typeOf = (p: Product) =>
      classifyProduct(
        categories.find((c) => c.id === p.category_id)?.name ?? "",
        "",
      );
    // Opening a main means the diner already chose dinner: offer what goes
    // with it (drink, side, dessert), never another main. Co-occurrence from
    // a few (test) orders put pancakes, an omelette and a $45.95 platter
    // under a burger, and it outranks the rule-based fallback.
    const mainIsMain =
      classifyProduct(
        categories.find((c) => c.id === mainProduct.category_id)?.name ?? "",
        mainProduct.name,
      ) === "main";
    // The "Pair it with" carousel is a row of photo cards: a product without a
    // visible photo renders as an empty grey square. Buccaneer has ~90 drinks
    // without photos and drinks rank first for mains, so the row was mostly
    // empty boxes. Only suggest products that actually show a photo.
    const isEligible = (p: Product) =>
      p.id !== mainProduct.id &&
      p.in_stock !== false &&
      !cartProductIds.has(p.id) &&
      !showsAsRow(p) &&
      !(mainIsMain && typeOf(p) === "main");

    // Time-of-day context: filter alcohol before noon
    const hour = inTimeZone(new Date(), restaurant.timezone || "UTC").getHours();
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
    const mainType = mainIsMain
      ? "main"
      : classifyProduct(
          categories.find((c) => c.id === mainProduct.category_id)?.name ?? "",
          mainProduct.name,
        );

    const wantOrder: Array<"drink" | "dessert" | "side" | "main"> = (() => {
      if (mainType === "main") return ["drink", "side", "dessert"];
      if (mainType === "side") return ["drink", "main", "dessert"];
      if (mainType === "dessert") return ["drink", "main"];
      // drink → suggest food
      return ["main", "side", "dessert"];
    })();

    const remaining = MAX_SUGGESTIONS - dataProducts.length;

    // One queue per wanted type (featured first), then dealt round-robin:
    // sorting by type alone filled all 12 slots with drinks, so a burger never
    // got fries or a slice of cake. Types outside wantOrder only fill leftovers.
    const candidates = liveProducts.filter(
      (p) =>
        isEligible(p) &&
        !seen.has(p.id) &&
        !(isBreakfastHour && isAlcohol(p)),
    );
    const byFeatured = (a: Product, b: Product) =>
      Number(!!b.is_featured) - Number(!!a.is_featured);
    const queues = wantOrder.map((type) =>
      candidates.filter((p) => typeOf(p) === type).sort(byFeatured),
    );
    const fallback: Product[] = [];
    while (fallback.length < remaining && queues.some((q) => q.length > 0)) {
      for (const q of queues) {
        const next = q.shift();
        if (next && fallback.length < remaining) fallback.push(next);
      }
    }
    if (fallback.length < remaining) {
      const rest = candidates
        .filter((p) => !wantOrder.includes(typeOf(p)))
        .sort(byFeatured);
      fallback.push(...rest.slice(0, remaining - fallback.length));
    }

    return [...dataProducts, ...fallback];
  }, [
    customization?.product,
    restaurant.timezone,
    liveProducts,
    categories,
    cartProductIds,
    dataBasedSuggestionIds,
    classifyProduct,
  ]);

  // "Complete your order": looks at the WHOLE cart (lib/cart-suggestions) —
  // what kind is missing (drink, side, dessert) and the owner's pairings of
  // every dish in it. It used to anchor on the last item only, and the cart
  // never drew it once it had items.
  const cartIdsKey = useCartStore((s) => s.items.map((i) => i.product.id).join(","));
  const [cartPairings, setCartPairings] = useState<Map<string, string[]>>(() => new Map());
  useEffect(() => {
    const ids = Array.from(new Set(cartIdsKey.split(",").filter(Boolean)));
    if (ids.length === 0) {
      setCartPairings(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getSupabaseBrowser()
          .from("product_pairings")
          .select("product_id, paired_id, sort_order")
          .in("product_id", ids)
          .order("sort_order", { ascending: true });
        if (cancelled) return;
        const map = new Map<string, string[]>();
        for (const r of (data ?? []) as Array<{ product_id: string; paired_id: string }>) {
          const list = map.get(r.product_id) ?? [];
          list.push(r.paired_id);
          map.set(r.product_id, list);
        }
        setCartPairings(map);
      } catch {
        // Non-critical — the menu-order fallback still fills the row.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartIdsKey]);

  const cartBasedSuggestions = useMemo(() => {
    const cartIds = cartIdsKey.split(",").filter(Boolean);
    if (cartIds.length === 0) return [];

    const hour = inTimeZone(new Date(), restaurant.timezone || "UTC").getHours();
    const isBreakfastHour = hour >= 5 && hour < 11;
    const alcoholRegex =
      /cerveza|beer|vino|wine|margarita|coctel|cocktail|mojito|sangria|michelada|alcohol/i;
    const catName = (p: Product) => categories.find((c) => c.id === p.category_id)?.name ?? "";

    return cartSuggestions({
      cartProductIds: cartIds,
      products: liveProducts,
      // By category only, as in the sheet: "Crab Cakes Benedict" is not a cake.
      kindOf: (p) => classifyProduct(catName(p), ""),
      pairings: cartPairings,
      isAllowed: (p) =>
        p.in_stock !== false &&
        p.is_active !== false &&
        !(isBreakfastHour && alcoholRegex.test(`${p.name} ${catName(p)}`)),
      limit: 4,
    });
  }, [
    cartIdsKey,
    cartPairings,
    restaurant.timezone,
    liveProducts,
    categories,
    classifyProduct,
  ]);

  // Add-on search fallback: only drinks, sides and desserts — a dish's add-on
  // box never sends the diner off to another main.
  const findOnMenu = useCallback(
    (query: string): Product[] => {
      const catName = (p: Product) => categories.find((c) => c.id === p.category_id)?.name ?? "";
      const pool = liveProducts.filter(
        (p) =>
          p.in_stock !== false &&
          p.is_active !== false &&
          p.id !== customization?.product.id &&
          classifyProduct(catName(p), "") !== "main",
      );
      return searchMenu({ products: pool, categories, query, locale, defaultLocale }) ?? [];
    },
    [liveProducts, categories, classifyProduct, customization?.product.id, locale, defaultLocale],
  );

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

  // ── Hoja del día: botón "Today" (barra, hoja "Menu" y columna de escritorio).
  // Solo existe los días que hay hoja, y está marcado mientras la hoja se ve.
  const todayCount = useMemo(() => (today ? todayItemCount(products) : 0), [today, products]);
  const hasToday = todayCount > 0;
  const todayLabel = locale === "es" ? "Hoy" : "Today";
  const onHome = !activeCatFilter || activeCatFilter === POPULAR_ID;
  const [todayInView, setTodayInView] = useState(true);
  useEffect(() => {
    const main = mainRef.current;
    if (!main || !hasToday) return;
    const onScroll = () => {
      const el = sectionRefs.current.get(TODAY_ID);
      if (!el) return;
      const covered =
        window.innerWidth >= 1024
          ? (desktopPillsRef.current?.offsetHeight ?? 44)
          : HEADER_HEIGHT + (mobilePillsRef.current?.offsetHeight ?? 52);
      // Marcado hasta que la hoja termina de pasar por debajo de la barra.
      setTodayInView(el.getBoundingClientRect().bottom > main.getBoundingClientRect().top + covered + 24);
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => main.removeEventListener("scroll", onScroll);
  }, [hasToday, mainMounted, activeCatFilter]);
  const todayActive = hasToday && onHome && todayInView && !showFavs && !activeDiet && !searchQuery.trim();

  // Desde otra categoría, primero vuelve a la portada y después baja a la hoja,
  // cuando ya está dibujada.
  // Con hoja, "Popular items" ya no es "el principio": baja a su sección, debajo
  // de la hoja (si no, el botón marcado pasaba a ser "Today").
  const pendingHomeScrollRef = useRef<string | null>(null);
  const goToHomeSection = useCallback(
    (id: typeof TODAY_ID | typeof POPULAR_ID) => {
      setSearchQuery("");
      setShowSearch(false);
      setShowFavs(false);
      setActiveDiet(null);
      categoryClickedRef.current = true;
      if (isLargeCatalog && activeCatFilter && activeCatFilter !== POPULAR_ID) {
        pendingHomeScrollRef.current = id;
        setActiveCatFilter(null);
        setActiveCategory(null);
        return;
      }
      scrollToSection(id);
    },
    [isLargeCatalog, activeCatFilter, scrollToSection],
  );
  const goToToday = useCallback(() => goToHomeSection(TODAY_ID), [goToHomeSection]);
  useEffect(() => {
    const id = pendingHomeScrollRef.current;
    if (!id || !sectionRefs.current.get(id)) return;
    pendingHomeScrollRef.current = null;
    requestAnimationFrame(() => scrollToSection(id));
  }, [displayedGroups, scrollToSection]);

  // ── Menu position restore (pairs with saveMenuPosition above) ──
  // Deep links that position the menu themselves win over the memory. Read on
  // the very first commit: the ?reorder handler strips the param from the URL
  // one render later, before the restore effect below gets to look.
  const skipMenuRestoreRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    skipMenuRestoreRef.current =
      params.get("reorder") === "1" ||
      window.location.hash.length > 1 ||
      params.has("item") ||
      params.has("category");
  }, []);

  // ── Deep links: ?item=<product id> opens that dish; ?category=<id or name>
  // lands on that section. For links shared outside the menu (the restaurant's
  // site, Instagram, WhatsApp). Runs once; the params are stripped afterwards
  // so a later reload or back-navigation behaves like a normal visit.
  const deepLinkDoneRef = useRef(false);
  const [deepLinkSection, setDeepLinkSection] = useState<string | null>(null);
  useEffect(() => {
    if (!mainMounted || deepLinkDoneRef.current) return;
    // Wait for the hours clock so an out-of-hours dish is known as such.
    if (anyProductHours && hoursClock === 0) return;
    deepLinkDoneRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get("item");
    const catParam = params.get("category")?.trim().toLowerCase() ?? "";
    if (!itemId && !catParam) {
      revealDeepLink();
      return;
    }

    const product = itemId
      ? liveProducts.find((p) => p.id === itemId && p.is_active !== false)
      : undefined;
    const category = product
      ? categories.find((c) => c.id === product.category_id)
      : catParam
        ? categories.find(
            (c) => c.id === catParam || c.name.trim().toLowerCase() === catParam,
          )
        : undefined;

    if (category) {
      // Treated like a click so the pill bar and sidebar jump straight to the
      // category instead of sliding over while the menu appears.
      categoryClickedRef.current = true;
      if (isLargeCatalog) {
        const filterId =
          groupsActive && category.group_name
            ? `${GROUP_PREFIX}${category.group_name}`
            : category.id;
        setActiveCatFilter(filterId);
        setActiveCategory(filterId);
      } else {
        setActiveCategory(category.id);
      }
      setDeepLinkSection(category.id);
    } else {
      revealDeepLink();
    }
    // Sold out or outside its hours (Oatmeal at 3 PM): land on its section,
    // where the card says when it's served, instead of opening a sheet the
    // checkout would reject.
    if (product && product.in_stock !== false) handleProductSelect(product);

    params.delete("item");
    params.delete("category");
    const qs = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainMounted, hoursClock]);

  // Scroll once the deep-linked category is committed (it may belong to a
  // group that was not on screen until the filter above applied).
  useEffect(() => {
    if (!deepLinkSection) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        scrollToSection(deepLinkSection, { instant: true });
        menuPosReadyRef.current = true;
        setDeepLinkSection(null);
        // After scrollToSection's correction frame and the compact header swap
        // (its IntersectionObserver fires a beat after the scroll).
        setTimeout(revealDeepLink, 120);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [deepLinkSection, scrollToSection]);

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
        products: liveProducts,
        categories,
        query: searchQuery,
        locale,
        defaultLocale,
      }),
    [searchQuery, liveProducts, categories, locale, defaultLocale],
  );

  // ── Búsqueda en lenguaje natural ──
  // Solo entra cuando el motor léxico no encontró nada Y la consulta parece una
  // frase ("algo liviano para mi hijo") en vez de un nombre de plato. Es
  // aditiva: si está apagada o falla la red, la búsqueda de siempre no cambia.
  const naturalSearch = useNaturalSearch({
    enabled: Boolean(storeConfig.naturalSearch),
    query: searchQuery,
    restaurantId: restaurant.id,
    products: liveProducts,
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

  // Section under each search result ("Burgers · 7 oz."): a flat list of
  // names didn't say where a dish lives.
  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, tName(c, locale, defaultLocale)])),
    [categories, locale, defaultLocale],
  );
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Desktop: searching from far down the page left the results (and their
  // count) above the fold, with the footer on screen. When results appear,
  // bring their top into view once.
  const searchResultsTopRef = useRef<HTMLDivElement | null>(null);
  const searchShown = searchResults !== null;
  useEffect(() => {
    if (!searchShown || window.innerWidth < 1024) return;
    const main = mainRef.current;
    const el = searchResultsTopRef.current;
    if (!main || !el) return;
    const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 24;
    if (main.scrollTop > top) main.scrollTo({ top: Math.max(0, top) });
  }, [searchShown]);

  const renderSearchRow = (product: Product) => {
    const unavailable = product.in_stock === false;
    const section = categoryNameById.get(product.category_id);
    const desc = tDesc(product, locale, defaultLocale);
    return (
      <button
        key={product.id}
        type="button"
        onClick={() => openProductFromSearch(product)}
        className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
      >
        {!showsAsRow(product) && product.image_url && (
          <div
            className={cn(
              "relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0",
              unavailable && "opacity-50",
            )}
          >
            <Image
              src={product.image_url}
              alt=""
              fill
              sizes="56px"
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
          <p
            className={cn(
              "text-[15px] font-semibold truncate",
              unavailable ? "text-gray-600" : "text-gray-900",
            )}
          >
            {tName(product, locale, defaultLocale)}
          </p>
          <p
            className={cn(
              "text-[13px] truncate mt-0.5",
              unavailable ? "font-medium text-gray-700" : "text-gray-600",
            )}
          >
            {unavailable
              ? (product.unavailable_note ?? t.soldOut)
              : [section, desc].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span
          className={cn(
            "text-[15px] font-semibold tabular-nums flex-shrink-0",
            unavailable ? "text-gray-600" : "text-gray-900",
          )}
        >
          {fmtPrice(Number(product.price))}
        </span>
      </button>
    );
  };

  // A way out of an empty field and of "no results": real dishes with photos,
  // not tips (Baymard: no-results pages that only give advice are dead ends).
  const renderPopularForSearch = () => {
    const list = popularProducts.slice(0, 5);
    if (list.length === 0) return null;
    return (
      <section aria-label={t.popularItems}>
        <h3 className="px-2 mb-1 text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
          {t.popularItems}
        </h3>
        {list.map(renderSearchRow)}
      </section>
    );
  };

  const renderNoSearchResults = (onClear: () => void) => (
    <div>
      <div className="pt-8 pb-8 text-center">
        <SearchX
          className="w-10 h-10 mx-auto text-gray-500"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="mt-3 text-[17px] font-semibold text-gray-900">
          {t.noResults}
        </p>
        <p className="mt-1 text-[14px] text-gray-600">{t.tryDifferentSearch}</p>
        <button
          type="button"
          onClick={onClear}
          className="mt-5 h-11 px-5 rounded-full border border-gray-300 text-[14px] font-semibold text-gray-900 hover:bg-gray-50 active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
        >
          {t.clearSearch}
        </button>
      </div>
      {renderPopularForSearch()}
    </div>
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
        // Desktop has no overlay: the field lives in the header.
        const desktopInput =
          window.innerWidth >= 1024
            ? document.getElementById("menu-search-desktop")
            : null;
        if (desktopInput) desktopInput.focus();
        else setShowSearch(true);
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

  // Mobile pill renderer — modern squircle style, premium dark active state
  const mobileCategoryPill = (id: string, label: string, isActive: boolean) => (
    <button
      key={id}
      data-pill-id={id}
      onClick={() => handleCategorySelect(id)}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[15px] font-medium whitespace-nowrap",
        isActive
          ? "bg-gray-900 text-white"
          : "bg-white/70 text-gray-700 active:bg-gray-200",
      )}
    >
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
      if (cat.id === TODAY_ID) return todayCount;
      if (isGroupId(cat.id)) {
        const grp = groupNameFromId(cat.id);
        const ids = new Set(
          categories.filter((c) => c.group_name === grp).map((c) => c.id),
        );
        return products.filter((p) => ids.has(p.category_id)).length;
      }
      return products.filter((p) => p.category_id === cat.id).length;
    },
    [categories, products, popularProducts.length, todayCount],
  );

  // ── "Menu" sheet: Popular first, every group with its dish count, and the
  // sections of groups that have 3 or more (the same threshold as the
  // floating "Sections" button).
  const menuSheetEntries = useMemo<MenuSheetEntry[]>(() => {
    const entries: MenuSheetEntry[] = [];
    if (hasToday) {
      entries.push({ id: TODAY_ID, label: todayLabel, count: todayCount, sections: [] });
    }
    if (
      isLargeCatalog &&
      popularProducts.length > 0 &&
      !visibleCats.some((c) => c.id === POPULAR_ID)
    ) {
      entries.push({
        id: POPULAR_ID,
        label: t.popularItems,
        count: popularProducts.length,
        sections: [],
      });
    }
    for (const cat of visibleCats) {
      let sections: MenuSheetEntry["sections"] = [];
      if (isGroupId(cat.id)) {
        const grp = groupNameFromId(cat.id);
        sections = categories
          .filter((c) => c.group_name === grp)
          .map((c) => ({
            id: c.id,
            label: tName(c, locale, defaultLocale),
            count: countForSidebar(c),
          }))
          .filter((sec) => sec.count > 0);
        if (sections.length < 3) sections = [];
      }
      entries.push({
        id: cat.id,
        label:
          cat.id === POPULAR_ID ? t.popularItems : tName(cat, locale, defaultLocale),
        count: countForSidebar(cat),
        sections,
      });
    }
    return entries;
  }, [isLargeCatalog, popularProducts.length, visibleCats, categories, countForSidebar, locale, defaultLocale, t, hasToday, todayLabel, todayCount]);

  // Desktop sidebar: Popular first. Without it, once a category was picked
  // there was no way back to Popular on desktop (the pills bar that had it
  // repeated the sidebar and is gone).
  const sidebarCats = useMemo<Category[]>(() => {
    const base = groupsActive ? visibleCats : categories;
    const pseudo = (id: string, name: string) =>
      ({
        ...(base[0] ?? categories[0]),
        id,
        name,
        translations: undefined,
        group_name: null,
        available_from: null,
        available_to: null,
      }) as Category;
    const head: Category[] = [];
    if (hasToday) head.push(pseudo(TODAY_ID, todayLabel));
    if (popularProducts.length > 0 && !base.some((c) => c.id === POPULAR_ID)) {
      head.push(pseudo(POPULAR_ID, t.popularItems));
    }
    return head.length ? [...head, ...base] : base;
  }, [groupsActive, visibleCats, categories, popularProducts.length, t.popularItems, hasToday, todayLabel]);

  const menuSheetActiveId = todayActive
    ? TODAY_ID
    : isLargeCatalog
      ? (activeCatFilter ?? (popularProducts.length > 0 ? POPULAR_ID : null))
      : activePillId;

  const closeMenuSheet = useCallback(() => {
    setShowCatSheet(false);
    setShowSubcatSheet(false);
  }, []);

  const handleMenuSheetSelect = useCallback(
    (id: string) => {
      closeMenuSheet();
      if (id === TODAY_ID) {
        goToToday();
        return;
      }
      if (id === POPULAR_ID && hasToday) {
        goToHomeSection(POPULAR_ID);
        return;
      }
      if (id === POPULAR_ID && isLargeCatalog) {
        // Same as the "Popular" pill: the unfiltered view, from the top.
        setActiveCatFilter(null);
        setActiveCategory(null);
        mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
      handleCategorySelect(id);
    },
    [closeMenuSheet, isLargeCatalog, handleCategorySelect, goToToday, hasToday, goToHomeSection],
  );

  // A section of a group that isn't on screen yet: switch group, then scroll
  // once its list has rendered.
  const pendingSectionRef = useRef<string | null>(null);
  const handleMenuSheetSection = useCallback(
    (groupId: string, sectionId: string) => {
      closeMenuSheet();
      if (activeCatFilter === groupId) {
        // Next frame: the sheet's exit must not fight the smooth scroll.
        requestAnimationFrame(() => scrollToSection(sectionId));
        return;
      }
      pendingSectionRef.current = sectionId;
      handleCategorySelect(groupId);
    },
    [closeMenuSheet, activeCatFilter, scrollToSection, handleCategorySelect],
  );
  useEffect(() => {
    const id = pendingSectionRef.current;
    if (!id || !displayedGroups.some((g) => g.category.id === id)) return;
    pendingSectionRef.current = null;
    requestAnimationFrame(() => scrollToSection(id));
  }, [displayedGroups, scrollToSection]);

  // Desktop fav / diet pills

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
        "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[15px] font-medium whitespace-nowrap",
        showFavs
          ? "bg-gray-900 text-white"
          : "bg-white/70 text-gray-700 active:bg-gray-200",
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
          className="flex-shrink-0 flex items-center justify-center w-11 h-11 ml-1 rounded-lg text-gray-600 active:bg-gray-200 transition-colors"
          aria-label={t.browseCategoriesAriaLabel}
        >
          <AlignJustify className="w-[18px] h-[18px]" />
        </button>
        {/* Vertical divider */}
        <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" aria-hidden />
        <div
          ref={mobilePillsRefCb}
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
          {/* Hoja del día: primero, solo los días que hay hoja. */}
          {hasToday && (
            <button
              data-pill-id={TODAY_ID}
              onClick={goToToday}
              aria-current={todayActive ? "true" : undefined}
              style={{ touchAction: "manipulation" }}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[15px] font-medium whitespace-nowrap",
                todayActive ? "bg-gray-900 text-white" : "bg-white/70 text-gray-700 active:bg-gray-200",
              )}
            >
              {todayLabel}
            </button>
          )}
          {/* Large catalog: home pill. Labelled "Popular" because that's what the
              unfiltered view now shows — calling it "All" would be a lie. */}
          {isLargeCatalog && (
            <button
              data-pill-id="__all__"
              onClick={() => {
                if (hasToday && popularProducts.length > 0) {
                  goToHomeSection(POPULAR_ID);
                  return;
                }
                setActiveCatFilter(null);
                setActiveCategory(null);
                mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
              }}
              style={{ touchAction: "manipulation" }}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[15px] font-medium whitespace-nowrap",
                // One active state for every tab (2026-11-16): the amber Popular
                // pill was a second accent competing with the menu's green.
                !activeCatFilter && !showFavs && !activeDiet && !todayActive
                  ? "bg-gray-900 text-white"
                  : "bg-white/70 text-gray-700 active:bg-gray-200",
              )}
            >
              {popularProducts.length > 0 ? (
                t.popularItems
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
                : activePillId === cat.id && !showFavs && !activeDiet && !todayActive,
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
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-[7px] rounded-lg text-[15px] font-semibold whitespace-nowrap bg-brand-500 text-[#04241E] shadow-sm active:bg-brand-600"
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
      ref={dietPillsRefCb}
      className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-2 -mx-0"
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
    >
      {availableDietTags.map((tag) => {
        const isActive = activeDiet === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() =>
              setActiveDiet(isActive ? null : (tag.id as DietaryTag))
            }
            aria-pressed={isActive}
            style={{ touchAction: "manipulation" }}
            className={cn(
              "flex-shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-[14px] font-medium whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]",
              isActive
                ? "bg-[#05c8a7] border-[#05c8a7] text-[#04241E] font-semibold"
                : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 active:bg-gray-100",
            )}
          >
            <DietIcon tag={tag.id} className="w-4 h-4" />
            <span>{locale === "en" ? tag.labelEn : tag.labelEs}</span>
            {isActive && <X className="w-3.5 h-3.5 -mr-0.5" aria-hidden="true" />}
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
            backUrl={backUrl ?? siteBackUrl}
            isScrolled={headerScrolled}
            hasCover={hasCover}
            locale={locale}
            loyaltyPoints={loyaltyData?.points ?? null}
            languages={hasMultiLang ? availableLocales : undefined}
            onLocaleChange={(code) => setLocale(code as Locale)}
            cartCount={cartCount}
            cartTotal={cartTotal}
            onOpenCart={openCart}
          />
        </div>

        {/* ── Outer scroll: banner scrolls away, sidebar/cart stay sticky ── */}
        <div
          ref={mainRefCb}
          id="main-content"
          tabIndex={-1}
          className={`flex-1 overflow-y-auto overscroll-contain outline-none max-w-[1440px] w-full mx-auto ${cartCount > 0 ? "pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0" : "pb-[env(safe-area-inset-bottom)]"}`}
          style={
            {
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            } as React.CSSProperties
          }
        >
          {/* Cover banner — full width, scrolls away naturally with content.
              lg was 288px: on a 1024x768 iPad or a 1280x800 laptop the cover
              plus header pushed the first dishes to y=373, half the screen.
              224px, and 176px on screens 820px tall or less. */}
          {restaurant.cover_image_url && (
            <div
              ref={bannerRef}
              className="relative w-full h-48 sm:h-56 lg:h-56 lg:[@media(max-height:820px)]:h-44 bg-gray-100 overflow-hidden"
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
                quality={60}
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
                  <button
                    type="button"
                    onClick={() => setShowReviews(true)}
                    disabled={!recentReviews?.length}
                    aria-haspopup="dialog"
                    className="flex items-center gap-1.5 mt-1.5 -ml-1 px-1 min-h-[32px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-sm" aria-hidden="true" />
                    <span className="text-sm font-bold text-white drop-shadow-sm tabular-nums">
                      {reviewStats.average}
                    </span>
                    <span className="text-[13px] text-white/90 underline underline-offset-2 decoration-white/50">
                      {reviewStats.total} {t.reviews}
                    </span>
                  </button>
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
                    // White on the photo: the dark teal (#047a65) used here
                    // vanished on a dark cover — "Open 24 hours" was unreadable.
                    <button
                      type="button"
                      onClick={() => setShowInfo(true)}
                      aria-haspopup="dialog"
                      className="group flex items-center gap-4 mt-2 text-[15px] text-white/90 hover:text-white text-left rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      style={{ textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}
                    >
                      {restaurant.address && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
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
                          const dayKey = days[inTimeZone(new Date(), restaurant.timezone || "UTC").getDay()];
                          const dh = restaurant.operating_hours?.[dayKey];
                          if (!dh || dh.closed) return null;
                          const is24h =
                            dh.open === "00:00" && dh.close === "23:59";
                          return (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                              <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                              {is24h ? t.open24h : hoursRangeLabel(dh.open, dh.close, locale)}
                            </span>
                          );
                        })()}
                      <span className="inline-flex items-center font-semibold text-white underline-offset-4 group-hover:underline">
                        {t.infoShort}
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </span>
                    </button>
                  )}
                </div>
                {reviewStats && reviewStats.total > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowReviews(true)}
                    disabled={!recentReviews?.length}
                    aria-haspopup="dialog"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/35 backdrop-blur-sm border border-white/20 flex-shrink-0 hover:bg-black/45 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" aria-hidden="true" />
                    <span className="text-sm font-bold text-white tabular-nums">
                      {reviewStats.average}
                    </span>
                    <span className="text-sm text-white/90">
                      {reviewStats.total} {t.reviews}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Store info row (phone/tablet): today's hours + street, opens the
              info sheet with the week, directions and the phone. */}
          {(restaurant.address ||
            (restaurant.operating_hours &&
              Object.keys(restaurant.operating_hours).length > 0)) &&
            (() => {
              const hrs = restaurant.operating_hours;
              const todayKey = [
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
              ][inTimeZone(new Date(), restaurant.timezone || "UTC").getDay()];
              const today =
                hrs && Object.keys(hrs).length > 0
                  ? dayHoursText(hrs[todayKey], locale, t)
                  : null;
              const street = restaurant.address?.split(",")[0]?.trim() ?? "";
              return (
                <button
                  type="button"
                  onClick={() => setShowInfo(true)}
                  aria-haspopup="dialog"
                  className="lg:hidden w-full flex items-center gap-2 px-4 min-h-[44px] bg-white border-b border-gray-100 text-left text-[14px] text-gray-700 active:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#05c8a7]"
                >
                  <Clock
                    className="w-4 h-4 text-[#047a65] flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">
                    {today && (
                      <span className="font-semibold text-gray-900">{today}</span>
                    )}
                    {today && street && " · "}
                    {street}
                  </span>
                  <span className="ml-auto flex items-center flex-shrink-0 font-semibold text-[#047a65]">
                    {t.infoShort}
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </button>
              );
            })()}

          {/* Closed / paused: a strip in the flow under the cover, every width.
              Before, the phone showed nothing (the whole cart could be built
              and the checkout said "closed"), desktop had only a small pill
              while the cover still read like open hours, and the pause was a
              floating orange pill that covered the search. */}
          {storeNotice && (
            <div
              role="status"
              className="flex items-start gap-2.5 px-4 lg:px-8 py-3 bg-[#fff6e0] border-b border-[#f1e0b6] text-[14px] leading-snug text-[#5c3a00]"
            >
              <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <p className="min-w-0">
                <span className="font-semibold">{storeNotice.title}</span>
                {storeNotice.when && <span> · {storeNotice.when}{storeNotice.hint ? "." : ""}</span>}
                {storeNotice.hint && (
                  <span className="block sm:inline text-[#7a4d00] sm:ml-1.5">{storeNotice.hint}</span>
                )}
              </p>
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
                  ? `calc(${HEADER_HEIGHT + mobilePillsH}px + env(safe-area-inset-top))`
                  : `${mobilePillsH}px`,
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
              className="hidden lg:flex flex-col w-[224px] xl:w-[232px] flex-shrink-0 border-r border-gray-100 sticky top-0 h-[calc(100dvh-48px)] overflow-y-auto"
            >
              <CategorySidebar
                categories={sidebarCats}
                products={products}
                activeCategory={searchQuery.trim() ? null : menuSheetActiveId}
                onSelect={(id) => id && handleMenuSheetSelect(id)}
                allLabel={t.allCategories}
                locale={locale}
                defaultLocale={defaultLocale}
                countFor={countForSidebar}
                isAvailable={isCategoryAvailableNow}
                hoursLabel={categoryHoursLabel}
                subcategories={subcatsOfActiveGroup}
                onSelectSubcategory={scrollToSection}
              />
            </aside>

            {/* Center: wrapper so sticky pills + products stack vertically */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Desktop: the sidebar is the one category control. The pills
                  bar that repeated it (and was the only home of "Popular")
                  is gone; what stays is the dietary filter row, only for
                  restaurants that tag dishes. */}
              <div
                ref={desktopPillsRef}
                className={cn(
                  "hidden sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100",
                  availableDietTags.length > 0 && "lg:block",
                )}
              >
                {availableDietTags.length > 0 && dietaryPills}
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
                            ({reviewStats.total})
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
                      disabled={reorderLoading}
                      aria-busy={reorderLoading || undefined}
                      className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-[#05c8a7] text-[#04241E] text-xs font-bold active:scale-95 transition-transform disabled:opacity-60"
                    >
                      {t.addToCart}
                    </button>
                    <button
                      onClick={dismissReorder}
                      className="flex-shrink-0 -mr-2 w-10 h-10 flex items-center justify-center rounded-full text-[#047a65] hover:bg-[#d0f7f1] transition-colors"
                      aria-label={t.cancel}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Table context banner — shown when customer arrives via table QR */}
                {hasMounted && activeTableName && !tableBannerDismissed && (
                  <div className="mx-4 lg:mx-8 mt-3 lg:mt-5 flex items-center gap-3 pl-4 pr-1 py-1.5 rounded-2xl bg-[#e6faf7] border border-[#b3efe6]">
                    <div className="w-9 h-9 rounded-xl bg-[#d0f7f1] flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed
                        className="w-4 h-4 text-[#047a65]"
                        strokeWidth={2.25}
                        aria-hidden="true"
                      />
                    </div>
                    {/* The QR carries the bare table ("12"): say what it is. */}
                    <p className="flex-1 min-w-0 text-sm font-semibold text-[#047a65] truncate">
                      {/^\d+$/.test(activeTableName.trim())
                        ? `${t.tableWord} ${activeTableName.trim()}`
                        : activeTableName}
                      {" · "}
                      {t.dineIn}
                    </p>
                    <button
                      onClick={() => setTableBannerDismissed(true)}
                      className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-[#047a65] hover:bg-[#d0f7f1] transition-colors"
                      aria-label={t.dismiss}
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
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
                              ({reviewStats.total})
                            </span>
                          </div>
                        )}
                      </div>
                      {(restaurant.address || restaurant.operating_hours) && (
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
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
                              const dayKey = days[inTimeZone(new Date(), restaurant.timezone || "UTC").getDay()];
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
                                    : hoursRangeLabel(dh.open, dh.close, locale)}
                                </span>
                              );
                            })()}
                        </div>
                      )}
                    </div>
                  )}

                  {searchResults !== null ? (
                    <div ref={searchResultsTopRef}>
                      <motion.p
                        key={searchResults.length}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          "text-sm text-gray-600 mb-4",
                          searchResults.length === 0 && "hidden",
                        )}
                      >
                        {searchResults.length}{" "}
                        {searchResults.length === 1
                          ? t.resultSingular
                          : t.resultPlural}
                      </motion.p>
                      {searchResults.length === 0 ? (
                        <div className="max-w-xl mx-auto">
                          {renderNoSearchResults(() => setSearchQuery(""))}
                        </div>
                      ) : (
                        <>
                          {/* Cards then rows, same as the category sections, but
                              relevance order is preserved inside each block —
                              splitByDisplay is stable, so the best-matching
                              drink still leads the row list. */}
                          <motion.div
                            className={cn(
                              "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3",
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
                              liveProducts.filter((p) => favIds.includes(p.id)),
                            );
                          return (
                            <>
                              {favCards.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
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
                      className="text-center py-20 flex flex-col items-center gap-3"
                    >
                      <DietIcon tag={activeDiet} className="w-10 h-10 text-gray-500" />
                      <p className="text-[16px] font-semibold text-gray-900">{t.noDietMatch}</p>
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
                        <DietIcon tag={activeDiet} className="w-5 h-5 text-[#047a65]" />
                        <h2 className="text-lg font-bold text-gray-900">
                          {locale === "en"
                            ? getTagConfig(activeDiet)?.labelEn
                            : getTagConfig(activeDiet)?.labelEs}
                        </h2>
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full tabular-nums">
                          {filteredProducts.length}
                        </span>
                        <button
                          onClick={() => setActiveDiet(null)}
                          className="ml-auto text-sm text-[#047a65] font-semibold hover:text-[#047a65] transition-colors"
                        >
                          {t.viewFullMenu}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
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
                        {/* Hoja del día: primero en la portada, antes de "Pedir de
                            nuevo" y de Popular. Es lo único del menú que cambia cada día. */}
                        {today && hasToday && onHome && (
                          <div
                            ref={(el) => {
                              if (el) sectionRefs.current.set(TODAY_ID, el);
                              else sectionRefs.current.delete(TODAY_ID);
                            }}
                          >
                            <TodaySheet
                              products={liveProducts}
                              day={today.day}
                              soupSizes={today.soupSizes}
                              locale={locale}
                              defaultLocale={defaultLocale}
                              fmtPrice={fmtPrice}
                              onOpen={handleProductSelect}
                            />
                          </div>
                        )}
                        {/* "Pedir de nuevo" (Pedro 2026-11-11): solo el último plato
                            pedido, solo en la portada (Popular). Antes salía en TODAS
                            las categorías —incluso dentro de Burgers— con sugerencias
                            al azar sacadas de pedidos de prueba y un ícono gris en los
                            productos sin foto. Si el banner "Repetir último pedido"
                            está visible, ya cubre esto: no se duplica. */}
                        {(() => {
                          const item = recommendations?.last_order;
                          // Cerró el banner = no quiere lo de la vez anterior: no
                          // se lo ofrecemos de nuevo con otra forma.
                          if (!item || showReorderBanner || reorderDismissed || lastDishDismissed) return null;
                          if (activeCatFilter && activeCatFilter !== POPULAR_ID) return null;
                          const product = liveProducts.find((p) => p.id === item.product_id);
                          // Sold out or outside its hours: nothing to offer again right now.
                          if (!product || product.in_stock === false) return null;
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
                              <div className="flex items-center rounded-2xl border border-gray-100 bg-white shadow-sm">
                              <button
                                onClick={handleClick}
                                className="min-w-0 flex-1 flex items-center gap-3 p-2.5 active:scale-[0.98] transition-transform text-left"
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
                              <button
                                onClick={dismissLastDish}
                                className="flex-shrink-0 mr-1 w-11 h-11 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                                aria-label={t.dismiss}
                              >
                                <X className="w-4 h-4" />
                              </button>
                              </div>
                            </section>
                          );
                        })()}
                        {(() => {
                          let globalProductIdx = 0;
                          return displayedGroups.map(
                            ({ category, items, available }, groupIdx) => {
                              const isPopular = category.id === POPULAR_ID;
                              const isLocked = !available;
                              // Photo cards first, then the photo-less items as a
                              // continuous list. Interleaving them leaves holes in
                              // the grid; grouping them is also what makes the
                              // photographed dishes read as the highlighted ones.
                              const { cards: cardItems, rows: rowItems } =
                                splitByDisplay(items);
                              // Phone format per category: grid where the photo is
                              // what makes people choose (desserts), a list where the
                              // dishes look alike and are chosen by reading (burgers).
                              // null = automatic by menu size. Popular is always a
                              // grid; tablets and desktops always get the grid.
                              const showAsList =
                                !isPopular &&
                                !isTabletUp &&
                                (category.display_mode ??
                                  (isLargeCatalog ? "list" : "grid")) === "list";
                              // An odd count in the 2-column phone grid leaves the last
                              // card alone next to a hole: it takes the full width.
                              const oddLastId =
                                cardItems.length % 2 === 1
                                  ? cardItems[cardItems.length - 1]?.id
                                  : undefined;
                              return (
                                <section
                                  key={category.id}
                                  data-cat-id={category.id}
                                  // Never on the first section: it is on screen at
                                  // load, and content-visibility measures it as 0 px
                                  // for the first frame of the server-rendered HTML
                                  // — the footer painted mid-screen and jumped
                                  // (CLS 0.14–0.19). The rest keep the skip, with a
                                  // reserved height so scrolling to them doesn't jump.
                                  style={
                                    groupIdx === 0
                                      ? undefined
                                      : {
                                          contentVisibility: "auto",
                                          containIntrinsicSize: "auto 900px",
                                        }
                                  }
                                  ref={(el) => {
                                    if (el)
                                      sectionRefs.current.set(category.id, el);
                                    else
                                      sectionRefs.current.delete(category.id);
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-4 pt-3">
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
                                    {isLocked && categoryHoursLabel(category) && (
                                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                                        <Clock className="w-3 h-3" />
                                        {categoryHoursLabel(category)}
                                      </span>
                                    )}
                                    {!isLocked && (
                                      <span className="text-[13px] font-medium text-gray-600 tabular-nums">
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
                                            {t.servedHours(categoryHoursLabel(category) ?? "")}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                    {showAsList ? (
                                      <div
                                        className={cn(
                                          "rounded-2xl bg-white border border-ink-100 overflow-hidden divide-y divide-ink-100",
                                          isLocked && "opacity-40",
                                          cardItems.length === 0 && "hidden",
                                        )}
                                        {...(isLocked
                                          ? { "aria-hidden": true }
                                          : {})}
                                      >
                                        {cardItems.map((product) => {
                                          const isPriority =
                                            globalProductIdx < PRIORITY_CARD_IMAGES;
                                          globalProductIdx++;
                                          return (
                                            <ProductListItem
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
                                              priority={isPriority}
                                            />
                                          );
                                        })}
                                      </div>
                                    ) : lightMobileProductGrid ? (
                                      <div
                                        className={cn(
                                          "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3",
                                          isLocked && "opacity-40",
                                          cardItems.length === 0 && "hidden",
                                        )}
                                        {...(isLocked
                                          ? { "aria-hidden": true }
                                          : {})}
                                      >
                                        {cardItems.map((product) => {
                                          const isPriority =
                                            globalProductIdx < PRIORITY_CARD_IMAGES;
                                          globalProductIdx++;
                                          return (
                                            <div
                                              key={product.id}
                                              className={
                                                product.id === oddLastId
                                                  ? "col-span-2 md:col-span-1"
                                                  : undefined
                                              }
                                            >
                                              <ProductCard
                                                wide={product.id === oddLastId}
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
                                          "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3",
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
                                            globalProductIdx < PRIORITY_CARD_IMAGES;
                                          globalProductIdx++;
                                          return (
                                            <motion.div
                                              key={product.id}
                                              className={
                                                product.id === oddLastId
                                                  ? "col-span-2 md:col-span-1"
                                                  : undefined
                                              }
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
                                                wide={product.id === oddLastId}
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
                          <span className="text-sm font-normal text-gray-600 ml-1">
                            ({reviewStats.average} / 5 · {reviewStats.total}{" "}
                            {t.reviews})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowReviews(true)}
                          aria-haspopup="dialog"
                          className="ml-auto h-9 px-2 text-sm font-semibold text-[#047a65] hover:underline"
                        >
                          {t.seeAll}
                        </button>
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
                                    <span className="text-[12px] text-gray-500">
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
                              <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">
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
                            const todayIdx = inTimeZone(new Date(), restaurant.timezone || "UTC").getDay();
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
                                  <p className="text-sm text-gray-600 mt-0.5">
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
                                        hoursRangeLabel(todayHours.open, todayHours.close, locale)
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
                                href={telHref(restaurant.phone)}
                                className="text-sm text-[#047a65] font-medium hover:text-[#047a65] transition-colors mt-0.5 block"
                              >
                                {prettyPhone(restaurant.phone)}
                              </a>
                            </div>
                          </div>
                        )}

                        {restaurant.google_business_url && (
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#e6faf7] flex items-center justify-center flex-shrink-0">
                              <ExternalLink className="w-4 h-4 text-[#047a65]" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                Google
                              </p>
                              <a
                                href={restaurant.google_business_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#047a65] font-medium hover:underline mt-0.5 block"
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
                  <div className="mt-8 mb-4 flex justify-center">
                    <a
                      href="https://menius.app?ref=menu-footer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity duration-200"
                    >
                      <span className="flex items-center justify-center w-4 h-4 rounded-[4px] bg-gray-400 text-white text-[9px] font-black select-none">
                        M
                      </span>
                      <span className="text-[12px] text-gray-500 font-normal">
                        {t.poweredBy}
                      </span>
                      <span className="text-[12px] text-gray-600 font-semibold">
                        MENIUS
                      </span>
                    </a>
                  </div>
                </div>
                {/* end px wrapper */}
              </main>
            </div>
            {/* end center column wrapper */}

          </div>
          {/* end 3-column row */}
        </div>
        {/* end outer scroll */}

        {/* ── Fly-to-cart particles (tablet and up, into the header cart button) ── */}
        <CartFlyParticles getTarget={getCartPill} />

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
              bottom: cartCount > 0 && !isTabletUp
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
              <span className="text-white/70">· {t.menuSections}</span>
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
            <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden pointer-events-none">
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

        {/* ── Cart: bottom sheet on the phone, right-hand drawer from tablet up
            (desktop too since 2026-11-25 — one cart, opened from the header). ──
            On an iPad the bottom sheet rose ~95% of the screen and hid the
            whole menu; a 400px drawer leaves the menu in view and is where
            Uber Eats / DoorDash put it at that width. */}
        <AnimatePresence>
          {isOpen && (
            <div
              className="fixed inset-0 z-50 flex flex-col justify-end md:flex-row"
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
                className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col md:rounded-none md:w-[400px] xl:w-[440px] md:h-full md:pt-[max(12px,env(safe-area-inset-top))]"
                style={
                  isTabletUp
                    ? undefined
                    : { maxHeight: "calc(95dvh - env(safe-area-inset-bottom, 0px))" }
                }
                initial={isTabletUp ? { x: "100%" } : { y: "100%" }}
                animate={isTabletUp ? { x: 0 } : { y: 0 }}
                exit={isTabletUp ? { x: "100%" } : { y: "100%" }}
                transition={{
                  type: "tween" as const,
                  duration: 0.22,
                  ease: [0.25, 0.46, 0.45, 0.94] as const,
                }}
                drag={isTabletUp ? false : "y"}
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
                  className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing md:hidden"
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
                      lastOrder?.restaurantId === restaurant.id && !reorderDismissed
                        ? lastOrder
                        : null
                    }
                    onReorder={handleReorder}
                    reorderLoading={reorderLoading}
                    onOpenProduct={openProductById}
                    suggestions={cartBasedSuggestions}
                    onSuggestionAdd={handleCartSuggestionAdd}
                    loyaltyData={loyaltyData}
                  storeNotice={storeNoticeLine}
                    // Empty cart on desktop: pickup/delivery choice, as the
                    // old xl column showed. Phone and tablet unchanged.
                    orderTypes={isXlView ? (restaurant.order_types_enabled ?? []).filter((ot) => ot !== "dine_in") : undefined}
                    cashOnly={!usablePaymentMethods(restaurant).includes("online")}
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
                onAddToCart={(name) => {
                  undoCartRef.current = null;
                  undoUidRef.current = lastCartUid();
                  showToast(name);
                  const next = queuedNext;
                  if (next) {
                    setQueuedNext(null);
                    // Let "Added" register before the next sheet replaces this one.
                    setTimeout(() => setCustomization({ product: next, editIndex: null }), 450);
                  } else if (isTabletUp) {
                    // Tablet/desktop: the sheet closes and the dish flies into the
                    // header cart button, with the confirmation card under it
                    // (DoorDash). Phones keep the sheet open with View cart / Continue.
                    const btn = document.activeElement as HTMLElement | null;
                    const r = btn?.getBoundingClientRect();
                    if (r && r.width > 0) {
                      window.dispatchEvent(new CustomEvent("menu:cart-fly", {
                        detail: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
                      }));
                    }
                    setAddedUid(lastCartUid());
                    setCustomization(null);
                  }
                }}
                findOnMenu={findOnMenu}
                queuedNext={queuedNext}
                onQueueNext={(p) => {
                  if ((p.variants?.length ?? 0) > 0 || (p.extras?.length ?? 0) > 0 || p.has_modifiers) {
                    setQueuedNext(p);
                  } else {
                    handleQuickAdd(p);
                  }
                }}
                onUnqueueNext={() => setQueuedNext(null)}
                fmtPrice={fmtPrice}
                t={t}
                locale={locale}
                defaultLocale={defaultLocale}
                timeZone={restaurant.timezone}
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
        {reviewStats && recentReviews && recentReviews.length > 0 && (
          <ReviewsSheet
            open={showReviews}
            onClose={closeReviews}
            restaurantName={restaurant.name}
            average={reviewStats.average}
            total={reviewStats.total}
            reviews={recentReviews}
            locale={locale}
            t={t}
          />
        )}

        <RestaurantInfoSheet
          open={showInfo}
          onClose={closeInfo}
          restaurant={restaurant}
          locale={locale}
          t={t}
        />

        <RepeatOrderButton
          restaurantId={restaurant.id}
          locale={locale as "es" | "en"}
          currency={currency}
          suppressed={showReorderBanner || reorderDismissed}
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
              <div className="border-b border-gray-100" role="search">
                <div className="max-w-[640px] mx-auto flex items-center gap-1 px-2 py-2">
                  <button
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery("");
                    }}
                    aria-label={t.closeSearch}
                    className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
                  >
                    <ArrowLeft
                      className="w-5 h-5 text-gray-800"
                      aria-hidden="true"
                    />
                  </button>
                  <div className="relative flex-1">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600"
                      aria-hidden="true"
                    />
                    <input
                      ref={mobileSearchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      aria-label={t.searchPlaceholder}
                      className="w-full h-11 pl-9 pr-11 rounded-xl bg-gray-50 border border-gray-200 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#05c8a7]/20 focus:border-[#05c8a7] placeholder:text-gray-600 [&::-webkit-search-cancel-button]:hidden"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery("");
                          mobileSearchInputRef.current?.focus();
                        }}
                        aria-label={t.clearSearch}
                        className="absolute right-0 top-0 w-11 h-11 flex items-center justify-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
                      >
                        <X className="w-4 h-4 text-gray-600" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="max-w-[640px] mx-auto px-2 py-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  {!searchQuery.trim() ? (
                    <div className="space-y-6 pt-1">
                      {renderPopularForSearch()}
                      <section>
                        <h3 className="px-2 mb-3 text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                          {t.searchSuggestions}
                        </h3>
                        <div className="flex flex-wrap gap-2 px-2">
                          {searchSuggestions.map((cat) => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setShowSearch(false);
                                setSearchQuery("");
                                setActiveCatFilter(cat.id);
                                setActiveCategory(cat.id);
                              }}
                              className="h-10 px-4 rounded-full border border-gray-200 text-[14px] text-gray-800 active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
                            >
                              {tName(cat, locale, defaultLocale)}
                            </button>
                          ))}
                        </div>
                      </section>
                    </div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div>
                      <p className="px-2 mb-1 text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
                        {searchResults.length}{" "}
                        {searchResults.length === 1
                          ? t.resultSingular
                          : t.resultPlural}
                      </p>
                      {searchResults.map(renderSearchRow)}
                    </div>
                  ) : naturalSearch.active ? (
                    /* El motor léxico no encontró nada, pero la interpretación de
                       la frase sí. Se marca como sugerencia, no como coincidencia
                       exacta, para que el comensal entienda por qué ve esto. */
                    <div>
                      <div className="mb-2 px-2 flex items-start gap-2">
                        <Sparkles
                          className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 leading-snug">
                            {naturalSearch.reply ?? t.searchSuggestions}
                          </p>
                          <p className="text-[13px] text-gray-600 mt-0.5">
                            {naturalSearch.results.length}{" "}
                            {naturalSearch.results.length === 1
                              ? t.resultSingular
                              : t.resultPlural}
                          </p>
                        </div>
                      </div>
                      {naturalSearch.results.slice(0, 20).map(renderSearchRow)}
                    </div>
                  ) : naturalSearch.loading ? (
                    <div className="pt-12 flex flex-col items-center text-center" role="status">
                      <span
                        className="w-6 h-6 rounded-full border-2 border-gray-300 border-t-[#05c8a7] animate-spin"
                        aria-hidden="true"
                      />
                      <p className="mt-3 text-[14px] text-gray-600">{t.searching}</p>
                    </div>
                  ) : (
                    renderNoSearchResults(() => {
                      setSearchQuery("");
                      mobileSearchInputRef.current?.focus();
                    })
                  )}
                </div>
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
        {/* ── Tablet/desktop: "Added to your order" under the header cart button ── */}
        <AnimatePresence>
          {addedUid && !isOpen && (
            <AddedToOrderCard
              key={addedUid}
              uid={addedUid}
              onClose={closeAddedCard}
              onViewOrder={() => { closeAddedCard(); setOpen(true); }}
              onCheckout={() => { closeAddedCard(); handleOpenCheckout(); }}
              fmtPrice={fmtPrice}
              t={t}
            />
          )}
        </AnimatePresence>

        {toastName && !addedUid && (
          <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-0 right-0 lg:bottom-8 z-[60] flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2.5 max-w-full min-h-[52px] pl-4 pr-1.5 py-1.5 rounded-2xl bg-gray-900/95 text-white text-sm font-semibold shadow-2xl">
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
              <span className="min-w-0 truncate" aria-hidden="true">
                {toastName} {t.addedCartSuffix}
              </span>
              <button
                type="button"
                onClick={undoQuickAdd}
                className="flex-shrink-0 h-10 px-3 rounded-xl text-[#5BE3C9] font-semibold hover:bg-white/10 active:bg-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
              >
                {t.cartUndo}
              </button>
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

        {/* ── Menu Update Banner ── (pauses are shown by the store strip) */}
        <MenuUpdateBanner
          restaurantId={restaurant.id}
          locale={locale}
          initialPausedUntil={restaurant.orders_paused_until ?? null}
        />

        {/* ── PWA Install Banner ── */}
        <InstallBanner
          restaurantName={restaurant.name}
          slug={restaurant.slug}
          logoUrl={(restaurant as any).logo_url ?? null}
          locale={locale === "en" ? "en" : "es"}
          recurring={isRecurringVisitor}
        />

        {/* ── "Menu" sheet: ☰ opens it folded, the floating "Sections" button
            opens it with the active group unfolded. ── */}
        <MenuSheet
          open={showCatSheet || showSubcatSheet}
          onClose={closeMenuSheet}
          title={t.menuSheetTitle}
          closeLabel={t.close}
          searchLabel={t.searchDishes(products.length)}
          onSearch={() => {
            closeMenuSheet();
            setShowSearch(true);
          }}
          entries={menuSheetEntries}
          activeId={menuSheetActiveId}
          expandOnOpen={showSubcatSheet ? activeCatFilter : null}
          onSelect={handleMenuSheetSelect}
          onSelectSection={handleMenuSheetSection}
          hiddenFromClass={showSubcatSheet ? "xl:hidden" : "lg:hidden"}
        />
      </div>
    </StoreConfigProvider>
  );
}
