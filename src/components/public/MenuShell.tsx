'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCart, ChevronLeft, ChevronRight, X, MapPin, Clock, Heart, Star, ArrowLeft, Search, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useFavoritesStore } from '@/store/favoritesStore';
import { formatPrice, cn, transitionNavigate } from '@/lib/utils';
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
import { WelcomeScreen } from './WelcomeScreen';

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
}

interface CustomizationTarget {
  product: Product;
  editIndex: number | null;
}

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

  const enabledOrderTypes: OrderType[] = restaurant.order_types_enabled?.length
    ? restaurant.order_types_enabled
    : ['dine_in', 'pickup', 'delivery'];

  const shouldShowWelcome = !tableName && enabledOrderTypes.length >= 2;
  const [showWelcome, setShowWelcome] = useState(shouldShowWelcome);

  const setSelectedOrderType = useCartStore((s) => s.setSelectedOrderType);

  const handleWelcomeSelect = useCallback((type: OrderType) => {
    setSelectedOrderType(type);
    setShowWelcome(false);
  }, [setSelectedOrderType]);

  useEffect(() => {
    setHasMounted(true);
    setRestaurantId(restaurant.id);
    setTableName(tableName);
    router.prefetch(`/r/${restaurant.slug}/checkout`);
  }, [restaurant.id, restaurant.slug, tableName, setRestaurantId, setTableName, router]);

  const cartCount = hasMounted ? rawCartCount : 0;
  const cartTotal = hasMounted ? rawCartTotal : 0;

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFavs, setShowFavs] = useState(false);
  const favIds = useFavoritesStore((s) => s.ids);
  const [activeDiet, setActiveDiet] = useState<DietaryTag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [customization, setCustomization] = useState<CustomizationTarget | null>(null);
  const [toastName, setToastName] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const catScrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [mainEl, setMainEl] = useState<HTMLElement | null>(null);
  const mainRefCb = useCallback((node: HTMLElement | null) => {
    mainRef.current = node;
    setMainEl(node);
  }, []);
  const mobilePillsRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrollingRef = useRef(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const hasCover = !!restaurant.cover_image_url;

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

    const section = sectionRefs.current.get(catId);
    if (section && mainRef.current) {
      isScrollingRef.current = true;
      // offsetTop here is relative to the scroll container's inner content,
      // so subtract the same trigger line we use in scroll-spy so the
      // selected pill stays highlighted after the scroll settles.
      const offset = section.offsetTop - 120;
      mainRef.current.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
      setTimeout(() => { isScrollingRef.current = false; }, 900);
    }
  }, []);

  const handleProductSelect = useCallback((product: Product) => {
    setCustomization({ product, editIndex: null });
  }, []);


  const showToast = useCallback((name: string) => {
    clearTimeout(toastTimer.current);
    setToastName(name);
    toastTimer.current = setTimeout(() => setToastName(null), 2000);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    transitionNavigate(() => router.push(`/r/${restaurant.slug}/checkout`));
  }, [router, restaurant.slug, restaurant.id, rawCartCount, rawCartTotal]);

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

  const itemsByCategory = useMemo(() => {
    return categories
      .map((cat) => ({
        category: cat,
        items: filteredProducts.filter((p) => p.category_id === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, filteredProducts]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, products]);

  // Scroll-spy: Uber Eats / react-use-scrollspy pattern.
  // Listen to scroll events on the container and use getBoundingClientRect()
  // to find the LAST section whose top edge has passed the trigger line.
  useEffect(() => {
    const main = mainRef.current;
    if (!main || itemsByCategory.length === 0) return;

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

  // Track scroll for collapsing header
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const threshold = hasCover ? 100 : 40;
    const onScroll = () => setHeaderScrolled(main.scrollTop > threshold);
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
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

  // Auto-scroll pill bar to show active pill
  useEffect(() => {
    if (!activeCategory) return;
    const container = mobilePillsRef.current ?? catScrollRef.current;
    if (!container) return;
    const pill = container.querySelector(`[data-pill-id="${activeCategory}"]`) as HTMLElement;
    if (pill) {
      pill.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
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
        'flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap',
        isActive
          ? 'bg-emerald-500 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 active:bg-gray-200'
      )}
    >
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
        'flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap',
        showFavs
          ? 'bg-red-500 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 active:bg-gray-200'
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
        'flex-shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap',
        activeDiet === dt.id
          ? 'bg-emerald-500 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 active:bg-gray-200'
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
    <div ref={mobilePillsRef} className="lg:hidden py-3 px-4 flex gap-2.5 overflow-x-auto scrollbar-hide border-b border-gray-100 bg-white sticky z-30" style={{ top: HEADER_HEIGHT }}>
      {visibleCats.map((cat) => categoryPill(cat.id, tName(cat, locale, defaultLocale), activeCategory === cat.id && !showFavs && !activeDiet))}
      {filterDivider}
      {dietPills}
      {favPill}
    </div>
  );

  if (showWelcome) {
    return (
      <WelcomeScreen
        restaurant={restaurant}
        enabledTypes={enabledOrderTypes}
        onSelect={handleWelcomeSelect}
        onReorder={() => setShowWelcome(false)}
        products={products}
        t={t}
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden overscroll-none touch-pan-y">
      {/* Fixed header */}
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

      {/* Mobile category pills — scrolls with content on mobile */}
      <div className="lg:hidden flex-shrink-0">
        {mobileCategoryPills}
      </div>

      {/* ── 3-Column Layout — fills remaining viewport ── */}
      <div className="flex-1 flex overflow-hidden max-w-[1440px] w-full mx-auto">

        {/* Left: Categories — fixed column with own scroll */}
        <aside className="hidden lg:flex flex-col w-[260px] flex-shrink-0 border-r border-gray-100 overflow-y-auto">
          <CategorySidebar
            categories={categories}
            products={products}
            activeCategory={activeCategory}
            onSelect={handleCategorySelect}
            allLabel={t.allCategories}
            locale={locale}
            defaultLocale={defaultLocale}
          />
        </aside>

        {/* Center: Products grid — scrolls independently */}
        <main ref={mainRefCb} className={`flex-1 min-w-0 overflow-y-auto lg:pb-8 ${cartCount > 0 ? 'pb-28' : 'pb-4'}`}>

          {/* Cover image banner */}
          {restaurant.cover_image_url && (
            <div className="relative w-full h-40 sm:h-48 lg:h-56 bg-gray-100 overflow-hidden">
              <Image
                src={restaurant.cover_image_url}
                alt={restaurant.name}
                fill
                sizes="100vw"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 lg:px-8 lg:pb-5">
                <h2 className="text-white font-extrabold text-xl lg:text-2xl tracking-tight drop-shadow-sm lg:hidden">
                  {restaurant.name}
                </h2>
                {reviewStats && reviewStats.total > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 lg:hidden">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-white tabular-nums">{reviewStats.average}</span>
                    <span className="text-sm text-white/70">({reviewStats.total}+)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile info bar (when no cover, show name/rating/description) */}
          {!restaurant.cover_image_url && (
            <div className="lg:hidden px-4 pt-4 pb-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-extrabold text-gray-900 tracking-tight truncate">{restaurant.name}</h2>
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

          <div className="px-4 lg:px-8 pt-3 lg:pt-6">
          {/* Restaurant info + category tabs (desktop) */}
          <div className="hidden lg:block mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{restaurant.name}</h2>
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
                  return (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      {dh.open} – {dh.close}
                    </span>
                  );
                })()}
              </div>
            )}
            <div className="relative mt-6">
              <button onClick={() => scrollCats('left')} className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-white via-white to-transparent flex items-center justify-start" aria-label="Scroll left">
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <div ref={catScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-6 pb-0.5">
                {visibleCats.map((cat) => categoryPill(cat.id, tName(cat, locale, defaultLocale), activeCategory === cat.id && !showFavs && !activeDiet))}
                {filterDivider}
                {dietPills}
                {favPill}
              </div>
              <button onClick={() => scrollCats('right')} className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-end" aria-label="Scroll right">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {searchResults !== null ? (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
              </p>
              {searchResults.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <p className="font-medium">{t.noResults}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {searchResults.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onSelect={handleProductSelect}
                      onQuickAdd={handleQuickAdd}
                      fmtPrice={fmtPrice}
                      addLabel={t.addToCart}
                      customizeLabel={t.customize}
                      popularLabel={t.popular}
                      locale={locale}
                      defaultLocale={defaultLocale}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : showFavs ? (
            <div>
              <div className="flex items-center gap-3 mb-4 py-2">
                <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                <h2 className="text-lg font-bold text-gray-900">
                  {locale === 'es' ? 'Favoritos' : 'Favorites'}
                </h2>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full tabular-nums">
                  {favIds.length}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {favIds.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <Heart className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="font-medium">{locale === 'es' ? 'Aún no tienes favoritos' : 'No favorites yet'}</p>
                  <p className="text-sm mt-1">{locale === 'es' ? 'Toca el ♥ en un producto para guardarlo' : 'Tap ♥ on a product to save it'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
                      locale={locale}
                      defaultLocale={defaultLocale}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-semibold text-gray-600 mb-1">{t.noProductsYet}</p>
            </div>
          ) : activeDiet && filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-3xl mb-3">{DIETARY_TAGS.find((d) => d.id === activeDiet)?.emoji}</p>
              <p className="font-medium">{locale === 'es' ? 'No hay productos con esta dieta' : 'No products match this diet'}</p>
              <button onClick={() => setActiveDiet(null)} className="mt-3 text-sm text-emerald-600 font-semibold">{locale === 'es' ? 'Ver todo el menú' : 'View full menu'}</button>
            </div>
          ) : (
            <div className="space-y-10">
              {itemsByCategory.map(({ category, items }) => (
                <section
                  key={category.id}
                  data-cat-id={category.id}
                  ref={(el) => {
                    if (el) sectionRefs.current.set(category.id, el);
                    else sectionRefs.current.delete(category.id);
                  }}
                >
                  <div className="flex items-center gap-3 mb-4 py-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {tName(category, locale, defaultLocale)}
                    </h2>
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full tabular-nums">
                      {items.length}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {items.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onSelect={handleProductSelect}
                        onQuickAdd={handleQuickAdd}
                        fmtPrice={fmtPrice}
                        addLabel={t.addToCart}
                        customizeLabel={t.customize}
                        popularLabel={t.popular}
                        locale={locale}
                        defaultLocale={defaultLocale}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
          {/* Recent reviews */}
          {recentReviews && recentReviews.length > 0 && (
            <section className="mt-8 mb-6">
              <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                {locale === 'en' ? 'What our customers say' : 'Lo que dicen nuestros clientes'}
                {reviewStats && reviewStats.total > 0 && (
                  <span className="text-sm font-normal text-gray-400 ml-1">
                    ({reviewStats.average} / 5 · {reviewStats.total} {locale === 'en' ? 'reviews' : 'reseñas'})
                  </span>
                )}
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory">
                {recentReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex-shrink-0 w-[260px] snap-start bg-white rounded-xl border border-gray-100 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                        {review.customer_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{review.customer_name}</p>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={cn('w-3 h-3', s <= review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200')}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          </div>{/* end px wrapper */}
        </main>

        {/* Right: Cart — fixed column with own scroll, desktop only */}
        <aside className="hidden lg:flex flex-col w-[360px] flex-shrink-0 border-l border-gray-100">
          <CartPanel
            fmtPrice={fmtPrice}
            t={t}
            onEdit={handleEditCartItem}
            onCheckout={handleOpenCheckout}
            estimatedMinutes={restaurant.estimated_delivery_minutes ?? undefined}
            deliveryFee={restaurant.delivery_fee ?? undefined}
            locale={locale}
          />
        </aside>
      </div>

      {/* ── Mobile: Bottom cart bar ── */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
          <div className="p-4 pt-8 bg-gradient-to-t from-white via-white/95 to-transparent">
            <div className="max-w-lg mx-auto pointer-events-auto">
              <button
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white text-emerald-600 text-[10px] font-bold px-1">
                      {cartCount}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-[15px] tabular-nums">
                  {fmtPrice(cartTotal)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: Cart Drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="absolute inset-y-0 right-0 w-full sm:w-[440px] bg-white flex flex-col shadow-2xl"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <button onClick={() => setOpen(false)} className="flex items-center gap-2 text-gray-600 active:text-gray-900 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">{t.backToMenu}</span>
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold text-gray-900">{t.yourCart}</h2>
                  <button onClick={() => setOpen(false)} className="p-2 -mr-2 rounded-lg active:bg-gray-100 transition-colors" aria-label="Close">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <CartPanel
                  fmtPrice={fmtPrice}
                  t={t}
                  onEdit={(idx) => { setOpen(false); handleEditCartItem(idx); }}
                  onCheckout={() => { setOpen(false); handleOpenCheckout(); }}
                />
              </div>
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
                    {searchResults.length} {searchResults.length === 1 ? 'resultado' : 'resultados'}
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
                    {locale === 'es' ? 'Intenta con otro termino' : 'Try a different search term'}
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
            {toastName} {locale === 'es' ? 'se ha agregado al carrito' : 'added to cart'}
          </div>
        </div>
      )}

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
                className="fixed bottom-20 left-4 z-[71] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
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
            className="fixed bottom-20 lg:bottom-6 left-4 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-full bg-white border border-gray-200 shadow-lg text-sm font-medium text-gray-700 hover:shadow-xl transition-shadow active:scale-95"
          >
            <Globe className="w-4 h-4 text-gray-500" />
            <span>{getLocaleFlag(locale)}</span>
          </button>
        </>
      )}

    </div>
  );
}
