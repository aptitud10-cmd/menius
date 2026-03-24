'use client';

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCart, ChevronLeft, ChevronRight, X, MapPin, Clock, Heart, Star, ArrowLeft, Search, Globe, RotateCcw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { formatPrice, cn } from '@/lib/utils';
import { getTranslations, type Locale } from '@/lib/translations';
import type { Restaurant, Category, Product, OrderType, DietaryTag } from '@/types';
import { DIETARY_TAGS } from '@/lib/dietary-tags';
import { getLocaleFlag, SUPPORTED_LOCALES, tName, tDesc } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';

import { MenuHeader, HEADER_HEIGHT } from './MenuHeader';
import { CategorySidebar } from './CategorySidebar';
import { ProductCard } from './ProductCard';
import { CartPanel } from './CartPanel';
import { CustomizationSheet } from './CustomizationSheet';
import { InstallBanner } from './InstallBanner';
import { ReservationWidget } from './ReservationWidget';
import { MenuUpdateBanner } from './MenuUpdateBanner';
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

// Renders children only when the section scrolls near the viewport.
// Once rendered, stays rendered (one-way latch) to avoid thrashing.
// The wrapping <section> with sectionRef is unaffected — scroll-spy works normally.
function SkeletonCard() {
  return <div className="rounded-2xl bg-gray-100 aspect-square" />;
}

const LazyProductGrid = memo(function LazyProductGrid({
  itemCount,
  children,
}: {
  itemCount: number;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { rootMargin: '400px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  if (!visible) {
    return (
      <div ref={ref} className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: Math.min(itemCount, 6) }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return <div ref={ref}>{children}</div>;
});

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
    setTableName(tableName);
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
  const CATEGORY_PREVIEW = 8; // kept for potential future use
  // Large-catalog mode: 60+ products → one category at a time (like Uber Eats)
  const LARGE_CATALOG_THRESHOLD = 60;
  const isLargeCatalog = products.length >= LARGE_CATALOG_THRESHOLD;
  const [activeCatFilter, setActiveCatFilter] = useState<string | null>(null);
  const [showFavs, setShowFavs] = useState(false);
  const favIds = useFavoritesStore((s) => s.ids);
  const [activeDiet, setActiveDiet] = useState<DietaryTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [customization, setCustomization] = useState<CustomizationTarget | null>(null);
  const [toastName, setToastName] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const catScrollRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  const mainRefCb = useCallback((node: HTMLElement | null) => {
    mainRef.current = node;
    setMainEl(node);
  }, []);
  const mobilePillsRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrollingRef = useRef(false);
  // True while the banner element is at least partially visible in the scroll container.
  // Tracked by IntersectionObserver — always accurate, no timing issues.
  const bannerVisibleRef = useRef(true);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const hasCover = !!restaurant.cover_image_url;
  const cartColRef = useRef<HTMLDivElement>(null);
  const [flyParticles, setFlyParticles] = useState<{ id: number; sx: number; sy: number }[]>([]);
  const flyIdRef = useRef(0);

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

  // Fly-to-cart: listen for quick-add events and animate a particle to the cart panel.
  useEffect(() => {
    const handler = (e: Event) => {
      const { x, y } = (e as CustomEvent).detail as { x: number; y: number };
      const id = ++flyIdRef.current;
      setFlyParticles((prev) => [...prev, { id, sx: x, sy: y }]);
      setTimeout(() => {
        setFlyParticles((prev) => prev.filter((p) => p.id !== id));
      }, 700);
    };
    window.addEventListener('menu:cart-fly', handler);
    return () => window.removeEventListener('menu:cart-fly', handler);
  }, []);

  const handleCategorySelect = useCallback((catId: string | null) => {
    setSearchQuery('');
    setShowSearch(false);
    setShowFavs(false);
    setActiveDiet(null);
    setActiveCategory(catId);

    if (catId === null) {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isLargeCatalog) {
      setActiveCatFilter(catId);
      // If the banner is visible, stay at top. If hidden, jump to just past the banner.
      const top = bannerVisibleRef.current ? 0 : getBannerHeight();
      mainRef.current?.scrollTo({ top, behavior: 'auto' });
      return;
    }

    const section = sectionRefs.current.get(catId);
    if (section && mainRef.current) {
      isScrollingRef.current = true;
      const bannerHeight = getBannerHeight();
      const sectionTop = section.getBoundingClientRect().top;
      const containerTop = mainRef.current.getBoundingClientRect().top;
      const rawOffset = mainRef.current.scrollTop + sectionTop - containerTop;
      // Always scroll past the banner so it stays hidden after navigation
      const offset = Math.max(bannerHeight, rawOffset);
      mainRef.current.scrollTo({ top: offset, behavior: 'smooth' });
      setTimeout(() => { isScrollingRef.current = false; }, 900);
    }
  }, [isLargeCatalog, getBannerHeight]);

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
      setCustomization({ product: item.product, editIndex: index });
    }
  }, []);

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

  const availableDiets = useMemo(() => {
    const tagSet = new Set<string>();
    for (const p of products) {
      for (const t of p.dietary_tags ?? []) tagSet.add(t);
    }
    return DIETARY_TAGS.filter((dt) => tagSet.has(dt.id));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!activeDiet) return products;
    return products.filter((p) => p.dietary_tags?.includes(activeDiet));
  }, [products, activeDiet]);

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

  // Suggested upsell: featured products not already in the cart, max 5
  const cartProductIds = useCartStore((s) => new Set(s.items.map((i) => i.product.id)));
  // Smart cross-selling: suggest complementary items based on the main product's category type.
  // Rule-based pairing (drinks/sides for mains, etc.) without API latency.
  const suggestedProducts = useMemo(() => {
    const mainProduct = customization?.product;
    if (!mainProduct) return [];

    const classify = (catName: string, productName: string): 'drink' | 'dessert' | 'side' | 'main' => {
      const text = `${catName} ${productName}`.toLowerCase();
      if (/bebida|drink|refresco|soda|agua\b|jugo|juice|cerveza|beer|vino|wine|shake|batido|caf[eé]|coffee|t[eé]\b|smoothie|limon/i.test(text)) return 'drink';
      if (/postre|dessert|helado|ice cream|pastel|cake|brownie|dulce|sweet|cookie|tiramisú|flan/i.test(text)) return 'dessert';
      if (/acompañ|side|ensalada|salad|sopa|soup|papa|fries|chips|guarnición|arroz|rice/i.test(text)) return 'side';
      return 'main';
    };

    const mainCat = categories.find((c) => c.id === mainProduct.category_id);
    const mainType = classify(mainCat?.name ?? '', mainProduct.name);

    // Priority order of desired companion types
    const wantOrder: Array<'drink' | 'dessert' | 'side' | 'main'> = (() => {
      if (mainType === 'main')    return ['drink', 'side', 'dessert'];
      if (mainType === 'side')    return ['drink', 'main'];
      if (mainType === 'dessert') return ['drink'];
      /* drink */                 return ['main', 'side', 'dessert'];
    })();

    return products
      .filter((p) => p.id !== mainProduct.id && p.in_stock !== false && !cartProductIds.has(p.id))
      .map((p) => {
        const cat = categories.find((c) => c.id === p.category_id);
        const pType = classify(cat?.name ?? '', p.name);
        const typeRank = wantOrder.indexOf(pType); // -1 = irrelevant
        if (typeRank === -1) return null;
        // Lower score = shown first; featured within each rank group gets priority
        const score = typeRank * 10 + (p.is_featured ? 0 : 1);
        return { product: p, score };
      })
      .filter((x): x is { product: Product; score: number } => x !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map(({ product }) => product);
  }, [customization?.product, products, categories, cartProductIds]);

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
  }, [categories, filteredProducts, isCategoryAvailableNow, popularProducts, locale, restaurant.id]);

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

        const triggerY = main.getBoundingClientRect().top + 130;
        let current = itemsByCategory[0].category.id;

        for (const { category } of itemsByCategory) {
          const el = sectionRefs.current.get(category.id);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= triggerY) {
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
  }, [itemsByCategory, mainEl]);

  const [sectionProgress, setSectionProgress] = useState<Record<string, number>>({});

  // Track scroll for collapsing header + section progress indicator.
  // Progress updates are throttled with rAF to avoid expensive state updates on every pixel.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const threshold = hasCover ? 100 : 40;
    let rafId = 0;
    const onScroll = () => {
      setHeaderScrolled(main.scrollTop > threshold);
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const progress: Record<string, number> = {};
        sectionRefs.current.forEach((el, catId) => {
          const top = el.offsetTop - main.scrollTop;
          const h = el.offsetHeight;
          const p = Math.max(0, Math.min(1, -top / h));
          progress[catId] = p;
        });
        setSectionProgress(progress);
      });
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => { main.removeEventListener('scroll', onScroll); cancelAnimationFrame(rafId); };
  }, [hasCover, mainEl]);

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

  // Auto-scroll pill bar to show active pill.
  // Desktop uses manual scrollTo (catScrollRef). Mobile uses scrollIntoView for reliability.
  useEffect(() => {
    if (!activeCategory) return;
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (isDesktop) {
      const container = catScrollRef.current;
      if (!container) return;
      const pill = container.querySelector(`[data-pill-id="${activeCategory}"]`) as HTMLElement;
      if (pill) {
        const containerRect = container.getBoundingClientRect();
        const pillRect = pill.getBoundingClientRect();
        const targetLeft =
          container.scrollLeft +
          pillRect.left -
          containerRect.left -
          (containerRect.width - pillRect.width) / 2;
        container.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      }
    } else {
      const container = mobilePillsRef.current;
      if (!container) return;
      const pill = container.querySelector(`[data-pill-id="${activeCategory}"]`) as HTMLElement;
      if (pill) {
        pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeCategory]);

  const scrollCats = (dir: 'left' | 'right') => {
    catScrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const categoryPill = (id: string, label: string, isActive: boolean) => (
    <button
      key={id}
      data-pill-id={id}
      onClick={() => handleCategorySelect(id)}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200 whitespace-nowrap',
        id === POPULAR_ID
          ? isActive
            ? 'bg-amber-500 text-white shadow-md'
            : 'bg-amber-50 text-amber-700 active:bg-amber-100'
          : isActive
            ? 'bg-gray-900 text-white shadow-md'
            : 'bg-gray-100 text-gray-700 active:bg-gray-200'
      )}
    >
      {id === POPULAR_ID && <span className="text-xs leading-none">🔥</span>}
      {label}
    </button>
  );

  const visibleCats = itemsByCategory.map((g) => g.category);

  const favPill = hasMounted && favIds.length > 0 && (
    <button
      key="__favs__"
      data-pill-id="__favs__"
      onClick={() => { setShowFavs(!showFavs); if (!showFavs) setActiveCategory(null); }}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200 whitespace-nowrap',
        showFavs
          ? 'bg-red-500 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 active:bg-gray-200'
      )}
    >
      <Heart className={cn('w-3.5 h-3.5', showFavs ? 'fill-white' : '')} />
      {favIds.length}
    </button>
  );

  const dietPills = availableDiets.length > 0 && availableDiets.map((dt) => (
    <button
      key={dt.id}
      data-pill-id={`diet-${dt.id}`}
      onClick={() => {
        const next = activeDiet === dt.id ? null : dt.id;
        setActiveDiet(next);
        setShowFavs(false);
        if (next) setActiveCategory(null);
      }}
      className={cn(
        'flex-shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200 whitespace-nowrap',
        activeDiet === dt.id
          ? 'bg-emerald-500 text-white shadow-md'
          : 'bg-gray-100 text-gray-700 active:bg-gray-200'
      )}
    >
      <span className="text-xs">{dt.emoji}</span>
      {locale === 'en' ? dt.labelEn : dt.labelEs}
    </button>
  ));

  const filterDivider = (availableDiets.length > 0 || (hasMounted && favIds.length > 0)) && (
    <div className="flex-shrink-0 self-center w-px h-5 bg-gray-200 mx-1" aria-hidden />
  );

  const mobileCategoryPills = (
    <div className="lg:hidden sticky z-40 bg-white border-b border-gray-200" style={{ top: hasCover ? HEADER_HEIGHT : 0 }}>
      <div ref={mobilePillsRef} className="py-2 px-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {/* Large catalog: "Todos" pill to show all categories */}
        {isLargeCatalog && (
          <button
            data-pill-id="__all__"
            onClick={() => { setActiveCatFilter(null); setActiveCategory(null); mainRef.current?.scrollTo({ top: 0, behavior: 'auto' }); }}
            className={cn(
              'flex-shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-bold transition-all duration-200 whitespace-nowrap',
              !activeCatFilter && !showFavs && !activeDiet
                ? 'bg-gray-800 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 active:bg-gray-200'
            )}
          >
            {t.filterAll}
          </button>
        )}
        {visibleCats.map((cat) => categoryPill(
          cat.id,
          tName(cat, locale, defaultLocale),
          isLargeCatalog
            ? activeCatFilter === cat.id && !showFavs && !activeDiet
            : activeCategory === cat.id && !showFavs && !activeDiet
        ))}
        {filterDivider}
        {dietPills}
        {favPill}
        {/* Spacer so last pill doesn't sit under the fade */}
        <div className="w-8 flex-shrink-0" aria-hidden="true" />
      </div>
      {/* Right-side fade gradient indicating more content */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent" aria-hidden="true" />
    </div>
  );

  const ordersLeft = limitedMode ? Math.max(0, limitedMode.dailyLimit - limitedMode.ordersToday) : null;

  return (
    <div className="relative h-[100dvh] flex flex-col bg-[#f8f8f8] overflow-hidden overscroll-none touch-pan-y">
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
      />
      </div>

      {/* ── Outer scroll: banner scrolls away, sidebar/cart stay sticky ── */}
      <div
        ref={mainRefCb}
        className={`flex-1 overflow-y-auto max-w-[1440px] w-full mx-auto ${cartCount > 0 ? 'pb-36 lg:pb-0' : ''}`}
      >

        {/* Cover banner — full width, scrolls away naturally with content */}
        {restaurant.cover_image_url && (
          <div ref={bannerRef} className="relative w-full h-64 sm:h-72 lg:h-72 bg-gray-100 overflow-hidden rounded-b-2xl">
            <Image
              src={restaurant.cover_image_url}
              alt={restaurant.name}
              fill
              sizes="(max-width: 1440px) 100vw, 1440px"
              className="object-cover animate-cover-zoom"
              priority
            />
            {/* Gradient overlay — stronger at bottom for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            {/* Mobile: nombre centrado y grande */}
            <div className="lg:hidden flex absolute bottom-0 left-0 right-0 px-4 pb-5 flex-col items-center text-center gap-2">
              <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow leading-tight">
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="text-xs text-white/70 line-clamp-1 max-w-xs">{restaurant.description}</p>
              )}
              {reviewStats && reviewStats.total > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-sm">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-white tabular-nums">{reviewStats.average}</span>
                  <span className="text-xs text-white/70">({reviewStats.total}+)</span>
                </div>
              )}
            </div>

            {/* Desktop: nombre + info a la izquierda, rating a la derecha */}
            <div className="hidden lg:flex absolute bottom-0 left-0 right-0 px-8 pb-5 items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm leading-tight truncate">
                  {restaurant.name}
                </h1>
                {restaurant.description && (
                  <p className="text-sm text-white/75 mt-1 max-w-lg line-clamp-1">{restaurant.description}</p>
                )}
                {(restaurant.address || restaurant.operating_hours) && (
                  <div className="flex items-center gap-4 mt-2 text-sm text-white/70">
                    {restaurant.address && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400" />
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
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
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
        <div className="flex min-h-[calc(100dvh-48px)]">

        {/* Left: Sidebar — sticky, stays in place while content scrolls */}
        <aside className="hidden lg:flex flex-col w-[200px] flex-shrink-0 border-r border-gray-100 sticky top-0 h-[calc(100dvh-48px)] overflow-y-auto">
          <CategorySidebar
            categories={categories}
            products={products}
            activeCategory={isLargeCatalog ? (activeCatFilter ?? null) : activeCategory}
            onSelect={handleCategorySelect}
            allLabel={t.allCategories}
            locale={locale}
            defaultLocale={defaultLocale}
            sectionProgress={sectionProgress}
          />
        </aside>

        {/* Center: wrapper so sticky pills + products stack vertically */}
        <div className="flex-1 min-w-0 flex flex-col">

        {/* Sticky category pills — desktop only, pins once banner scrolls away */}
        <div className="hidden lg:block sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="relative px-2 py-2">
            <button onClick={() => scrollCats('left')} className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-white via-white to-transparent flex items-center justify-start" aria-label={locale === 'en' ? 'Scroll left' : 'Desplazar izquierda'}>
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <div ref={catScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-6 pb-0.5">
              {visibleCats.map((cat) => categoryPill(cat.id, tName(cat, locale, defaultLocale), activeCategory === cat.id && !showFavs && !activeDiet))}
              {filterDivider}
              {dietPills}
              {favPill}
            </div>
            <button onClick={() => scrollCats('right')} className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-end" aria-label={locale === 'en' ? 'Scroll right' : 'Desplazar derecha'}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Center: Products — natural flow, no independent scroll */}
        <main className={`flex-1 min-w-0 pb-4 lg:pb-8`}>

          {/* Mobile info bar (when no cover, show name/rating/description) */}
          {!restaurant.cover_image_url && (
            <div className="lg:hidden px-4 pt-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-lg font-extrabold text-gray-900 tracking-tight truncate">{restaurant.name}</h1>
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
            <div className="mx-4 lg:mx-8 mt-3 lg:mt-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">
                  {t.reorderLastOrder}
                </p>
                <p className="text-xs text-emerald-600 truncate mt-0.5">
                  {lastOrder!.items.map((i) => `${i.qty}× ${i.productName}`).join(' · ')}
                </p>
              </div>
              <button
                onClick={handleReorder}
                className="flex-shrink-0 px-3.5 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-transform"
              >
                {t.addToCart}
              </button>
              <button
                onClick={() => setReorderDismissed(true)}
                className="flex-shrink-0 p-1.5 text-emerald-400 hover:text-emerald-600 transition-colors"
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
                  <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{restaurant.name}</h1>
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
                      <span className={`inline-flex items-center gap-1.5 ${is24h ? 'text-emerald-500 font-medium' : ''}`}>
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
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                  >
                    <circle cx="28" cy="28" r="18" stroke="#d1d5db" strokeWidth="3" fill="none" />
                    <path d="M41 41L52 52" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" />
                    <path d="M22 28h12M28 22v12" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
                  </motion.svg>
                  <div>
                    <p className="font-semibold text-gray-500">{t.noResults}</p>
                    <p className="text-sm text-gray-400 mt-1">{locale === 'en' ? 'Try a different keyword' : 'Intenta con otra palabra'}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-2 xl:grid-cols-3 gap-3"
                  initial="hidden"
                  animate="visible"
                  variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }}
                >
                  {searchResults.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } } }}
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
              <button onClick={() => setActiveDiet(null)} className="mt-1 text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">{t.viewFullMenu}</button>
            </motion.div>
          ) : (
            <div className="space-y-12">
              {displayedGroups.map(({ category, items, available }) => {
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
                    <div className="flex items-center gap-3 mb-5">
                      {isPopular && <span className="text-xl leading-none">🔥</span>}
                      <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
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
                        <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md tabular-nums">
                          {items.length}
                        </span>
                      )}
                      <div className="flex-1 h-px bg-gradient-to-r from-gray-100 to-transparent" />
                    </div>
                    <div className={cn('relative', isLocked && 'pointer-events-none')}>
                      {isLocked && (
                        <div className="absolute inset-0 z-10 rounded-2xl bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-500">
                              {locale === 'en'
                                ? `Available ${category.available_from} – ${category.available_to}`
                                : `Disponible ${category.available_from} – ${category.available_to}`}
                            </span>
                          </div>
                        </div>
                      )}
                      <LazyProductGrid itemCount={items.length}>
                        <motion.div
                          className={cn('grid grid-cols-2 xl:grid-cols-3 gap-3', isLocked && 'opacity-40')}
                          initial="hidden"
                          whileInView="visible"
                          viewport={{ once: true, margin: '-40px' }}
                          variants={{
                            hidden: {},
                            visible: { transition: { staggerChildren: 0.06 } },
                          }}
                        >
                          {items.map((product) => (
                            <motion.div
                              key={product.id}
                              variants={{
                                hidden: { opacity: 0, y: 16 },
                                visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
                              }}
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
                      </LazyProductGrid>
                    </div>
                  </section>
                );
              })}
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
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 flex-shrink-0">
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
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-emerald-600" />
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
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-1.5 transition-colors"
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
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {t.schedule}
                      </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          <span className="font-medium text-gray-700">{dayNames[todayIdx]}:</span>{' '}
                          {todayHours && !todayHours.closed
                            ? (todayHours.open === '00:00' && todayHours.close === '23:59'
                              ? <span className="text-emerald-500 font-medium">{t.open24h}</span>
                              : `${todayHours.open} – ${todayHours.close}`)
                            : t.closedDay}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {restaurant.phone && (
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {t.phoneLabel}
                      </p>
                      <a href={`tel:${restaurant.phone}`} className="text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors mt-0.5 block">
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
          <div className="mt-10 mb-6 pt-6 border-t border-gray-100 flex flex-col items-center gap-2">
            <a
              href="https://menius.app?ref=menu"
              target="_blank"
              rel="noopener noreferrer"
              className="group/pw inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 text-xs text-gray-400 hover:text-emerald-600 transition-all duration-300"
            >
              <svg className="w-4 h-4 text-emerald-400 group-hover/pw:text-emerald-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" /></svg>
              <span>{t.poweredBy}</span>
              <span className="font-bold text-gray-600 group-hover/pw:text-emerald-700 tracking-tight transition-colors">MENIUS</span>
            </a>
            <a
              href="https://menius.app?ref=menu-cta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-gray-300 hover:text-emerald-500 transition-colors"
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

      {/* ── Fly-to-cart particles (desktop only) ── */}
      {flyParticles.map((p) => {
        const cartRect = cartColRef.current?.getBoundingClientRect();
        const tx = cartRect ? cartRect.left + cartRect.width / 2 - p.sx : 0;
        const ty = cartRect ? cartRect.top + 40 - p.sy : -200;
        return (
          <motion.div
            key={p.id}
            className="fixed z-[999] w-5 h-5 rounded-full bg-emerald-500 pointer-events-none hidden lg:block"
            style={{ left: p.sx - 10, top: p.sy - 10 }}
            initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
            animate={{ scale: 0.3, opacity: 0, x: tx, y: ty }}
            transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        );
      })}

      {/* ── Mobile: Bottom cart bar ── */}
      {ordersLeft === 0 ? (
        /* Limit reached — generic "paused" bar, no mention of billing */
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none">
          <div className="px-4 pt-10 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-gradient-to-t from-white via-white to-transparent">
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
          <div className="px-4 pt-10 pb-[calc(env(safe-area-inset-bottom)+1rem)] bg-gradient-to-t from-white via-white to-transparent">
            <div className="max-w-lg mx-auto pointer-events-auto">
              <button
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl bg-emerald-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.4)] active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white text-emerald-600 text-[10px] font-extrabold px-1">
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
              transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1.5 rounded-full bg-gray-300" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
                <h2 id="cart-sheet-title" className="text-base font-bold text-gray-900">{t.yourCart}</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl active:bg-gray-100 transition-colors"
                  aria-label={locale === 'en' ? 'Close cart' : 'Cerrar carrito'}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden min-h-0">
                <CartPanel
                  fmtPrice={fmtPrice}
                  t={t}
                  onEdit={(idx) => { setOpen(false); handleEditCartItem(idx); }}
                  onCheckout={handleOpenCheckout}
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
            onSuggestAdd={handleQuickAdd}
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
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                className="p-1.5 -ml-1 rounded-lg active:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-[15px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 placeholder-gray-400"
                  autoFocus
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400" />
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
                <div className="flex flex-col items-center justify-center h-full text-center px-8">
                  <p className="text-base font-semibold text-gray-900 mb-1">{t.noResults}</p>
                  <p className="text-sm text-gray-400">
                    {t.tryDifferentSearch}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ── Toast: "X se ha agregado al carrito" ── */}
      {toastName && (
        <div className="fixed bottom-28 left-4 right-4 z-[60] flex justify-center lg:bottom-6 lg:left-auto lg:right-6 pointer-events-none">
          <div className="px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm font-medium shadow-lg">
            {toastName} {t.addedCartSuffix}
          </div>
        </div>
      )}

      {/* ── Cart resumption toast — shown once when returning with items in cart ── */}
      {cartResumeShown && !toastName && (
        <div className="fixed bottom-28 left-4 right-4 z-[60] flex justify-center lg:bottom-6 lg:left-auto lg:right-6 pointer-events-none">
          <button
            className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold shadow-lg active:scale-95 transition-transform"
            onClick={() => { setCartResumeShown(false); setOpen(true); }}
          >
            <ShoppingCart className="w-4 h-4" />
            {locale === 'en' ? `Continue your order (${rawCartCount} items)` : `Continúa tu pedido (${rawCartCount} items)`}
          </button>
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
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
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

    </div>
  );
}
