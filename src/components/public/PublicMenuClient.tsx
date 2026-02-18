'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import {
  ShoppingBag, X, Minus, Plus, Trash2, Send, Info, Phone, MapPin,
  Clock, Globe, Star, Search, ChevronRight, Flame, ArrowUp, Download,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice, cn } from '@/lib/utils';
import { getTranslations, type Locale } from '@/lib/translations';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import type { Restaurant, Category, Product, ProductVariant, ProductExtra } from '@/types';

// ============================================================
// Props
// ============================================================

interface PublicMenuClientProps {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  tableName: string | null;
  isDemo?: boolean;
  locale?: Locale;
}

// ============================================================
// Helpers
// ============================================================

function isRestaurantOpen(hours?: Restaurant['operating_hours']): boolean {
  if (!hours || Object.keys(hours).length === 0) return true;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const day = days[now.getDay()];
  const dayHours = hours[day];
  if (!dayHours || dayHours.closed) return false;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return currentTime >= dayHours.open && currentTime <= dayHours.close;
}

function getCurrencyForLocale(currency: string) {
  return currency;
}

// ============================================================
// Main Component
// ============================================================

export function PublicMenuClient({
  restaurant,
  categories,
  products,
  tableName,
  isDemo,
  locale: initialLocale = 'es',
}: PublicMenuClientProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const t = getTranslations(locale);
  const { canInstall, install } = usePWAInstall();
  const [installDismissed, setInstallDismissed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const setOpen = useCartStore((s) => s.setOpen);
  const isOpen = useCartStore((s) => s.isOpen);
  const setRestaurantId = useCartStore((s) => s.setRestaurantId);

  useEffect(() => {
    setRestaurantId(restaurant.id);
  }, [restaurant.id, setRestaurantId]);

  const currency = getCurrencyForLocale(restaurant.currency);
  const fmtPrice = useCallback((price: number) => formatPrice(price, currency), [currency]);

  const handleCategorySelect = useCallback((catId: string) => {
    setActiveCategory((prev) => prev === catId ? null : catId);
    setSearchQuery('');
    setShowSearch(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const itemsByCategory = useMemo(() => {
    const cats = activeCategory
      ? categories.filter((c) => c.id === activeCategory)
      : categories;
    return cats.map((cat) => ({
      category: cat,
      items: products.filter((p) => p.category_id === cat.id),
    }));
  }, [categories, products, activeCategory]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
    );
  }, [searchQuery, products]);

  const open = isRestaurantOpen(restaurant.operating_hours);
  const featuredProducts = useMemo(() => products.filter((p) => p.is_featured), [products]);

  return (
    <div className="min-h-screen-safe bg-gray-50 overflow-x-hidden">
      {/* ── Demo Banner ── */}
      {isDemo && (
        <div className="sticky top-0 z-50 bg-brand-950 text-white">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <p className="text-xs sm:text-sm font-medium truncate">
                <span className="hidden sm:inline">{t.demoInteractive} </span>{t.wantThisForYours}
              </p>
            </div>
            <a
              href="/signup"
              className="flex-shrink-0 px-4 py-1.5 bg-brand-500 text-brand-950 text-xs font-bold rounded-lg hover:bg-brand-400 transition-all"
            >
              {t.createFree}
            </a>
          </div>
        </div>
      )}

      {/* ── Hero / Cover ── */}
      <div className="relative w-full bg-brand-950 overflow-hidden">
        {restaurant.cover_image_url ? (
          <div className="relative w-full h-[200px] sm:h-[260px] lg:h-[320px]">
            <Image
              src={restaurant.cover_image_url}
              alt={restaurant.name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          </div>
        ) : (
          <div className="w-full h-[160px] sm:h-[200px] lg:h-[240px] bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800" />
        )}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-5 sm:pb-6">
            <div className="flex items-end gap-4">
              {restaurant.logo_url ? (
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white shadow-xl flex-shrink-0 ring-4 ring-white/20">
                  <Image src={restaurant.logo_url} alt={restaurant.name} fill sizes="80px" className="object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 ring-4 ring-white/10 shadow-xl">
                  <span className="text-2xl sm:text-3xl font-bold text-white font-heading">
                    {restaurant.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0 pb-0.5">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg font-heading">
                  {restaurant.name}
                </h1>
                {restaurant.description && (
                  <p className="text-sm text-white/70 line-clamp-1 mt-0.5 hidden sm:block">{restaurant.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-md',
                    open ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
                    {open ? t.open : t.closed}
                  </span>
                  {tableName && (
                    <span className="text-xs text-white/50 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">{tableName}</span>
                  )}
                  {restaurant.address && (
                    <span className="hidden lg:inline-flex items-center gap-1 text-xs text-white/50">
                      <MapPin className="w-3 h-3" /> {restaurant.address}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 pb-1">
                <button
                  onClick={() => setShowInfo(true)}
                  className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
                  aria-label="Info"
                >
                  <Info className="w-5 h-5 text-white/80" />
                </button>
                <button
                  onClick={() => setOpen(true)}
                  className="relative p-2.5 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all"
                  aria-label="Cart"
                >
                  <ShoppingBag className="w-5 h-5 text-white/80" />
                  {totalItems() > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-brand-500 text-brand-950 text-[10px] font-bold shadow-lg">
                      {totalItems()}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Navigation Bar ── */}
      <header className={cn(
        'sticky z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm',
        isDemo ? 'top-[41px]' : 'top-0'
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <h2 className="text-sm sm:text-base font-bold truncate mr-4 font-heading">
              {restaurant.name}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLocale(locale === 'es' ? 'en' : 'es')}
                className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
              >
                {locale === 'es' ? 'EN' : 'ES'}
              </button>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
              <button
                onClick={() => setOpen(true)}
                className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                {totalItems() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-brand-600 text-white text-[9px] font-bold">
                    {totalItems()}
                  </span>
                )}
              </button>
            </div>
          </div>
          {/* Search bar */}
          {showSearch && (
            <div className="pb-3 animate-fade-in">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setShowSearch(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-200"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Mobile Category Pills ── */}
      <div className={cn(
        'lg:hidden sticky z-30 bg-white/95 backdrop-blur-md border-b border-gray-100',
        isDemo ? 'top-[calc(41px+3rem)]' : 'top-12 sm:top-14'
      )}>
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide scroll-touch">
          <button
            onClick={() => { setActiveCategory(null); setSearchQuery(''); }}
            className={cn(
              'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
              activeCategory === null
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {t.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={cn(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                activeCategory === cat.id
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Content: Sidebar + Products ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-8">

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0">
            <nav className={cn(
              'sticky overflow-y-auto sidebar-scroll',
              isDemo ? 'top-[calc(41px+4.5rem)]' : 'top-[4.5rem]',
              'max-h-[calc(100vh-6rem)]'
            )}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                {locale === 'es' ? 'Categorías' : 'Categories'}
              </h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => { setActiveCategory(null); setSearchQuery(''); }}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group',
                    activeCategory === null
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('w-1 h-5 rounded-full transition-all', activeCategory === null ? 'bg-brand-500' : 'bg-transparent')} />
                    <span>{t.allCategories}</span>
                  </div>
                  <span className={cn('text-xs rounded-full px-2 py-0.5', activeCategory === null ? 'bg-brand-100 text-brand-600' : 'text-gray-400')}>
                    {products.length}
                  </span>
                </button>
                {categories.map((cat) => {
                  const count = products.filter((p) => p.category_id === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all group',
                        activeCategory === cat.id
                          ? 'bg-brand-50 text-brand-700 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'w-1 h-5 rounded-full transition-all',
                          activeCategory === cat.id ? 'bg-brand-500' : 'bg-transparent'
                        )} />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span className={cn(
                        'text-xs rounded-full px-2 py-0.5',
                        activeCategory === cat.id ? 'bg-brand-100 text-brand-600' : 'text-gray-400'
                      )}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sidebar info card */}
              {restaurant.phone && (
                <div className="mt-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="space-y-2.5">
                    {restaurant.phone && (
                      <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2.5 text-xs text-gray-500 hover:text-brand-600 transition-colors">
                        <Phone className="w-3.5 h-3.5" /> {restaurant.phone}
                      </a>
                    )}
                    {restaurant.address && (
                      <div className="flex items-start gap-2.5 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{restaurant.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </nav>
          </aside>

          {/* Products Area */}
          <main className="flex-1 min-w-0">
            {/* Search Results */}
            {filteredItems !== null ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  {filteredItems.length} {filteredItems.length === 1
                    ? (locale === 'es' ? 'resultado' : 'result')
                    : (locale === 'es' ? 'resultados' : 'results')}
                </p>
                {filteredItems.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t.noResults}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredItems.map((item) => (
                      <ProductCard key={item.id} item={item} onClick={setSelectedProduct} fmtPrice={fmtPrice} t={t} />
                    ))}
                  </div>
                )}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="font-medium">{t.noProductsYet}</p>
              </div>
            ) : (
              <>
                {/* Featured Products (only when showing all) */}
                {!activeCategory && featuredProducts.length > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <h2 className="text-lg font-bold text-gray-800 font-heading">
                        {t.popular}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {featuredProducts.map((item) => (
                        <ProductCard key={`feat-${item.id}`} item={item} onClick={setSelectedProduct} fmtPrice={fmtPrice} t={t} featured />
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories + Products */}
                {itemsByCategory.map(({ category, items }) =>
                  items.length > 0 ? (
                    <div
                      key={category.id}
                      id={category.id}
                      ref={(el) => { sectionRefs.current[category.id] = el; }}
                      className="mb-10"
                    >
                      <h2
                        className={cn(
                          'text-lg font-bold text-gray-800 mb-4 sticky bg-gray-50 py-2 z-10 font-heading',
                          isDemo ? 'top-[calc(41px+6.5rem)] lg:top-[calc(41px+4rem)]' : 'top-[6.5rem] lg:top-[4rem]'
                        )}
                      >
                        {category.name}
                        <span className="text-sm font-normal text-gray-400 ml-2">({items.length})</span>
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {items.map((item, idx) => (
                          <ProductCard
                            key={item.id}
                            item={item}
                            onClick={setSelectedProduct}
                            fmtPrice={fmtPrice}
                            t={t}
                            style={{ animationDelay: `${idx * 50}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </>
            )}

            {/* Reviews */}
            <ReviewsSection restaurantId={restaurant.id} t={t} />
          </main>
        </div>
      </div>

      {/* ── PWA Install Banner ── */}
      {canInstall && !installDismissed && (
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{locale === 'es' ? 'Instalar app' : 'Install app'}</p>
                  <p className="text-xs text-white/80 truncate">
                    {locale === 'es' ? 'Accede rápido al menú sin descargar nada' : 'Quick access to the menu, no download needed'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={install}
                  className="px-4 py-2 rounded-xl bg-white text-violet-700 text-sm font-bold hover:bg-white/90 transition-colors"
                >
                  {locale === 'es' ? 'Instalar' : 'Install'}
                </button>
                <button
                  onClick={() => setInstallDismissed(true)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{t.poweredBy}</span>
              <a href="/" className="font-bold text-brand-600 hover:text-brand-500 transition-colors font-heading">
                MENIUS
              </a>
            </div>
            <a
              href="/signup"
              className="text-sm text-gray-400 hover:text-brand-600 transition-colors"
            >
              {t.createYourMenu} &rarr;
            </a>
          </div>
        </div>
      </footer>

      {/* ── Bottom Cart Bar (Mobile) ── */}
      {totalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-white via-white to-transparent pt-8 pointer-events-none lg:pb-6">
          <div className="max-w-2xl lg:max-w-md lg:ml-auto lg:mr-6 mx-auto pointer-events-auto">
            <button
              onClick={() => setOpen(true)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-brand-600 text-white shadow-xl shadow-brand-600/30 hover:-translate-y-0.5 hover:shadow-2xl transition-all"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <span className="font-semibold">{t.viewCart} · {totalItems()} {t.items}</span>
              </div>
              <span className="font-bold">{fmtPrice(totalPrice())}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Scroll to Top ── */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-20 p-3 rounded-full bg-white shadow-lg border border-gray-200 hover:shadow-xl hover:-translate-y-0.5 transition-all animate-fade-in"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-4 h-4 text-gray-600" />
        </button>
      )}

      {/* ── Product Detail View ── */}
      {selectedProduct && (
        <ProductDetailView
          product={selectedProduct}
          allProducts={products}
          onClose={() => setSelectedProduct(null)}
          onSelectProduct={setSelectedProduct}
          fmtPrice={fmtPrice}
          t={t}
          locale={locale}
        />
      )}
      {showInfo && <InfoModal restaurant={restaurant} onClose={() => setShowInfo(false)} t={t} />}
      {isOpen && <CartDrawer restaurant={restaurant} tableName={tableName} fmtPrice={fmtPrice} t={t} locale={locale} />}
    </div>
  );
}

// ============================================================
// Product Card
// ============================================================

interface ProductCardProps {
  item: Product;
  onClick: (p: Product) => void;
  fmtPrice: (n: number) => string;
  t: ReturnType<typeof getTranslations>;
  featured?: boolean;
  style?: React.CSSProperties;
}

function ProductCard({ item, onClick, fmtPrice, t, featured, style }: ProductCardProps) {
  return (
    <button
      onClick={() => onClick(item)}
      className={cn(
        'w-full text-left rounded-2xl bg-white border border-gray-100 shadow-sm',
        'hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden',
        'animate-fade-in-up',
        featured && 'ring-2 ring-orange-100'
      )}
      style={style}
    >
      {/* Image */}
      {item.image_url ? (
        <div className="relative w-full aspect-[16/10] bg-gray-100 overflow-hidden">
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {item.is_featured && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-bold shadow-lg">
              <Flame className="w-3 h-3" /> {t.popular}
            </span>
          )}
          <div className="absolute bottom-2.5 right-2.5">
            <span className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-sm text-sm font-bold text-brand-700 shadow-md">
              {fmtPrice(Number(item.price))}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative w-full aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <span className="text-4xl opacity-20">🍽️</span>
          {item.is_featured && (
            <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500 text-white text-[11px] font-bold shadow-lg">
              <Flame className="w-3 h-3" /> {t.popular}
            </span>
          )}
          <span className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-white text-sm font-bold text-brand-700 shadow-md">
            {fmtPrice(Number(item.price))}
          </span>
        </div>
      )}
      {/* Info */}
      <div className="p-3.5">
        <h3 className="font-semibold text-[15px] text-gray-900 truncate">{item.name}</h3>
        {item.description && (
          <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
        )}
        {((item.variants?.length ?? 0) > 0 || (item.extras?.length ?? 0) > 0) && (
          <div className="flex items-center gap-1 mt-2 text-xs text-brand-600">
            <span>{t.extras}</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </div>
    </button>
  );
}

// ============================================================
// Product Detail View — Bottom Sheet (Mobile) / Modal (Desktop)
// Keeps restaurant context visible. Inspired by Uber Eats / DoorDash.
// ============================================================

function ProductDetailView({
  product,
  allProducts,
  onClose,
  onSelectProduct,
  fmtPrice,
  t,
  locale,
}: {
  product: Product;
  allProducts: Product[];
  onClose: () => void;
  onSelectProduct: (p: Product) => void;
  fmtPrice: (n: number) => string;
  t: ReturnType<typeof getTranslations>;
  locale: Locale;
}) {
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>([]);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [added, setAdded] = useState(false);
  const [closing, setClosing] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const sheetRef = useRef<HTMLDivElement>(null);

  const variants = product.variants ?? [];
  const extras = product.extras ?? [];
  const hasOptions = variants.length > 0 || extras.length > 0;

  const needsVariant = variants.length > 0 && !selectedVariant;
  const unitPrice = Number(product.price) + (selectedVariant?.price_delta ?? 0) + selectedExtras.reduce((s, e) => s + Number(e.price), 0);

  const animateClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 280);
  }, [onClose]);

  const handleAdd = () => {
    addItem(product, selectedVariant, selectedExtras, qty, notes);
    setAdded(true);
    setTimeout(() => { setAdded(false); animateClose(); }, 600);
  };

  const toggleExtra = (extra: ProductExtra) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id) ? prev.filter((e) => e.id !== extra.id) : [...prev, extra]
    );
  };

  const suggestions = useMemo(() => {
    return allProducts
      .filter((p) => p.id !== product.id && p.category_id === product.category_id)
      .slice(0, 6);
  }, [allProducts, product]);

  const handleSuggestionClick = (p: Product) => {
    onSelectProduct(p);
    sheetRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setQty(1);
    setSelectedVariant(null);
    setSelectedExtras([]);
    setNotes('');
    setShowNotes(false);
    setAdded(false);
    setClosing(false);
  }, [product.id]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center">
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-300',
          closing ? 'opacity-0' : 'opacity-100 bg-black/50 backdrop-blur-[2px]'
        )}
        onClick={animateClose}
      />

      {/* Sheet / Modal */}
      <div
        ref={sheetRef}
        className={cn(
          'relative w-full lg:w-[580px] lg:max-w-[90vw] bg-white',
          'rounded-t-[20px] lg:rounded-[20px]',
          'max-h-[88vh] lg:max-h-[85vh]',
          'flex flex-col overflow-hidden',
          'shadow-[0_-8px_40px_rgba(0,0,0,0.15)] lg:shadow-2xl',
          'transition-transform duration-300 ease-out',
          closing
            ? 'translate-y-full lg:translate-y-0 lg:scale-95 lg:opacity-0'
            : 'translate-y-0 lg:scale-100 lg:opacity-100 animate-[sheetUp_0.35s_cubic-bezier(0.32,0.72,0,1)]'
        )}
      >
        {/* Drag handle (mobile) */}
        <div className="lg:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Close button (desktop) */}
        <button
          onClick={animateClose}
          className="hidden lg:flex absolute top-3 right-3 z-20 w-8 h-8 items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Image */}
          {product.image_url ? (
            <div className="relative w-full aspect-[16/9] bg-gray-100 overflow-hidden">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 580px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
              {product.is_featured && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/90 backdrop-blur-sm text-white text-[11px] font-bold shadow-lg">
                  <Flame className="w-3 h-3" /> {t.popular}
                </span>
              )}
            </div>
          ) : (
            <div className="w-full h-28 bg-gradient-to-br from-brand-50 via-white to-purple-50 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-100/60 flex items-center justify-center">
                <span className="text-2xl">🍽️</span>
              </div>
            </div>
          )}

          {/* Product info */}
          <div className="px-5 pt-4 pb-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 font-heading leading-tight">{product.name}</h2>
                {product.description && (
                  <p className="text-[13px] text-gray-500 mt-1.5 leading-relaxed">{product.description}</p>
                )}
              </div>
              <div className="flex-shrink-0 pt-0.5">
                <span className="text-lg font-bold text-brand-600">{fmtPrice(Number(product.price))}</span>
              </div>
            </div>
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="px-5 pt-3 pb-1">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{t.variant}</h3>
                <span className="text-[11px] text-gray-400 font-medium">
                  {locale === 'es' ? 'Elige una opción' : 'Choose one'}
                </span>
              </div>
              <div className="space-y-1.5">
                {variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(isSelected ? null : v)}
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left',
                        isSelected
                          ? 'bg-brand-50 ring-2 ring-brand-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all',
                          isSelected ? 'border-brand-600 bg-brand-600' : 'border-gray-300'
                        )}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={cn('text-sm', isSelected ? 'font-semibold text-gray-900' : 'text-gray-700')}>{v.name}</span>
                      </div>
                      {v.price_delta !== 0 && (
                        <span className={cn('text-xs font-semibold', v.price_delta > 0 ? 'text-brand-600' : 'text-emerald-600')}>
                          {v.price_delta > 0 ? '+' : ''}{fmtPrice(Number(v.price_delta))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extras */}
          {extras.length > 0 && (
            <div className="px-5 pt-4 pb-1">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{t.extras}</h3>
                <span className="text-[11px] text-gray-400 font-medium">
                  {locale === 'es' ? 'Opcionales' : 'Optional'}
                </span>
              </div>
              <div className="space-y-1.5">
                {extras.map((ex) => {
                  const isSelected = !!selectedExtras.find((e) => e.id === ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => toggleExtra(ex)}
                      className={cn(
                        'w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all text-left',
                        isSelected
                          ? 'bg-brand-50 ring-2 ring-brand-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-[18px] h-[18px] rounded-md flex items-center justify-center transition-all',
                          isSelected ? 'bg-brand-600' : 'border-2 border-gray-300'
                        )}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        <span className={cn('text-sm', isSelected ? 'font-semibold text-gray-900' : 'text-gray-700')}>{ex.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-brand-600">+{fmtPrice(Number(ex.price))}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes toggle */}
          <div className="px-5 pt-3 pb-1">
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="flex items-center gap-2 text-[13px] text-gray-400 hover:text-gray-600 transition-colors py-2"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.specialNotes}
              </button>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.specialNotesPlaceholder}
                rows={2}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
              />
            )}
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="px-5 pt-4 pb-3">
              <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide mb-3">
                {locale === 'es' ? 'También te puede gustar' : 'You might also like'}
              </h3>
              <div className="flex gap-2.5 overflow-x-auto scrollbar-hide scroll-touch pb-1 -mx-5 px-5">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSuggestionClick(s)}
                    className="flex-shrink-0 w-[120px] text-left group"
                  >
                    <div className="relative w-[120px] h-[80px] rounded-xl overflow-hidden bg-gray-100 mb-1.5 ring-1 ring-black/5">
                      {s.image_url ? (
                        <Image src={s.image_url} alt={s.name} fill sizes="120px" className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                          <span className="text-lg opacity-20">🍽️</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-medium text-gray-700 truncate leading-tight">{s.name}</p>
                    <p className="text-[11px] font-bold text-brand-600">{fmtPrice(Number(s.price))}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom spacer for add-to-cart bar */}
          <div className="h-20" />
        </div>

        {/* Fixed bottom: Quantity + Add to Cart */}
        <div className="border-t border-gray-100 bg-white px-5 py-3">
          <div className="flex items-center gap-3">
            {/* Quantity stepper */}
            <div className="flex items-center bg-gray-100 rounded-full">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <Minus className="w-3.5 h-3.5 text-gray-600" />
              </button>
              <span className="w-7 text-center font-bold text-sm tabular-nums">{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-200 active:bg-gray-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>

            {/* Add button */}
            <button
              onClick={handleAdd}
              disabled={added || needsVariant}
              className={cn(
                'flex-1 h-12 rounded-2xl font-semibold text-sm transition-all duration-200',
                added
                  ? 'bg-emerald-500 text-white scale-[0.98]'
                  : needsVariant
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 active:scale-[0.98]'
              )}
            >
              {added
                ? (locale === 'es' ? '✓ Agregado al carrito' : '✓ Added to cart')
                : needsVariant
                  ? (locale === 'es' ? 'Elige una opción' : 'Select an option')
                  : `${t.add} · ${fmtPrice(unitPrice * qty)}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Info Modal
// ============================================================

function InfoModal({
  restaurant,
  onClose,
  t,
}: {
  restaurant: Restaurant;
  onClose: () => void;
  t: ReturnType<typeof getTranslations>;
}) {
  const dayKeys = [
    { key: 'monday', label: t.monday },
    { key: 'tuesday', label: t.tuesday },
    { key: 'wednesday', label: t.wednesday },
    { key: 'thursday', label: t.thursday },
    { key: 'friday', label: t.friday },
    { key: 'saturday', label: t.saturday },
    { key: 'sunday', label: t.sunday },
  ];

  const hours = restaurant.operating_hours;
  const hasHours = hours && Object.keys(hours).length > 0;
  const hasContact = restaurant.phone || restaurant.address || restaurant.email || restaurant.website;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-y-auto animate-scale-in shadow-2xl">
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold font-heading">{restaurant.name}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {restaurant.description && (
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">{restaurant.description}</p>
          )}

          {hasContact && (
            <div className="space-y-3 mb-6">
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-brand-600 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-brand-600" />
                  </div>
                  {restaurant.phone}
                </a>
              )}
              {restaurant.address && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-brand-600" />
                  </div>
                  {restaurant.address}
                </div>
              )}
              {restaurant.website && (
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-700 hover:text-brand-600 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-brand-600" />
                  </div>
                  {restaurant.website}
                </a>
              )}
            </div>
          )}

          {hasHours && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" /> {t.schedule}
              </h3>
              <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                {dayKeys.map((d) => {
                  const h = hours![d.key];
                  return (
                    <div key={d.key} className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-500">{d.label}</span>
                      {h?.closed ? (
                        <span className="text-red-500 font-medium">{t.closedDay}</span>
                      ) : h ? (
                        <span className="text-gray-700 font-medium">{h.open} — {h.close}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!hasContact && !hasHours && !restaurant.description && (
            <p className="text-sm text-gray-400 text-center py-4">{t.noInfoAvailable}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Cart Drawer
// ============================================================

function CartDrawer({
  restaurant,
  tableName,
  fmtPrice,
  t,
  locale,
}: {
  restaurant: Restaurant;
  tableName: string | null;
  fmtPrice: (n: number) => string;
  t: ReturnType<typeof getTranslations>;
  locale: Locale;
}) {
  const items = useCartStore((s) => s.items);
  const setOpen = useCartStore((s) => s.setOpen);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);

  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderType, setOrderType] = useState<string>(
    (restaurant as any).order_types_enabled?.[0] ?? 'dine_in'
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    (restaurant as any).payment_methods_enabled?.[0] ?? 'cash'
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState<{ valid: boolean; discount: number; description?: string } | null>(null);
  const [promoError, setPromoError] = useState('');

  const enabledOrderTypes: string[] = (restaurant as any).order_types_enabled ?? ['dine_in', 'pickup'];
  const enabledPaymentMethods: string[] = (restaurant as any).payment_methods_enabled ?? ['cash'];

  const discount = promoResult?.valid ? promoResult.discount : 0;
  const finalTotal = Math.max(0, totalPrice() - discount);

  const validatePromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    setPromoResult(null);
    try {
      const res = await fetch('/api/orders/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode, restaurant_id: restaurant.id, order_total: totalPrice() }),
      });
      const data = await res.json();
      if (!res.ok) setPromoError(data.error);
      else setPromoResult(data);
    } catch {
      setPromoError('Error');
    }
    setPromoLoading(false);
  };

  const [orderError, setOrderError] = useState('');

  const handleSendOrder = async () => {
    setOrderError('');
    if (!customerName.trim()) {
      setOrderError(locale === 'es' ? 'Ingresa tu nombre' : 'Please enter your name');
      return;
    }
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      setOrderError(locale === 'es' ? 'Email no válido' : 'Invalid email');
      return;
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setOrderError(locale === 'es' ? 'Ingresa la dirección de entrega' : 'Please enter delivery address');
      return;
    }
    setSubmitting(true);
    try {
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        variant_id: item.variant?.id ?? null,
        qty: item.qty,
        unit_price: Number(item.product.price) + (item.variant?.price_delta ?? 0),
        line_total: item.lineTotal,
        notes: item.notes,
        extras: item.extras.map((ex) => ({ extra_id: ex.id, price: Number(ex.price) })),
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          customer_name: customerName,
          customer_email: customerEmail || undefined,
          notes: orderNotes,
          order_type: orderType,
          payment_method: paymentMethod,
          delivery_address: orderType === 'delivery' ? deliveryAddress : undefined,
          items: orderItems,
          promo_code: promoResult?.valid ? promoCode.toUpperCase().trim() : '',
          discount_amount: discount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOrderNumber(data.order_number);
      setOrderId(data.order_id);
      clearCart();
    } catch (err: any) {
      setOrderError(err?.message || (locale === 'es' ? 'Error al enviar el pedido' : 'Failed to place order'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Order Confirmation ──
  if (orderNumber) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/60" onClick={() => { setOpen(false); setOrderNumber(null); }} />
        <div className="relative w-full max-w-sm bg-white h-full flex flex-col items-center justify-center p-8 animate-[slideInRight_0.3s_ease-out] shadow-2xl">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
            <Send className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold mb-1 font-heading">{t.orderSent}</h2>
          <p className="text-gray-500 text-sm mb-5">{t.orderSentDesc}</p>
          <p className="font-mono font-bold text-lg mb-6 px-4 py-2 bg-gray-50 rounded-xl">{orderNumber}</p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            {orderId && (
              <button
                onClick={async () => {
                  setPayLoading(true);
                  try {
                    const res = await fetch('/api/payments/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_id: orderId, slug: restaurant.slug }),
                    });
                    const data = await res.json();
                    if (data.url) window.location.href = data.url;
                    else setPayLoading(false);
                  } catch {
                    setPayLoading(false);
                  }
                }}
                disabled={payLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {payLoading ? t.redirecting : t.payNow}
              </button>
            )}
            <a
              href={`/r/${restaurant.slug}/orden/${orderNumber}`}
              className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 text-center transition-colors"
            >
              {t.trackOrder}
            </a>
            <button
              onClick={() => { setOpen(false); setOrderNumber(null); setOrderId(null); }}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
            >
              {t.backToMenu}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Cart / Checkout ──
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-sm bg-white h-full flex flex-col animate-[slideInRight_0.3s_ease-out] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold font-heading">
            {showCheckout ? t.checkout : t.yourCart}
          </h2>
          <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showCheckout ? (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">{t.cartEmpty}</p>
                  <p className="text-xs mt-1">{t.cartEmptyDesc}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      {item.product.image_url && (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          <Image src={item.product.image_url} alt={item.product.name} fill sizes="48px" className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                        {item.variant && <p className="text-xs text-gray-400">{item.variant.name}</p>}
                        {item.extras.length > 0 && <p className="text-xs text-gray-400">+{item.extras.map((e) => e.name).join(', ')}</p>}
                        <p className="text-sm text-brand-600 font-semibold mt-0.5">{fmtPrice(item.lineTotal)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-1 py-0.5">
                          <button onClick={() => updateQty(idx, item.qty - 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                          <button onClick={() => updateQty(idx, item.qty + 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-500">{t.total}</span>
                  <span className="text-xl font-bold">{fmtPrice(totalPrice())}</span>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold shadow-lg shadow-brand-600/25 hover:-translate-y-0.5 transition-all"
                >
                  {t.sendOrder}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Checkout Form */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Order type selector */}
              {enabledOrderTypes.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.orderType}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {enabledOrderTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setOrderType(type)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-semibold text-center transition-all border ${
                          orderType === type
                            ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-600/20'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {type === 'dine_in' ? t.dineIn : type === 'pickup' ? t.pickup : t.delivery}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery address */}
              {orderType === 'delivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.deliveryAddress}</label>
                  <textarea
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={t.deliveryAddressPlaceholder}
                    rows={2}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.yourName}</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t.yourNamePlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.yourEmail}</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder={t.yourEmailPlaceholder}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.orderNotes}</label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder={t.orderNotesPlaceholder}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                />
              </div>

              {/* Payment method */}
              {enabledPaymentMethods.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.paymentMethod}</label>
                  <div className="space-y-2">
                    {enabledPaymentMethods.map((method) => (
                      <label
                        key={method}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          paymentMethod === method
                            ? 'border-brand-300 bg-brand-50/60'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method}
                          checked={paymentMethod === method}
                          onChange={() => setPaymentMethod(method)}
                          className="w-4 h-4 text-brand-600 focus:ring-brand-500/30"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {method === 'cash' ? t.payCash : t.payOnline}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {/* Promo code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.promoCode}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value); setPromoError(''); setPromoResult(null); }}
                    placeholder={t.promoCodePlaceholder}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 uppercase"
                  />
                  <button
                    type="button"
                    onClick={validatePromo}
                    disabled={promoLoading || !promoCode.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {promoLoading ? '...' : t.apply}
                  </button>
                </div>
                {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
                {promoResult?.valid && (
                  <p className="text-xs text-emerald-600 mt-1">
                    {t.discount}: -{fmtPrice(promoResult.discount)}
                    {promoResult.description && ` — ${promoResult.description}`}
                  </p>
                )}
              </div>

              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-3.5 space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.qty}x {item.product.name}</span>
                    <span className="font-medium">{fmtPrice(item.lineTotal)}</span>
                  </div>
                ))}
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>{t.discount} ({promoCode.toUpperCase()})</span>
                    <span className="font-medium">-{fmtPrice(discount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                  <span>{t.total}</span>
                  <span className="text-brand-600">{fmtPrice(finalTotal)}</span>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 space-y-2">
              {orderError && (
                <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium animate-fade-in">
                  {orderError}
                </div>
              )}
              <button
                onClick={handleSendOrder}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold shadow-lg shadow-brand-600/25 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {submitting ? t.sending : t.confirmOrder}
              </button>
              <button
                onClick={() => { setShowCheckout(false); setOrderError(''); }}
                className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                {t.backToCart}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Reviews Section
// ============================================================

function ReviewsSection({
  restaurantId,
  t,
}: {
  restaurantId: string;
  t: ReturnType<typeof getTranslations>;
}) {
  const [reviews, setReviews] = useState<{ id: string; customer_name: string; rating: number; comment: string; created_at: string }[]>([]);
  const [average, setAverage] = useState(0);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?restaurant_id=${restaurantId}`)
      .then((r) => r.json())
      .then((d) => { setReviews(d.reviews ?? []); setAverage(d.average ?? 0); setTotal(d.total ?? 0); })
      .catch(() => {});
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurant_id: restaurantId, customer_name: name, rating, comment }),
      });
      if (res.ok) {
        setSubmitted(true);
        const r = await res.json();
        setReviews((prev) => [r.review, ...prev]);
        setTotal((prev) => prev + 1);
      }
    } catch {} finally {
      setSubmitting(false);
    }
  };

  if (total === 0 && !showForm) {
    return (
      <div className="py-8">
        <button
          onClick={() => setShowForm(true)}
          className="w-full text-center py-4 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-all"
        >
          <Star className="w-4 h-4 inline-block mr-1.5" /> {t.beFirstReview}
        </button>
      </div>
    );
  }

  return (
    <div className="py-8 border-t border-gray-100 mt-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          <h2 className="text-lg font-bold text-gray-800 font-heading">{average.toFixed(1)}</h2>
          <span className="text-sm text-gray-400">({total} {t.reviews})</span>
        </div>
        {!showForm && !submitted && (
          <button onClick={() => setShowForm(true)} className="text-sm text-brand-600 font-medium hover:underline">
            {t.writeReview}
          </button>
        )}
      </div>

      {showForm && !submitted && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-4 mb-5 space-y-3 shadow-sm">
          <div className="flex gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.yourNameReview}
              required
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)}>
                  <Star className={cn('w-5 h-5 transition-colors', s <= rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300')} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.whatDidYouThink}
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={submitting || !name.trim()} className="px-5 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
              {submitting ? t.sending : t.send}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-500 text-sm rounded-xl hover:bg-gray-200 transition-colors">
              {t.cancel}
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 text-center">
          <p className="text-emerald-700 font-medium text-sm">{t.thankYouReview}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {reviews.slice(0, 6).map((r) => (
          <div key={r.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-brand-50 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand-600">{r.customer_name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="font-semibold text-sm text-gray-800">{r.customer_name}</span>
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={cn('w-3.5 h-3.5', s <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-200')} />
                ))}
              </div>
            </div>
            {r.comment && <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>}
            <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
