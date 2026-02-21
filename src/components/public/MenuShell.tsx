'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShoppingCart, ChevronLeft, ChevronRight, CheckCircle, X, MapPin, Clock } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice, cn } from '@/lib/utils';
import { getTranslations, type Locale } from '@/lib/translations';
import type { Restaurant, Category, Product, OrderType } from '@/types';

import { MenuHeader, HEADER_HEIGHT } from './MenuHeader';
import { CategorySidebar } from './CategorySidebar';
import { ProductCard } from './ProductCard';
import { CartPanel } from './CartPanel';
import { CustomizationSheet } from './CustomizationSheet';
import { CheckoutSheet } from './CheckoutSheet';
import { WelcomeScreen } from './WelcomeScreen';

interface MenuShellProps {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  tableName: string | null;
  locale?: Locale;
  backUrl?: string;
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
  backUrl,
}: MenuShellProps) {
  const [locale] = useState<Locale>(initialLocale);
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
  }, [restaurant.id, tableName, setRestaurantId, setTableName]);

  const cartCount = hasMounted ? rawCartCount : 0;
  const cartTotal = hasMounted ? rawCartTotal : 0;

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [customization, setCustomization] = useState<CustomizationTarget | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const catScrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const mobilePillsRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrollingRef = useRef(false);

  const handleCategorySelect = useCallback((catId: string | null) => {
    setSearchQuery('');
    setShowSearch(false);
    setActiveCategory(catId);

    if (catId === null) {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const section = sectionRefs.current.get(catId);
    if (section && mainRef.current) {
      isScrollingRef.current = true;
      const offset = section.offsetTop - 8;
      mainRef.current.scrollTo({ top: offset, behavior: 'smooth' });
      setTimeout(() => { isScrollingRef.current = false; }, 800);
    }
  }, []);

  const handleProductSelect = useCallback((product: Product) => {
    setCustomization({ product, editIndex: null });
  }, []);

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const handleQuickAdd = useCallback((product: Product) => {
    addItem(product, null, [], 1, '');
    showToast(`${product.name} — ${t.addedToCart}`);
  }, [addItem, showToast, t.addedToCart]);

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
    setShowCheckout(true);
  }, []);

  const handleCloseCheckout = useCallback(() => {
    setShowCheckout(false);
  }, []);

  const itemsByCategory = useMemo(() => {
    return categories
      .map((cat) => ({
        category: cat,
        items: products.filter((p) => p.category_id === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, products]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, products]);

  // Scroll-spy: highlight pill based on visible section
  useEffect(() => {
    const main = mainRef.current;
    if (!main || itemsByCategory.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-cat-id');
            if (id) setActiveCategory(id);
          }
        }
      },
      { root: main, rootMargin: '-10% 0px -80% 0px', threshold: 0 }
    );

    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [itemsByCategory]);

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

  const mobileCategoryPills = (
    <div ref={mobilePillsRef} className="lg:hidden py-3 px-4 flex gap-2.5 overflow-x-auto scrollbar-hide border-b border-gray-100 bg-white sticky z-30" style={{ top: HEADER_HEIGHT }}>
      {visibleCats.map((cat) => categoryPill(cat.id, cat.name, activeCategory === cat.id))}
    </div>
  );

  if (showWelcome) {
    return (
      <WelcomeScreen
        restaurant={restaurant}
        enabledTypes={enabledOrderTypes}
        onSelect={handleWelcomeSelect}
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
          />
        </aside>

        {/* Center: Products grid — scrolls independently */}
        <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto px-4 lg:px-8 py-5 pb-28 lg:py-6 lg:pb-8">
          {/* Restaurant info + category tabs (desktop) */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{restaurant.name}</h2>
            {restaurant.description && (
              <p className="text-base text-gray-500 mt-1.5 max-w-xl">{restaurant.description}</p>
            )}
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
                {visibleCats.map((cat) => categoryPill(cat.id, cat.name, activeCategory === cat.id))}
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
                    />
                  ))}
                </div>
              )}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-semibold text-gray-600 mb-1">{t.noProductsYet}</p>
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
                      {category.name}
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
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
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
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] active:scale-[0.98] transition-all duration-150"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingCart className="w-5 h-5" />
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold px-1">
                      {cartCount}
                    </span>
                  </div>
                  <span className="font-semibold text-[15px]">{t.viewCart}</span>
                </div>
                <span className="font-bold text-[15px] tabular-nums">{fmtPrice(cartTotal)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile: Cart Drawer ── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full sm:w-[440px] bg-white flex flex-col shadow-2xl animate-[slideInRight_0.25s_ease-out]">
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
          </div>
        </div>
      )}

      {/* ── Customization Sheet ── */}
      {customization && (
        <CustomizationSheet
          product={customization.product}
          editIndex={customization.editIndex}
          onClose={handleCloseCustomization}
          fmtPrice={fmtPrice}
          t={t}
          locale={locale}
        />
      )}

      {/* ── Checkout Sheet ── */}
      {showCheckout && (
        <CheckoutSheet
          restaurant={restaurant}
          onClose={handleCloseCheckout}
          fmtPrice={fmtPrice}
          t={t}
          locale={locale}
        />
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <div className="fixed bottom-28 left-4 right-4 z-[60] pointer-events-none animate-[toastIn_0.25s_ease-out] flex justify-center lg:left-auto lg:right-6 lg:bottom-6 lg:w-auto">
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500 text-white shadow-lg">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-semibold">{toast}</span>
          </div>
        </div>
      )}

    </div>
  );
}
