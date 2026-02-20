'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ShoppingCart, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice, cn } from '@/lib/utils';
import { getTranslations, type Locale } from '@/lib/translations';
import type { Restaurant, Category, Product } from '@/types';

import { MenuHeader, HEADER_HEIGHT } from './MenuHeader';
import { CategorySidebar } from './CategorySidebar';
import { ProductCard } from './ProductCard';
import { CartPanel } from './CartPanel';
import { CustomizationSheet } from './CustomizationSheet';
import { CheckoutSheet } from './CheckoutSheet';

interface MenuShellProps {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  tableName: string | null;
  locale?: Locale;
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

  useEffect(() => {
    setHasMounted(true);
    setRestaurantId(restaurant.id);
    setTableName(tableName);
  }, [restaurant.id, tableName, setRestaurantId, setTableName]);

  const cartCount = hasMounted ? rawCartCount : 0;
  const cartTotal = hasMounted ? rawCartTotal : 0;

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'options'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [customization, setCustomization] = useState<CustomizationTarget | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const catScrollRef = useRef<HTMLDivElement>(null);

  const handleCategorySelect = useCallback((catId: string | null) => {
    setActiveCategory(catId);
    setSearchQuery('');
    setShowSearch(false);
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

  const applyFilter = useCallback((list: Product[]) => {
    if (activeFilter === 'popular') return list.filter((p) => p.is_featured);
    if (activeFilter === 'options') return list.filter((p) => (p.variants?.length ?? 0) > 0 || (p.extras?.length ?? 0) > 0);
    return list;
  }, [activeFilter]);

  const itemsByCategory = useMemo(() => {
    const cats = activeCategory
      ? categories.filter((c) => c.id === activeCategory)
      : categories;
    return cats
      .map((cat) => ({
        category: cat,
        items: applyFilter(products.filter((p) => p.category_id === cat.id)),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, products, activeCategory, applyFilter]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, products]);

  const scrollCats = (dir: 'left' | 'right') => {
    catScrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const categoryPill = (id: string | null, label: string, isActive: boolean) => (
    <button
      key={id ?? '__all'}
      onClick={() => handleCategorySelect(id)}
      className={cn(
        'flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 whitespace-nowrap',
        isActive
          ? 'bg-gray-900 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 active:bg-gray-200'
      )}
    >
      {label}
    </button>
  );

  const mobileCategoryPills = (
    <div className="lg:hidden py-3 px-4 flex gap-2.5 overflow-x-auto scrollbar-hide border-b border-gray-100 bg-white sticky z-30" style={{ top: HEADER_HEIGHT }}>
      {categoryPill(null, t.allCategories, activeCategory === null)}
      {categories.map((cat) => categoryPill(cat.id, cat.name, activeCategory === cat.id))}
    </div>
  );

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
      />

      {/* Mobile category pills — scrolls with content on mobile */}
      <div className="lg:hidden flex-shrink-0">
        {mobileCategoryPills}
      </div>

      {/* ── 3-Column Layout — fills remaining viewport ── */}
      <div className="flex-1 flex overflow-hidden max-w-[1280px] w-full mx-auto">

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
        <main className="flex-1 min-w-0 overflow-y-auto px-4 lg:px-6 py-5 pb-28 lg:pb-6">
          {/* Restaurant info + category tabs (desktop) */}
          <div className="hidden lg:block mb-6">
            <h2 className="text-xl font-bold text-gray-900">{restaurant.name}</h2>
            {restaurant.description && (
              <p className="text-sm text-gray-500 mt-1">{restaurant.description}</p>
            )}
            <div className="relative mt-5">
              <button onClick={() => scrollCats('left')} className="absolute left-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-r from-white via-white to-transparent flex items-center justify-start" aria-label="Scroll left">
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <div ref={catScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide px-6 pb-0.5">
                {categoryPill(null, t.allCategories, activeCategory === null)}
                {categories.map((cat) => categoryPill(cat.id, cat.name, activeCategory === cat.id))}
              </div>
              <button onClick={() => scrollCats('right')} className="absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-white via-white to-transparent flex items-center justify-end" aria-label="Scroll right">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-hide">
            {([
              ['all', t.filterAll],
              ['popular', `🔥 ${t.filterPopular}`],
              ['options', t.filterWithOptions],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={cn(
                  'flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap border',
                  activeFilter === key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-500 border-gray-200 active:bg-gray-50'
                )}
              >
                {label}
              </button>
            ))}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <section key={category.id}>
                  <div className="flex items-center gap-3 mb-4 py-2">
                    <h2 className="text-lg font-bold text-gray-900">
                      {category.name}
                    </h2>
                    <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full tabular-nums">
                      {items.length}
                    </span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            estimatedMinutes={25}
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
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-gray-900 text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all duration-150"
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
              <h2 className="text-base font-bold text-gray-900">{t.yourCart}</h2>
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
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none animate-[toastIn_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 text-white shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">{toast}</span>
          </div>
        </div>
      )}

    </div>
  );
}
