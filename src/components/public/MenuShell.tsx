'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCart, ChevronLeft, ChevronRight, X, MapPin, Clock, Heart, Star, ArrowLeft, Search, Globe, RotateCcw, AlertCircle, AlignJustify } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { formatPrice, cn } from '@/lib/utils';
import { getTranslations, type Locale } from '@/lib/translations';
import type { Restaurant, Category, Product, OrderType, DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { getLocaleFlag, SUPPORTED_LOCALES, tName, tDesc } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';

import { getSupabaseBrowser } from '@/lib/supabase/browser';
import { MenuHeader, HEADER_HEIGHT } from './MenuHeader';
import { CategorySidebar } from './CategorySidebar';
import { ProductCard } from './ProductCard';
import { CartPanel } from './CartPanel';
import { CustomizationSheet } from './CustomizationSheet';
import { InstallBanner } from './InstallBanner';
import { ReservationWidget } from './ReservationWidget';
import { MenuUpdateBanner } from './MenuUpdateBanner';
import { CartFlyParticles } from './CartFlyParticles';
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
}

interface CustomizationTarget {
  product: Product;
  editIndex: number | null;
}

const POPULAR_ID = '__popular__';


export function MenuShell({
  restaurant,
  categories,
  products,
  tableName,
  locale: initialLocale = 'es',
  availableLocales: availableLocalesRaw,
  backUrl,
  reviewStats,
  recentReviews,
  limitedMode,
}: MenuShellProps) {
  const router = useRouter();
  const defaultLocale = initialLocale;
  const availableLocales = availableLocalesRaw ?? [initialLocale];
  const hasMultiLang = availableLocales.length > 1;
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const t = getTranslations(locale);
  const currency = restaurant.currency;
  const fmtPrice = useCallback((price: number) => formatPrice(price, currency), [currency]);

  const setRestaurantId = useCartStore((s) => s.setRestaurantId);
  const setTableName = useCartStore((s) => s.setTableName);
  const rawCartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.qty, 0));
  const rawCartTotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.lineTotal, 0));
  const setOpen = useCartStore((s) => s.setOpen);
  const isOpen = useCartStore((s) => s.isOpen);
  const addItem = useCartStore((s) => s.addItem);

  const cartDragControls = useDragControls();

  const [hasMounted, setHasMounted] = useState(false);
  const [reorderDismissed, setReorderDismissed] = useState(false);
  const [cartResumeShown, setCartResumeShown] = useState(false);

  const lastOrder = useCartStore((s) => s.lastOrder);
  const reorder = useCartStore((s) => s.reorder);

  const showReorderBanner =
    hasMounted &&
    !reorderDismissed &&
    rawCartCount === 0 &&
    !!lastOrder &&
    lastOrder.restaurantId === restaurant.id &&
    lastOrder.items.length > 0;

  const handleReorder = useCallback(() => {
    const added = reorder(products);
    if (added > 0) {
      setReorderDismissed(true);
      setOpen(true);
    }
  }, [reorder, products, setOpen]);

  const enabledOrderTypes: OrderType[] = restaurant.order_types_enabled?.length
    ? restaurant.order_types_enabled
    : ['dine_in', 'pickup', 'delivery'];

  useEffect(() => {
    setHasMounted(true);
    setRestaurantId(restaurant.id);
    // tableName comes from the server as null (page is static); read ?table= from URL on client
    const resolvedTable = tableName ?? new URLSearchParams(window.location.search).get('table');
    setTableName(resolvedTable);
    router.prefetch(`/${restaurant.slug}/checkout`);

    // If returning customer has items in cart, show a brief "resume cart" toast
    const stored = useCartStore.getState();
    if (
      stored.restaurantId === restaurant.id &&
      stored.items.length > 0
    ) {
      setCartResumeShown(true);
      setTimeout(() => setCartResumeShown(false), 4000);
    }
  }, [restaurant.id, restaurant.slug, tableName, setRestaurantId, setTableName, router]);

  const cartCount = hasMounted ? rawCartCount : 0;
  const cartTotal = hasMounted ? rawCartTotal : 0;

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCatSheet, setShowCatSheet] = useState(false);
  const CATEGORY_PREVIEW = 8; // kept for potential future use
  const isLargeCatalog = false;
  const [activeCatFilter, setActiveCatFilter] = useState<string | null>(null);
  const [showFavs, setShowFavs] = useState(false);
  const favIds = useFavoritesStore((s) => s.ids);
  const [activeDiet, setActiveDiet] = useState<DietaryTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [customization, setCustomization] = useState<CustomizationTarget | null>(null);
  // Ordered list of product IDs from data-driven suggestions (pairings + co-occurrence)
  const [dataBasedSuggestionIds, setDataBasedSuggestionIds] = useState<string[]>([]);
  const [toastName, setToastName] = useState<string | null>(null);
  const [stockOutAlert, setStockOutAlert] = useState<string | null>(null);
  // Realtime in_stock overrides: updated live without page reload
  const [stockOverrides, setStockOverrides] = useState<Map<string, boolean>>(new Map());
  // Realtime pause state: updated live when restaurant pauses orders
  const [pausedUntil, setPausedUntil] = useState<string | null>(() => (restaurant as any).orders_paused_until ?? null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const stockAlertTimer = useRef<ReturnType<typeof setTimeout>>();
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
  const pillsUpTimerRef = useRef<ReturnType<typeof setTimeout>>();
  // Debounce timer for scroll-spy-triggered pill bar auto-scroll.
  // Coalesces rapid activeCategory changes (60fps during fast scroll) into a single
  // movement after the user slows down — eliminates the "rapid jumping" artefact.
  const pillBarScrollTimerRef = useRef<ReturnType<typeof setTimeout>>();
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
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  useEffect(() => {
    const check = () => setIsDesktopView(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // NOTE: useBodyScrollLock is intentionally NOT used here.
  // Menius scrolls via mainRef (a custom div), not document.body — window.scrollY is always 0.
  // Applying position:fixed to body on iOS shifts the visual viewport, which breaks the
  // scroll-spy getBoundingClientRect() calculations and causes the pill bounce-back effect.

  // Realtime: notify customer if a cart item goes out of stock (86'd)
  useEffect(() => {
    const cartItems = useCartStore.getState().items;
    if (!restaurant.id || cartItems.length === 0) return;

    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`products-stock-${restaurant.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: `restaurant_id=eq.${restaurant.id}`,
      }, (payload) => {
        const updated = payload.new as { id: string; name: string; in_stock: boolean };
        // Always update the displayed badge in real-time
        setStockOverrides(prev => {
          const next = new Map(prev);
          next.set(updated.id, updated.in_stock);
          return next;
        });
        // Remove from cart if product went out of stock
        if (updated.in_stock === false) {
          const storeState = useCartStore.getState();
          const idxToRemove = storeState.items.map((i, idx) => ({ id: i.product.id, idx })).filter(x => x.id === updated.id);
          if (idxToRemove.length > 0) {
            [...idxToRemove].reverse().forEach(({ idx }) => storeState.removeItem(idx));
            clearTimeout(stockAlertTimer.current);
            setStockOutAlert(updated.name);
            stockAlertTimer.current = setTimeout(() => setStockOutAlert(null), 6000);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant.id]);

  // Realtime: detect orders_paused_until changes without requiring page reload
  useEffect(() => {
    if (!restaurant.id) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`restaurant-pause:${restaurant.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurants',
        filter: `id=eq.${restaurant.id}`,
      }, (payload) => {
        setPausedUntil((payload.new as any).orders_paused_until ?? null);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    const idxToRemove: number[] = [];

    store.items.forEach((item, idx) => {
      const fresh = freshProductMap.get(item.product.id);
      if (!fresh) return;
      const freshGroups = fresh.modifier_groups ?? [];
      const requiredGroups = freshGroups.filter((g: any) => g.is_required && (g.options?.length ?? 0) > 0);
      if (requiredGroups.length === 0) return;

      // Check if any required group is missing from the item's modifier selections
      const missingGroup = requiredGroups.some((g: any) => {
        const sel = (item.modifierSelections ?? []).find(
          (ms) => ms.group.id === g.id || ms.group.name === g.name
        );
        return !sel || sel.selectedOptions.length === 0;
      });

      if (missingGroup) idxToRemove.push(idx);
    });

    if (idxToRemove.length > 0) {
      // Remove in reverse order to preserve indices
      [...idxToRemove].reverse().forEach((idx) => store.removeItem(idx));
      setStockOutAlert(
        locale === 'en'
          ? 'Some items were updated — please add them again to select the required options.'
          : 'Algunos productos fueron actualizados — agrégalos nuevamente para elegir las opciones requeridas.'
      );
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
            .from('product_pairings')
            .select('paired_id, sort_order')
            .eq('product_id', productId)
            .order('sort_order', { ascending: true }),
          supabase.rpc('get_product_cooccurrences', {
            p_product_id: productId,
            p_restaurant_id: restaurant.id,
            p_limit: 8,
          }),
        ]);

        const pairingIds: string[] = (pairingRows ?? []).map((r: { paired_id: string }) => r.paired_id);
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
    return () => { cancelled = true; };
  }, [customization?.product?.id, restaurant.id]);

  const cartColRef = useRef<HTMLDivElement>(null);

  const getBannerHeight = useCallback(() => bannerRef.current?.offsetHeight ?? 0, []);

  // IntersectionObserver: watch the banner element and keep bannerVisibleRef in sync.
  useEffect(() => {
    if (!bannerRef.current || !hasCover) return;
    const observer = new IntersectionObserver(
      ([entry]) => { bannerVisibleRef.current = entry.isIntersecting; },
      { threshold: 0.05 }
    );
    observer.observe(bannerRef.current);
    return () => observer.disconnect();
  }, [hasCover]);

  const handleCategorySelect = useCallback((catId: string | null) => {
    setSearchQuery('');
    setShowSearch(false);
    setShowFavs(false);
    setActiveDiet(null);

    // Mark as user-click so the horizontal pill bar doesn't auto-scroll
    categoryClickedRef.current = true;

    setActiveCategory(catId);

    if (catId === null) {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isLargeCatalog) {
      setActiveCatFilter(catId);
      if (bannerVisibleRef.current) {
        mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
      }
      return;
    }

    const section = sectionRefs.current.get(catId);
    if (section && mainRef.current) {
      const savedSidebarScroll = sidebarRef.current?.scrollTop ?? 0;

      isScrollingRef.current = true;

      // Compute sticky header offset (how many px of UI cover the top of the scroll area).
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
      const margin = isDesktop
        ? (desktopPillsRef.current?.offsetHeight ?? 44)
        : (hasCover ? HEADER_HEIGHT : 0) + (mobilePillsRef.current?.offsetHeight ?? 52);

      // Manual scrollTo instead of scrollIntoView: scrollIntoView on iOS Safari
      // sometimes scrolls `window` rather than the actual scroll container, causing
      // the page to jump unexpectedly. This calculates the exact target offset on
      // mainRef and scrolls it directly.
      const sectionTop = section.getBoundingClientRect().top;
      const containerTop = mainRef.current.getBoundingClientRect().top;
      // The scroll-spy uses `threshold = containerTop + margin - 8` to detect active sections.
      // We overshoot by 8px so the section lands exactly at the threshold after the animation,
      // preventing the spy from reverting to the previous category (the "bounce-back" effect).
      const targetScroll = mainRef.current.scrollTop + sectionTop - containerTop - margin + 8;
      mainRef.current.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });

      requestAnimationFrame(() => {
        if (sidebarRef.current) sidebarRef.current.scrollTop = savedSidebarScroll;
      });

      // Unlock scroll-spy when the animation ends; fall back to 1.5 s.
      // (scrollend is not supported on iOS Safari < 16.4 — the timeout is the safety net.)
      // 1.5s covers long pages where iOS smooth-scroll can take > 1s.
      const unlock = () => { isScrollingRef.current = false; };
      const timer = setTimeout(unlock, 1500);
      mainRef.current.addEventListener('scrollend', () => {
        clearTimeout(timer);
        unlock();
      }, { once: true });
    }
  }, [isLargeCatalog, hasCover]);

  const handleProductSelect = useCallback((product: Product) => {
    setCustomization({ product, editIndex: null });
  }, []);


  const showToast = useCallback((name: string) => {
    clearTimeout(toastTimer.current);
    setToastName(name);
    toastTimer.current = setTimeout(() => setToastName(null), 2000);
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      const ctx = audioCtxRef.current;
      const t = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.18, t);
      master.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      master.connect(ctx.destination);
      const o1 = ctx.createOscillator();
      o1.frequency.setValueAtTime(880, t);
      o1.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
      o1.type = 'sine';
      o1.connect(master);
      o1.start(t);
      o1.stop(t + 0.35);
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.06, t + 0.06);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o2.frequency.value = 1760;
      o2.type = 'sine';
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.start(t + 0.06);
      o2.stop(t + 0.25);
    } catch {}
    try { navigator.vibrate?.([30, 20, 15]); } catch {}
  }, []);

  const handleQuickAdd = useCallback((product: Product) => {
    addItem(product, null, [], 1, '');
    showToast(product.name);
    trackEvent('product_added_to_cart', {
      product_id: product.id,
      product_name: product.name,
      price: product.price,
      restaurant_id: restaurant.id,
    });
  }, [addItem, showToast, restaurant.id]);

  const handleEditCartItem = useCallback((index: number) => {
    const items = useCartStore.getState().items;
    const item = items[index];
    if (item) {
      // Use the fresh product from the menu (includes up-to-date modifier_groups)
      // falling back to the cart snapshot if not found (e.g. product was deleted)
      const freshProduct = products.find((p) => p.id === item.product.id) ?? item.product;
      setCustomization({ product: freshProduct, editIndex: index });
    }
  }, [products]);

  const handleCloseCustomization = useCallback(() => {
    setCustomization(null);
  }, []);

  const handleOpenCheckout = useCallback(() => {
    trackEvent('checkout_started', {
      restaurant_id: restaurant.id,
      item_count: rawCartCount,
      total: rawCartTotal,
    });

    setOpen(false);

    requestAnimationFrame(() => {
      router.push(`/${restaurant.slug}/checkout`);
    });
  }, [router, restaurant.slug, restaurant.id, rawCartCount, rawCartTotal, setOpen]);

  const filteredProducts = useMemo(() => {
    const base = !activeDiet ? products : products.filter((p) => p.dietary_tags?.includes(activeDiet));
    if (stockOverrides.size === 0) return base;
    return base.map(p => {
      const override = stockOverrides.get(p.id);
      return override !== undefined ? { ...p, in_stock: override } : p;
    });
  }, [products, activeDiet, stockOverrides]);

  // Returns true if category has no schedule restriction or current time is within window
  const isCategoryAvailableNow = useCallback((cat: { available_from?: string | null; available_to?: string | null }) => {
    if (!cat.available_from || !cat.available_to) return true;
    const now = new Date();
    const [fromH, fromM] = cat.available_from.split(':').map(Number);
    const [toH, toM] = cat.available_to.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= fromH * 60 + fromM && nowMins <= toH * 60 + toM;
  }, []);

  const popularProducts = useMemo(
    () => filteredProducts.filter((p) => p.is_featured && p.in_stock !== false),
    [filteredProducts],
  );

  const cartProductIds = useCartStore((s) => new Set(s.items.map((i) => i.product.id)));

  // Classifier shared between suggestedProducts and the data-merge below
  const classifyProduct = useCallback((catName: string, productName: string): 'drink' | 'dessert' | 'side' | 'main' => {
    const text = `${catName} ${productName}`.toLowerCase();
    if (/bebida|bebidas|drink|drinks|refresco|soda|agua\b|jugo|jugos|juice|juices|cerveza|beer|vino|wine|shake|batido|batidos|caf[eé]|coffee|t[eé]\b|smoothie|smoothies|limon|milkshake|horchata|margarita|coctel|cocktail|limonada|frapp[eé]|cappuccino|latte|espresso|gatorade|red bull|energy|agua mineral|sparkling|kombucha|infusion|chai|matcha|mojito|sangria|michelada|tepache|agua fresca|jamaica|tamarindo|hibiscus|lemonade|limeade|iced tea|naranjada|fresco|fresca|refresco|zumo|beber|brebaje/i.test(text)) return 'drink';
    if (/postre|postres|dessert|desserts|helado|helados|ice cream|pastel|cake|brownie|dulce|sweet|cookie|tiramisú|flan|churro|cheesecake|mousse|pudding|gelato|sorbet|donut|muffin|crepe|waffle|tarta|pie|eclair|profiterole|macaron|tres leches|panna cotta|tiramisu|cannoli|semifreddo|paleta|gelatina|mazapán/i.test(text)) return 'dessert';
    if (/acompañ|acompañamiento|side|sides|ensalada|salad|sopa|soup|papa|fries|chips|guarnición|arroz|rice|wings|alitas|nachos|onion ring|mozzarella stick|guacamole|dip|coleslaw|breadstick|garlic bread|pan de ajo|bastones|elote|corn|coliflor|cauliflower|brócoli|broccoli|jalapeño|poppers|tater tot|yuca|plantain|patacón|tostón|boniato|camote|edamame|dumplings|gyoza|spring roll|rollo|extras?|adicional|complemento|entrante|entrada|appetizer|starter/i.test(text)) return 'side';
    return 'main';
  }, []);

  // Smart cross-selling: data-driven (pairings + co-occurrence) → rule-based fallback
  const suggestedProducts = useMemo(() => {
    const mainProduct = customization?.product;
    if (!mainProduct) return [];

    const productMap = new Map(products.map((p) => [p.id, p]));
    const isEligible = (p: Product) =>
      p.id !== mainProduct.id && p.in_stock !== false && !cartProductIds.has(p.id);

    // Time-of-day context: filter alcohol before noon
    const hour = new Date().getHours();
    const isBreakfastHour = hour >= 5 && hour < 11;
    const alcoholRegex = /cerveza|beer|vino|wine|margarita|coctel|cocktail|mojito|sangria|michelada|alcohol/i;
    const isAlcohol = (p: Product) =>
      alcoholRegex.test(`${p.name} ${categories.find((c) => c.id === p.category_id)?.name ?? ''}`);

    const MAX_SUGGESTIONS = 6;

    // 1. Data-driven: pairings first, then co-occurrence
    const dataProducts: Product[] = dataBasedSuggestionIds
      .map((id) => productMap.get(id))
      .filter((p): p is Product => !!p && isEligible(p) && !(isBreakfastHour && isAlcohol(p)))
      .slice(0, MAX_SUGGESTIONS);

    if (dataProducts.length >= MAX_SUGGESTIONS) return dataProducts;

    // 2. Regex fallback to pad remaining slots
    const seen = new Set(dataProducts.map((p) => p.id));
    const mainCat = categories.find((c) => c.id === mainProduct.category_id);
    const mainType = classifyProduct(mainCat?.name ?? '', mainProduct.name);

    const wantOrder: Array<'drink' | 'dessert' | 'side' | 'main'> = (() => {
      if (mainType === 'main')    return ['drink', 'side', 'dessert'];
      if (mainType === 'side')    return ['drink', 'main', 'dessert'];
      if (mainType === 'dessert') return ['drink', 'main'];
      // drink → suggest food
      return ['main', 'side', 'dessert'];
    })();

    const remaining = MAX_SUGGESTIONS - dataProducts.length;

    const fallback = products
      .filter((p) => isEligible(p) && !seen.has(p.id) && !(isBreakfastHour && isAlcohol(p)))
      .map((p) => {
        const cat = categories.find((c) => c.id === p.category_id);
        const pType = classifyProduct(cat?.name ?? '', p.name);
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
  }, [customization?.product, products, categories, cartProductIds, dataBasedSuggestionIds, classifyProduct]);

  const itemsByCategory = useMemo(() => {
    const regular = categories
      .map((cat) => ({
        category: cat,
        items: filteredProducts.filter((p) => p.category_id === cat.id),
        available: isCategoryAvailableNow(cat),
      }))
      .filter((g) => g.items.length > 0);

    const popularGroup = popularProducts.length > 0
      ? [{
          category: {
            id: POPULAR_ID,
            restaurant_id: restaurant.id,
            name: t.popularItems,
            sort_order: -1,
            is_active: true,
            translations: {},
            created_at: '',
          } as Category,
          items: popularProducts,
          available: true,
        }]
      : [];

    return [...popularGroup, ...regular];
  }, [categories, filteredProducts, isCategoryAvailableNow, popularProducts, restaurant.id, t.popularItems]);

  // In large-catalog mode, show only the active-filtered category (or all if none selected)
  const displayedGroups = useMemo(() => {
    if (isLargeCatalog && activeCatFilter) {
      return itemsByCategory.filter((g) => g.category.id === activeCatFilter);
    }
    return itemsByCategory;
  }, [isLargeCatalog, activeCatFilter, itemsByCategory]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, products]);

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
        const headerH = isDesktopNow ? 0 : (hasCover ? HEADER_HEIGHT : 0);
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

    main.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => main.removeEventListener('scroll', handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsByCategory, mainMounted]);

  // Track scroll for collapsing header.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const threshold = hasCover ? 100 : 40;
    const onScroll = () => {
      setHeaderScrolled(main.scrollTop > threshold);
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => { main.removeEventListener('scroll', onScroll); };
  }, [hasCover, mainMounted]);

  // Keyboard shortcuts: / or Ctrl+K for search, Esc to close overlays
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        if (showSearch) { setShowSearch(false); setSearchQuery(''); }
        else if (customization) setCustomization(null);
        else if (isOpen) setOpen(false);
        return;
      }

      if (isInput) return;

      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showSearch, customization, isOpen, setOpen]);

  // Auto-scroll pill bar + sidebar to show active category.
  // Pill bar: skipped when the change came from a user click (categoryClickedRef) to avoid
  // the jarring "pills jumping back" effect. The sidebar always auto-scrolls so the active
  // item stays visible (Uber Eats behavior: sidebar tracks scroll position).
  useEffect(() => {
    const catToShow = isLargeCatalog ? activeCatFilter : activeCategory;
    if (!catToShow) return;

    const wasClick = categoryClickedRef.current;
    categoryClickedRef.current = false; // reset for next update

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    // ── Horizontal pill bar (desktop + mobile top bar) ──
    // On click: instant jump so the pill appears selected immediately.
    // On scroll-spy: smooth scroll to follow the reading position.
    if (isDesktop) {
      const container = catScrollRef.current;
      if (container) {
        const pill = container.querySelector(`[data-pill-id="${catToShow}"]`) as HTMLElement;
        if (pill) {
          const containerRect = container.getBoundingClientRect();
          const pillRect = pill.getBoundingClientRect();
          const targetLeft =
            container.scrollLeft +
            pillRect.left -
            containerRect.left -
            (containerRect.width - pillRect.width) / 2;
          // Always instant — smooth fights with scroll-spy updates and causes jitter
          container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'instant' });
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
            const pill = container.querySelector(`[data-pill-id="${catToShow}"]`) as HTMLElement;
            if (pill) {
              const containerRect = container.getBoundingClientRect();
              const pillRect = pill.getBoundingClientRect();
              const targetLeft =
                container.scrollLeft +
                pillRect.left -
                containerRect.left -
                (container.offsetWidth - pill.offsetWidth) / 2;
              container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'instant' });
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
              const pill = container.querySelector(`[data-pill-id="${capturedCat}"]`) as HTMLElement;
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
                  container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
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
        const activeBtn = sidebar.querySelector(`[data-sidebar-cat="${catToShow}"]`) as HTMLElement;
        if (activeBtn) {
          const sidebarRect = sidebar.getBoundingClientRect();
          const btnRect = activeBtn.getBoundingClientRect();
          const isAbove = btnRect.top < sidebarRect.top + 16;
          const isBelow = btnRect.bottom > sidebarRect.bottom - 16;
          if (isAbove || isBelow) {
            // Center the active item in the sidebar viewport
            const targetTop = sidebar.scrollTop + btnRect.top - sidebarRect.top - (sidebarRect.height - btnRect.height) / 2;
            sidebar.scrollTo({ top: Math.max(0, targetTop), behavior: wasClick ? 'auto' : 'smooth' });
          }
        }
      }
    }
  }, [activeCategory, activeCatFilter, isLargeCatalog]);

  const scrollCats = (dir: 'left' | 'right') => {
    catScrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  // Shared pill renderer — desktop only
  const categoryPill = (id: string, label: string, isActive: boolean) => (
    <button
      key={id}
      data-pill-id={id}
      onClick={() => handleCategorySelect(id)}
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
        id === POPULAR_ID
          ? isActive
            ? 'bg-amber-500 text-white shadow-sm'
            : 'bg-white border border-gray-200 text-gray-600 active:bg-gray-50'
          : isActive
            ? 'bg-[#05c8a7] text-white shadow-sm'
            : 'bg-white border border-gray-200 text-gray-600 active:bg-gray-50'
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
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[13px] font-medium whitespace-nowrap',
        id === POPULAR_ID
          ? isActive
            ? 'bg-amber-500 text-white'
            : 'bg-white/70 text-gray-500 active:bg-gray-200'
          : isActive
            ? 'bg-gray-900 text-white'
            : 'bg-white/70 text-gray-500 active:bg-gray-200'
      )}
    >
      {id === POPULAR_ID && <span className="text-[13px] leading-none">🔥</span>}
      {label}
    </button>
  );

  const visibleCats = itemsByCategory.map((g) => g.category);

  // Desktop fav / diet pills
  const favPill = hasMounted && favIds.length > 0 && (
    <button
      key="__favs__"
      data-pill-id="__favs__"
      onClick={() => { setShowFavs(!showFavs); if (!showFavs) setActiveCategory(null); }}
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
        showFavs
          ? 'bg-red-500 text-white shadow-sm'
          : 'bg-white border border-gray-200 text-gray-600 active:bg-gray-50'
      )}
    >
      <Heart className={cn('w-3.5 h-3.5', showFavs ? 'fill-white' : '')} />
      {favIds.length}
    </button>
  );

  // Mobile fav / diet pills — squircle premium style
  const mobileFavPill = hasMounted && favIds.length > 0 && (
    <button
      key="__favs__"
      data-pill-id="__favs__"
      onClick={() => { setShowFavs(!showFavs); if (!showFavs) setActiveCategory(null); }}
      style={{ touchAction: 'manipulation' }}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg text-[13px] font-medium whitespace-nowrap',
        showFavs
          ? 'bg-gray-900 text-white'
          : 'bg-white/70 text-gray-500 active:bg-gray-200'
      )}
    >
      <Heart className={cn('w-3.5 h-3.5', showFavs ? 'fill-white' : '')} />
      {favIds.length}
    </button>
  );

  const filterDivider = (hasMounted && favIds.length > 0) && (
    <div className="flex-shrink-0 self-center w-px h-5 bg-gray-200 mx-1" aria-hidden />
  );

  const mobileCategoryPills = (
    <div className="lg:hidden sticky z-40 bg-[#f5f5f3] border-b border-gray-100" style={{ top: hasCover ? HEADER_HEIGHT : 0, willChange: 'transform' }}>
      <div className="flex items-center relative">
      {/* Hamburger — opens category bottom sheet */}
      <button
        onClick={() => setShowCatSheet(true)}
        style={{ touchAction: 'manipulation' }}
        className="flex-shrink-0 flex items-center justify-center w-9 h-9 ml-2 rounded-lg text-gray-500 active:bg-gray-200 transition-colors"
        aria-label={locale === 'en' ? 'Browse categories' : 'Ver categorías'}
      >
        <AlignJustify className="w-[18px] h-[18px]" />
      </button>
      {/* Vertical divider */}
      <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" aria-hidden />
      <div
        ref={mobilePillsRef}
        className="py-2 px-2 flex gap-1.5 overflow-x-auto scrollbar-hide flex-1"
        style={{ touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}
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
        {/* Large catalog: "Todos" pill */}
        {isLargeCatalog && (
          <button
            data-pill-id="__all__"
            onClick={() => { setActiveCatFilter(null); setActiveCategory(null); mainRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }}
            style={{ touchAction: 'manipulation' }}
            className={cn(
              'flex-shrink-0 inline-flex items-center px-3.5 py-[7px] rounded-lg text-[13px] font-medium whitespace-nowrap',
              !activeCatFilter && !showFavs && !activeDiet
                ? 'bg-gray-900 text-white'
                : 'bg-white/70 text-gray-500 active:bg-gray-200'
            )}
          >
            {t.filterAll}
          </button>
        )}
        {visibleCats.map((cat) => mobileCategoryPill(
          cat.id,
          tName(cat, locale, defaultLocale),
          isLargeCatalog
            ? activeCatFilter === cat.id && !showFavs && !activeDiet
            : activeCategory === cat.id && !showFavs && !activeDiet
        ))}
        {filterDivider}
        {mobileFavPill}
        {/* Spacer so last pill doesn't sit under the fade */}
        <div className="w-8 flex-shrink-0" aria-hidden="true" />
      </div>
      {/* Right-side fade gradient — outside scroll container so absolute isn't clipped */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#f5f5f3] to-transparent z-10" aria-hidden="true" />
      </div>
    </div>
  );

  const ordersLeft = limitedMode ? Math.max(0, limitedMode.dailyLimit - limitedMode.ordersToday) : null;

  return (
    <div className="relative h-[100dvh] flex flex-col bg-[#f5f5f3] lg:bg-[#f8f8f8] overflow-hidden overscroll-none">
      {/* Skip to main content — visible on keyboard focus only */}
      <a
        href="#menu-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[200] focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:font-semibold focus:text-sm"
      >
        {locale === 'en' ? 'Skip to menu' : 'Ir al menú'}
      </a>

      {/* Fixed header — absolute over banner on mobile when hasCover */}
      <div className={cn(
        'lg:flex-shrink-0 lg:relative',
        hasCover ? 'absolute inset-x-0 top-0 z-40' : 'flex-shrink-0'
      )}>
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
      />
      </div>

      {/* ── Outer scroll: banner scrolls away, sidebar/cart stay sticky ── */}
      <div
        ref={mainRefCb}
        className={`flex-1 overflow-y-auto max-w-[1440px] w-full mx-auto ${cartCount > 0 ? 'pb-[calc(7rem+env(safe-area-inset-bottom))] lg:pb-0' : 'pb-[env(safe-area-inset-bottom)]'}`}
      >

        {/* Cover banner — full width, scrolls away naturally with content */}
        {restaurant.cover_image_url && (
          <div ref={bannerRef} className="relative w-full h-72 sm:h-72 lg:h-72 bg-gray-100 overflow-hidden">
            <Image
              src={restaurant.cover_image_url}
              alt={restaurant.name}
              fill
              sizes="(max-width: 1440px) 100vw, 1440px"
              className="object-cover animate-cover-zoom"
              priority
            />
            {/* Mobile: gradient — dark at top for header, dark at bottom for info legibility */}
            <div className="lg:hidden absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/65" />

            {/* Desktop: gradient + info overlay */}
            <div className="hidden lg:block absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            {/* Mobile: nombre + rating overlaid at bottom of banner */}
            <div className="lg:hidden absolute bottom-0 left-0 right-0 px-4 pb-4">
              <h1 className="text-3xl font-black text-white drop-shadow-lg leading-tight">
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="text-sm text-white/85 mt-0.5 line-clamp-1 drop-shadow-sm">{restaurant.description}</p>
              )}
              {reviewStats && reviewStats.total > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-sm" />
                  <span className="text-sm font-bold text-white drop-shadow-sm tabular-nums">{reviewStats.average}</span>
                  <span className="text-xs text-white/75">({reviewStats.total}+)</span>
                </div>
              )}
            </div>

            {/* Desktop: nombre + info a la izquierda, rating a la derecha */}
            <div className="hidden lg:flex absolute bottom-0 left-0 right-0 px-8 pb-5 items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-4xl font-black text-white drop-shadow-sm leading-tight truncate">
                  {restaurant.name}
                </h1>
                {restaurant.description && (
                  <p className="text-sm text-white/75 mt-1 max-w-lg line-clamp-1">{restaurant.description}</p>
                )}
                {(restaurant.address || restaurant.operating_hours) && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                    {restaurant.address && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-[#05c8a7]" />
                        <span className="truncate max-w-[240px]">{restaurant.address}</span>
                      </span>
                    )}
                    {restaurant.operating_hours && (() => {
                      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                      const dayKey = days[new Date().getDay()];
                      const dh = restaurant.operating_hours?.[dayKey];
                      if (!dh || dh.closed) return null;
                      const is24h = dh.open === '00:00' && dh.close === '23:59';
                      return (
                        <span className="inline-flex items-center gap-1.5 text-[#05c8a7] font-medium">
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
                  <span className="text-sm font-bold text-white tabular-nums">{reviewStats.average}</span>
                  <span className="text-sm text-white/70">({reviewStats.total}+)</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile pills — sticky debajo del header */}
        {mobileCategoryPills}

        {/* ── 3-Column row ── */}
        <div className="flex lg:min-h-[calc(100dvh-48px)]">

        {/* Left: Sidebar — sticky, stays in place while content scrolls */}
        <aside ref={(el) => { sidebarRef.current = el; }} className="hidden lg:flex flex-col w-[200px] flex-shrink-0 border-r border-gray-100 sticky top-0 h-[calc(100dvh-48px)] overflow-y-auto">
          <CategorySidebar
            categories={categories}
            products={products}
            activeCategory={isLargeCatalog ? (activeCatFilter ?? null) : activeCategory}
            onSelect={handleCategorySelect}
            allLabel={t.allCategories}
            locale={locale}
            defaultLocale={defaultLocale}
          />
        </aside>

        {/* Center: wrapper so sticky pills + products stack vertically */}
        <div className="flex-1 min-w-0 flex flex-col">

        {/* Sticky category pills — desktop only, pins once banner scrolls away */}
        <div ref={desktopPillsRef} className="hidden lg:block sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="relative px-2 py-2">
            <button onClick={() => scrollCats('left')} className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-white via-white to-transparent flex items-center justify-start" aria-label={locale === 'en' ? 'Scroll left' : 'Desplazar izquierda'}>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div ref={catScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-6 pb-0.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
              {visibleCats.map((cat) => categoryPill(cat.id, tName(cat, locale, defaultLocale), activeCategory === cat.id && !showFavs && !activeDiet))}
              {filterDivider}
              {favPill}
            </div>
            <button onClick={() => scrollCats('right')} className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-end" aria-label={locale === 'en' ? 'Scroll right' : 'Desplazar derecha'}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Center: Products — natural flow, no independent scroll */}
        <main id="menu-main" className={`flex-1 min-w-0 pb-4 lg:pb-8`}>

          {/* Mobile info bar (when no cover, show name/rating/description) */}
          {!restaurant.cover_image_url && (
            <div className="lg:hidden px-4 pt-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-black text-gray-950 leading-tight">{restaurant.name}</h1>
                {reviewStats && reviewStats.total > 0 && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-gray-900 tabular-nums">{reviewStats.average}</span>
                    <span className="text-xs text-gray-400">({reviewStats.total}+)</span>
                  </div>
                )}
              </div>
              {restaurant.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{restaurant.description}</p>
              )}
            </div>
          )}

          {/* Reorder banner — shown when customer has a previous order here */}
          {showReorderBanner && (
            <div className="mx-4 lg:mx-8 mt-3 lg:mt-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#e6faf7] border border-[#b3efe6]">
              <div className="w-9 h-9 rounded-xl bg-[#d0f7f1] flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-4 h-4 text-[#05c8a7]" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#047a65]">
                  {t.reorderLastOrder}
                </p>
                <p className="text-xs text-[#05c8a7] truncate mt-0.5">
                  {lastOrder!.items.map((i) => `${i.qty}× ${i.productName}`).join(' · ')}
                </p>
              </div>
              <button
                onClick={handleReorder}
                className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-[#05c8a7] text-white text-xs font-bold active:scale-95 transition-transform"
              >
                {t.addToCart}
              </button>
              <button
                onClick={() => setReorderDismissed(true)}
                className="flex-shrink-0 p-1.5 text-[#05c8a7] hover:text-[#047a65] transition-colors"
                aria-label={t.cancel}
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
                  <h1 className="text-3xl font-black text-gray-950">{restaurant.name}</h1>
                  {restaurant.description && (
                    <p className="text-base text-gray-500 mt-1.5 max-w-xl">{restaurant.description}</p>
                  )}
                </div>
                {reviewStats && reviewStats.total > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 flex-shrink-0">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-bold text-gray-900 tabular-nums">{reviewStats.average}</span>
                    <span className="text-sm text-gray-500">({reviewStats.total}+)</span>
                  </div>
                )}
              </div>
              {(restaurant.address || restaurant.operating_hours) && (
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                  {restaurant.address && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[280px]">{restaurant.address}</span>
                    </span>
                  )}
                  {restaurant.operating_hours && (() => {
                    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const dayKey = days[new Date().getDay()];
                    const dh = restaurant.operating_hours?.[dayKey];
                    if (!dh || dh.closed) return null;
                    const is24h = dh.open === '00:00' && dh.close === '23:59';
                    return (
                      <span className={`inline-flex items-center gap-1.5 ${is24h ? 'text-[#05c8a7] font-medium' : ''}`}>
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        {is24h ? t.open24h : `${dh.open} – ${dh.close}`}
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
                {searchResults.length} {searchResults.length === 1 ? t.resultSingular : t.resultPlural}
              </motion.p>
              {searchResults.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="text-center py-20 text-gray-400 flex flex-col items-center gap-4"
                >
                  <motion.svg
                    width="64" height="64" viewBox="0 0 64 64" fill="none"
                    aria-hidden="true"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  >
                    <circle cx="28" cy="28" r="18" stroke="#d1d5db" strokeWidth="3" fill="none" />
                    <path d="M41 41L52 52" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" />
                    <path d="M22 28h12M28 22v12" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  </motion.svg>
                  <div>
                    <p className="font-bold text-gray-700">{t.noResults}</p>
                    <p className="text-sm text-gray-400 mt-1 leading-relaxed max-w-[180px] mx-auto">
                      {locale === 'en' ? 'Try a different keyword or check the spelling' : 'Intenta con otra palabra o revisa la ortografía'}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-2 xl:grid-cols-3 gap-3"
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: isDesktopView ? 0.05 : 0 } } }}
                >
                  {searchResults.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={isDesktopView ? { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } } } : { hidden: {}, visible: {} }}
                    >
                      <ProductCard
                        product={product}
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
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                  {products.filter((p) => favIds.includes(p.id)).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
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
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center"
              >
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                  <path d="M6 10h24M6 18h24M6 26h14" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </motion.div>
              <p className="font-semibold text-gray-600">{t.noProductsYet}</p>
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
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="text-4xl"
              >
                {DIETARY_TAGS.find((d) => d.id === activeDiet)?.emoji}
              </motion.p>
              <p className="font-medium">{t.noDietMatch}</p>
              <button onClick={() => setActiveDiet(null)} className="mt-1 text-sm text-[#05c8a7] font-semibold hover:text-[#047a65] transition-colors">{t.viewFullMenu}</button>
            </motion.div>
          ) : (
            <div className="space-y-8">
              {(() => {
                let globalProductIdx = 0;
                return displayedGroups.map(({ category, items, available }) => {
                const isPopular = category.id === POPULAR_ID;
                const isLocked = !available;
                return (
                  <section
                    key={category.id}
                    data-cat-id={category.id}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(category.id, el);
                      else sectionRefs.current.delete(category.id);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {isPopular && <span className="text-lg leading-none">🔥</span>}
                      <h2 className="text-[17px] font-extrabold text-gray-900 tracking-tight">
                        {isPopular
                          ? t.popularItems
                          : tName(category, locale, defaultLocale)}
                      </h2>
                      {isLocked && category.available_from && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          {category.available_from} – {category.available_to}
                        </span>
                      )}
                      {!isLocked && (
                        <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                          {items.length}
                        </span>
                      )}
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className={cn('relative', isLocked && 'pointer-events-none')}>
                      {isLocked && (
                        <div className="absolute inset-0 z-10 rounded-2xl bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm" role="status" aria-live="polite">
                            <Clock className="w-4 h-4 text-gray-400" aria-hidden="true" />
                            <span className="text-sm font-semibold text-gray-500">
                              {locale === 'en'
                                ? `Available ${category.available_from} – ${category.available_to}`
                                : `Disponible ${category.available_from} – ${category.available_to}`}
                            </span>
                          </div>
                        </div>
                      )}
                      <motion.div
                        className={cn('grid grid-cols-2 xl:grid-cols-3 gap-3', isLocked && 'opacity-40')}
                        {...(isLocked ? { 'aria-hidden': true } : {})}
                        initial={isDesktopView ? 'hidden' : false}
                        whileInView={isDesktopView ? 'visible' : undefined}
                        viewport={isDesktopView ? { once: true, margin: '-40px' } : undefined}
                        variants={isDesktopView ? {
                          hidden: {},
                          visible: { transition: { staggerChildren: 0.06 } },
                        } : undefined}
                      >
                        {items.map((product) => {
                          const isPriority = globalProductIdx < 4;
                          globalProductIdx++;
                          return (
                          <motion.div
                            key={product.id}
                            className="rounded-2xl overflow-hidden"
                            variants={isDesktopView ? {
                              hidden: { opacity: 0, y: 16 },
                              visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
                            } : undefined}
                          >
                            <ProductCard
                              product={product}
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
                          </motion.div>
                          );
                        })}
                      </motion.div>
                    </div>
                  </section>
                );
              });
              })()}
            </div>
          )}
          {/* Recent reviews */}
          {recentReviews && recentReviews.length > 0 && (
            <section className="mt-8 mb-6">
              <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                {t.customersTestimonial}
                {reviewStats && reviewStats.total > 0 && (
                  <span className="text-sm font-normal text-gray-400 ml-1">
                    ({reviewStats.average} / 5 · {reviewStats.total} {t.reviews})
                  </span>
                )}
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                {recentReviews.map((review) => {
                  const reviewDate = new Date(review.created_at);
                  const diffDays = Math.floor((Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
                  const relativeDate = diffDays === 0
                    ? (locale === 'en' ? 'Today' : 'Hoy')
                    : diffDays === 1
                    ? (locale === 'en' ? 'Yesterday' : 'Ayer')
                    : diffDays < 7
                    ? (locale === 'en' ? `${diffDays} days ago` : `Hace ${diffDays} días`)
                    : diffDays < 30
                    ? (locale === 'en' ? `${Math.floor(diffDays / 7)}w ago` : `Hace ${Math.floor(diffDays / 7)} sem`)
                    : reviewDate.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', { month: 'short', year: 'numeric' });
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
                          <p className="text-sm font-semibold text-gray-900 truncate">{review.customer_name}</p>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                  key={s}
                                  className={cn('w-3 h-3', s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200')}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-400">{relativeDate}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{review.comment}</p>
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
          {(restaurant.address || restaurant.phone || restaurant.operating_hours) && (
            <section className="mt-12 mb-6 border-t border-gray-100 pt-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {restaurant.address && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#e6faf7] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-[#05c8a7]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {t.addressLabel}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{restaurant.address}</p>
                      <a
                        href={
                          restaurant.latitude && restaurant.longitude
                            ? `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#05c8a7] hover:text-[#047a65] mt-1.5 transition-colors"
                      >
                        {t.getDirections}
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
                      </a>
                    </div>
                  </div>
                )}

                {restaurant.operating_hours && (() => {
                  const dayNames = locale === 'en'
                    ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                    : ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                  const todayIdx = new Date().getDay();
                  const todayKey = dayKeys[todayIdx];
                  const todayHours = restaurant.operating_hours?.[todayKey];
                  return (
                    <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#e6faf7] flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-[#05c8a7]" />
                      </div>
                      <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {t.schedule}
                      </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          <span className="font-medium text-gray-700">{dayNames[todayIdx]}:</span>{' '}
                          {todayHours && !todayHours.closed
                            ? (todayHours.open === '00:00' && todayHours.close === '23:59'
                              ? <span className="text-[#05c8a7] font-medium">{t.open24h}</span>
                              : `${todayHours.open} – ${todayHours.close}`)
                            : t.closedDay}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {restaurant.phone && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#e6faf7] flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[#05c8a7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {t.phoneLabel}
                      </p>
                      <a href={`tel:${restaurant.phone}`} className="text-sm text-[#05c8a7] font-medium hover:text-[#047a65] transition-colors mt-0.5 block">
                        {restaurant.phone}
                      </a>
                    </div>
                  </div>
                )}


                {restaurant.google_business_url && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Google</p>
                      <a
                        href={restaurant.google_business_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 font-medium hover:text-blue-700 transition-colors mt-0.5 block"
                      >
                        {locale === 'en' ? 'See on Google Maps' : 'Ver en Google Maps'}
                      </a>
                    </div>
                  </div>
                )}
              </div>

            </section>
          )}

          {/* Powered by MENIUS — always visible */}
          <div className="mt-8 mb-4 pt-5 border-t border-gray-100 flex flex-col items-center gap-2">
            <a
              href="https://menius.app?ref=menu"
              target="_blank"
              rel="noopener noreferrer"
              className="group/pw inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-50 hover:bg-[#e6faf7] border border-gray-100 hover:border-[#b3efe6] text-xs text-gray-400 hover:text-[#05c8a7] transition-all duration-300"
            >
              <svg className="w-4 h-4 text-[#05c8a7] group-hover/pw:text-[#04b096] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
              <span>{t.poweredBy}</span>
              <span className="font-bold text-gray-600 group-hover/pw:text-[#047a65] tracking-tight transition-colors">MENIUS</span>
            </a>
            <a
              href="https://menius.app?ref=menu-cta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-300 hover:text-[#05c8a7] transition-colors"
            >
              {t.createYourMenu} →
            </a>
          </div>

          </div>{/* end px wrapper */}
        </main>
        </div>{/* end center column wrapper */}

        {/* Right: Cart — sticky, stays in place while content scrolls */}
        <aside ref={cartColRef} className="hidden lg:flex flex-col w-[340px] flex-shrink-0 border-l border-gray-100 sticky top-0 h-[calc(100dvh-48px)] overflow-y-auto">
          <CartPanel
            fmtPrice={fmtPrice}
            t={t}
            onEdit={handleEditCartItem}
            onCheckout={handleOpenCheckout}
            estimatedMinutes={restaurant.estimated_delivery_minutes ?? undefined}
            deliveryFee={restaurant.delivery_fee ?? undefined}
            locale={locale}
            lastOrder={lastOrder?.restaurantId === restaurant.id ? lastOrder : null}
            onReorder={handleReorder}
          />
        </aside>
        </div>{/* end 3-column row */}
      </div>{/* end outer scroll */}

      {/* ── Fly-to-cart particles (desktop only) — isolated component, no root re-renders ── */}
      <CartFlyParticles cartColRef={cartColRef} />

      {/* ── Mobile: Bottom cart bar ── */}
      {ordersLeft === 0 ? (
        /* Limit reached — generic "paused" bar, no mention of billing */
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none">
          <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-gradient-to-t from-white via-white/95 to-transparent">
            <div className="max-w-lg mx-auto pointer-events-auto">
              <div className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-gray-100 text-gray-500 text-sm font-semibold">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {t.ordersLimitReached}
              </div>
            </div>
          </div>
        </div>
      ) : cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none">
          <div className="px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] bg-gradient-to-t from-white via-white/95 to-transparent">
            <div className="max-w-lg mx-auto pointer-events-auto">
              <button
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-[#05c8a7] text-white shadow-[0_8px_30px_rgba(5,200,167,0.4)] active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white text-[#05c8a7] text-[10px] font-extrabold px-1">
                      {cartCount}
                    </span>
                  </div>
                  <span className="text-sm font-semibold opacity-90">{t.myOrder}</span>
                </div>
                <span className="font-extrabold text-base tabular-nums">
                  {fmtPrice(cartTotal)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: Cart Bottom Sheet ── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="cart-sheet-title">
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
              style={{ maxHeight: '95dvh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween' as const, duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] as const }}
              drag="y"
              dragControls={cartDragControls}
              dragConstraints={{ top: 0 }}
              dragElastic={0.15}
              dragListener={false}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) setOpen(false);
              }}
            >
              {/* Drag handle + hidden title for screen readers */}
              <div
                className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => cartDragControls.start(e)}
                style={{ touchAction: 'none' }}
              >
                <div className="w-10 h-1.5 rounded-full bg-gray-300" aria-hidden="true" />
              </div>
              <h2 id="cart-sheet-title" className="sr-only">{t.myOrder ?? (locale === 'en' ? 'Your order' : 'Tu orden')}</h2>
              <div className="flex-1 overflow-hidden min-h-0">
                <CartPanel
                  fmtPrice={fmtPrice}
                  t={t}
                  onEdit={(idx) => { setOpen(false); handleEditCartItem(idx); }}
                  onCheckout={handleOpenCheckout}
                  onClose={() => setOpen(false)}
                  estimatedMinutes={restaurant.estimated_delivery_minutes ?? undefined}
                  deliveryFee={restaurant.delivery_fee ?? undefined}
                  locale={locale}
                  lastOrder={lastOrder?.restaurantId === restaurant.id ? lastOrder : null}
                  onReorder={() => { handleReorder(); setOpen(false); }}
                />
              </div>
              <div className="pb-[env(safe-area-inset-bottom)] flex-shrink-0" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Customization Sheet ── */}
      <AnimatePresence>
        {customization && (
          <CustomizationSheet
            product={customization.product}
            editIndex={customization.editIndex}
            onClose={handleCloseCustomization}
            onAddToCart={showToast}
            fmtPrice={fmtPrice}
            t={t}
            locale={locale}
            defaultLocale={defaultLocale}
            suggestedProducts={suggestedProducts}
            onSuggestAdd={(p) => {
              const hasReqModifiers =
                (p.modifier_groups ?? []).some((g) => g.is_required) ||
                (p.variants ?? []).length > 0;
              if (hasReqModifiers) {
                setCustomization({ product: p, editIndex: null });
              } else {
                handleQuickAdd(p);
              }
            }}
          />
        )}
      </AnimatePresence>


      {/* ── Mobile Full-screen Search Overlay ── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            className="fixed inset-0 z-[70] bg-white flex flex-col lg:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100" role="search">
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                aria-label={locale === 'en' ? 'Close search' : 'Cerrar búsqueda'}
                className="p-1.5 -ml-1 rounded-lg active:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" aria-hidden="true" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
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
                    onClick={() => setSearchQuery('')}
                    aria-label={locale === 'en' ? 'Clear search' : 'Borrar búsqueda'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {!searchQuery.trim() ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <Search className="w-10 h-10 text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">{t.searchPlaceholder}</p>
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {searchResults.length} {searchResults.length === 1 ? t.resultSingular : t.resultPlural}
                  </p>
                  {searchResults.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        handleProductSelect(product);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                    >
                      {product.image_url ? (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Search className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-gray-900 truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{product.description}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-900 tabular-nums flex-shrink-0">
                        {fmtPrice(Number(product.price))}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <span className="text-3xl select-none" aria-hidden="true">🔍</span>
                  </div>
                  <p className="text-base font-bold text-gray-900 mb-1">{t.noResults}</p>
                  <p className="text-sm text-gray-400 leading-relaxed max-w-[200px]">
                    {t.tryDifferentSearch}
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); setActiveDiet(null); setShowFavs(false); }}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold active:scale-95 transition-transform"
                  >
                    {locale === 'en' ? 'Clear filters' : 'Limpiar filtros'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Live region for screen reader announcements ── */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {toastName ? `${toastName} ${t.addedCartSuffix}` : ''}
      </div>

      {/* ── Toast: "X se ha agregado al carrito" — centrado en pantalla ── */}
      {toastName && (
        <div className="fixed bottom-[88px] left-0 right-0 lg:bottom-8 z-[60] flex justify-center pointer-events-none" aria-hidden="true">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gray-900/95 text-white text-sm font-semibold shadow-2xl">
            <span className="w-5 h-5 rounded-full bg-[#05c8a7] flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
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
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1">
              {locale === 'es'
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
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#05c8a7] text-white text-sm font-semibold shadow-lg active:scale-95 transition-transform"
            onClick={() => { setCartResumeShown(false); setOpen(true); }}
          >
            <ShoppingCart className="w-4 h-4" aria-hidden="true" />
            {locale === 'en' ? `Continue your order (${rawCartCount} items)` : `Continúa tu pedido (${rawCartCount} items)`}
          </button>
        </div>
      )}

      {/* ── Orders Paused Banner (realtime) ── */}
      {!!pausedUntil && new Date(pausedUntil) > new Date() && (
        <div className="fixed top-0 left-0 right-0 z-[92] flex justify-center px-4 pt-2 pointer-events-none">
          <div className="pointer-events-none flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-orange-600 text-white shadow-xl border border-orange-400/30 text-sm font-semibold animate-in slide-in-from-top-2 duration-300 max-w-sm w-full">
            <span className="text-base" aria-hidden="true">⏸️</span>
            <span className="flex-1">
              {locale === 'en' ? 'Orders are temporarily paused' : 'Los pedidos están temporalmente pausados'}
            </span>
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
        locale={locale === 'en' ? 'en' : 'es'}
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
                className={cn('fixed left-4 z-[71] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden', cartCount > 0 ? 'bottom-48 lg:bottom-16' : 'bottom-16')}
                initial={{ y: 20, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 10, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              >
                {availableLocales.map((code) => {
                  const loc = SUPPORTED_LOCALES.find((l) => l.code === code);
                  const active = locale === code;
                  return (
                    <button
                      key={code}
                      onClick={() => { setLocale(code); setShowLangPicker(false); }}
                      className={cn(
                        'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors',
                        active
                          ? 'bg-[#e6faf7] text-[#047a65] font-semibold'
                          : 'text-gray-700 hover:bg-gray-50',
                      )}
                    >
                      <span className="text-base">{loc?.flag ?? '🌐'}</span>
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
              'fixed left-4 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 shadow-lg text-sm font-medium text-gray-700 hover:shadow-xl transition-shadow active:scale-95',
              cartCount > 0 ? 'bottom-36 lg:bottom-6' : 'bottom-6'
            )}
            aria-label={locale === 'en' ? 'Change language' : 'Cambiar idioma'}
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
              style={{ maxHeight: '80dvh' }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            >
              {/* Drag indicator pill */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>

              {/* Restaurant name header */}
              <div className="text-center px-6 pt-2 pb-4 flex-shrink-0">
                <p className="font-bold text-[18px] text-gray-900 leading-tight">{restaurant.name}</p>
              </div>

              {/* Category list — scrollable */}
              <div className="overflow-y-auto flex-1 pb-4">
                <p className="px-6 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  {locale === 'en' ? 'Explore Menu' : 'Explorar Menú'}
                </p>
                {visibleCats.map((cat) => {
                  const label = tName(cat, locale, defaultLocale);
                  const isActive = isLargeCatalog
                    ? activeCatFilter === cat.id
                    : activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { handleCategorySelect(cat.id); setShowCatSheet(false); }}
                      className={cn(
                        'w-full text-left px-6 py-3.5 text-[15px] transition-colors flex items-center justify-between',
                        isActive
                          ? 'font-semibold text-gray-900 bg-gray-50'
                          : 'font-normal text-gray-700 active:bg-gray-50'
                      )}
                    >
                      <span>{label}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#05c8a7] flex-shrink-0" />}
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
                  {locale === 'en' ? 'Dismiss' : 'Cerrar'}
                </button>
              </div>
              {/* Safe area spacer — decoupled to prevent reflow during slide-in animation */}
              <div className="flex-shrink-0 pb-[env(safe-area-inset-bottom)]" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
