'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
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
  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const setOpen = useCartStore((s) => s.setOpen);
  const isOpen = useCartStore((s) => s.isOpen);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    setRestaurantId(restaurant.id);
    setTableName(tableName);
  }, [restaurant.id, tableName, setRestaurantId, setTableName]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [customization, setCustomization] = useState<CustomizationTarget | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const handleCategorySelect = useCallback((catId: string | null) => {
    setActiveCategory(catId);
    setSearchQuery('');
    setShowSearch(false);
  }, []);

  const handleProductSelect = useCallback((product: Product) => {
    setCustomization({ product, editIndex: null });
  }, []);

  const handleQuickAdd = useCallback((product: Product) => {
    addItem(product, null, [], 1, '');
  }, [addItem]);

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

  // Filter products by category
  const itemsByCategory = useMemo(() => {
    const cats = activeCategory
      ? categories.filter((c) => c.id === activeCategory)
      : categories;
    return cats
      .map((cat) => ({
        category: cat,
        items: products.filter((p) => p.category_id === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [categories, products, activeCategory]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, products]);

  // Mobile category pills
  const mobileCategoryPills = (
    <div className={`lg:hidden -mx-4 px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide scroll-touch border-b border-gray-100 bg-white sticky z-30`} style={{ top: HEADER_HEIGHT }}>
      <button
        onClick={() => handleCategorySelect(null)}
        className={cn(
          'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
          activeCategory === null
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-500'
        )}
      >
        {t.allCategories}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => handleCategorySelect(cat.id)}
          className={cn(
            'flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap',
            activeCategory === cat.id
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-500'
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
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

      {mobileCategoryPills}

      {/* ── 3-Column Layout ── */}
      <div className="max-w-[1280px] mx-auto px-4 lg:px-6">
        <div className="flex">

          {/* Left: Categories — 260px, sticky */}
          <aside className="hidden lg:block w-[260px] flex-shrink-0 sticky overflow-y-auto border-r border-gray-50" style={{ top: HEADER_HEIGHT, height: `calc(100vh - ${HEADER_HEIGHT}px)` }}>
            <CategorySidebar
              categories={categories}
              products={products}
              activeCategory={activeCategory}
              onSelect={handleCategorySelect}
              allLabel={t.allCategories}
            />
          </aside>

          {/* Center: Products grid */}
          <main className={cn(
            'flex-1 min-w-0 px-4 lg:px-6 py-6',
            'lg:pb-6 pb-28'
          )}>
            {searchResults !== null ? (
              /* Search results */
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
              /* Category sections */
              <div className="space-y-10">
                {itemsByCategory.map(({ category, items }) => (
                  <section key={category.id}>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 sticky bg-white py-2 z-10" style={{ top: HEADER_HEIGHT }}>
                      {category.name}
                      <span className="text-sm font-normal text-gray-400 ml-2">({items.length})</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {items.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onSelect={handleProductSelect}
                          onQuickAdd={handleQuickAdd}
                          fmtPrice={fmtPrice}
                          addLabel={t.addToCart}
                          popularLabel={t.popular}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>

          {/* Right: Cart — 360px, sticky, desktop only */}
          <aside className="hidden lg:block w-[360px] flex-shrink-0 sticky border-l border-gray-50" style={{ top: HEADER_HEIGHT, height: `calc(100vh - ${HEADER_HEIGHT}px)` }}>
            <CartPanel
              fmtPrice={fmtPrice}
              t={t}
              onEdit={handleEditCartItem}
              onCheckout={handleOpenCheckout}
              estimatedMinutes={25}
            />
          </aside>
        </div>
      </div>

      {/* ── Mobile: Bottom cart bar ── */}
      {totalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
          <div className="p-4 pt-8 bg-gradient-to-t from-white via-white/95 to-transparent">
            <div className="max-w-lg mx-auto pointer-events-auto">
              <button
                onClick={() => setOpen(true)}
                className="w-full flex items-center justify-between px-5 py-3.5 rounded-xl bg-gray-900 text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] active:scale-[0.98] transition-all duration-150"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-white text-gray-900 text-[10px] font-bold">
                      {totalItems()}
                    </span>
                  </div>
                  <span className="font-semibold text-sm">{t.viewCart}</span>
                </div>
                <span className="font-bold text-sm tabular-nums">{fmtPrice(totalPrice())}</span>
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
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-base font-bold text-gray-900">{t.yourCart}</h2>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <span className="sr-only">Close</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-6 py-6">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              {t.poweredBy}{' '}
              <a href="/" className="font-bold text-gray-600 hover:text-gray-900 transition-colors">
                MENIUS
              </a>
            </span>
            <a href="/signup" className="hover:text-gray-600 transition-colors">
              {t.createYourMenu} &rarr;
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
