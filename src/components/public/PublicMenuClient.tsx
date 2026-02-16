'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { ShoppingBag, X, Minus, Plus, Trash2, Send, Info, Phone, MapPin, Clock, Globe } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice, cn } from '@/lib/utils';
import type { Restaurant, Category, Product, ProductVariant, ProductExtra } from '@/types';

interface PublicMenuClientProps {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  tableName: string | null;
}

function isRestaurantOpen(hours?: Restaurant['operating_hours']): boolean {
  if (!hours || Object.keys(hours).length === 0) return true; // assume open if not configured
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const day = days[now.getDay()];
  const dayHours = hours[day];
  if (!dayHours || dayHours.closed) return false;
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return currentTime >= dayHours.open && currentTime <= dayHours.close;
}

export function PublicMenuClient({ restaurant, categories, products, tableName }: PublicMenuClientProps) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const totalItems = useCartStore((s) => s.totalItems);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const setOpen = useCartStore((s) => s.setOpen);
  const isOpen = useCartStore((s) => s.isOpen);

  const handleCategorySelect = useCallback((catId: string) => {
    setActiveCategory(catId);
    const el = sectionRefs.current[catId];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) setActiveCategory(e.target.id); },
      { rootMargin: '-130px 0px -60% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: products.filter((p) => p.category_id === cat.id),
  }));

  const open = isRestaurantOpen(restaurant.operating_hours);

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Hero */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {restaurant.logo_url ? (
                <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image src={restaurant.logo_url} alt={restaurant.name} fill sizes="56px" className="object-cover" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl font-bold text-brand-600">{restaurant.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold" style={{ fontFamily: "'Sora', sans-serif" }}>{restaurant.name}</h1>
                {restaurant.description && <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{restaurant.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
                    open ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                  )}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', open ? 'bg-emerald-500' : 'bg-red-500')} />
                    {open ? 'Abierto' : 'Cerrado'}
                  </span>
                  {tableName && <span className="text-[11px] text-gray-400">{tableName}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl hover:bg-gray-100">
                <Info className="w-5 h-5 text-gray-500" />
              </button>
              <button onClick={() => setOpen(true)} className="relative p-2 rounded-xl hover:bg-gray-100">
                <ShoppingBag className="w-5 h-5 text-gray-700" />
                {totalItems() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-brand-600 text-white text-[10px] font-bold">
                    {totalItems()}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky header (on scroll) */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 h-11 flex items-center justify-between">
          <h2 className="text-sm font-bold truncate" style={{ fontFamily: "'Sora', sans-serif" }}>{restaurant.name}</h2>
          <button onClick={() => setOpen(true)} className="relative p-1.5 rounded-lg hover:bg-gray-100">
            <ShoppingBag className="w-4 h-4 text-gray-700" />
            {totalItems() > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-brand-600 text-white text-[9px] font-bold">
                {totalItems()}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Categories */}
      <div className="sticky top-14 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={cn(
                'flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all',
                activeCategory === cat.id ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        {products.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="font-medium">Este menú aún no tiene productos</p>
          </div>
        ) : (
          itemsByCategory.map(({ category, items }) =>
            items.length > 0 ? (
              <div key={category.id} id={category.id} ref={(el) => { sectionRefs.current[category.id] = el; }} className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-3 sticky top-[118px] bg-gray-50 py-1 z-10">{category.name}</h2>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedProduct(item)}
                      className="w-full flex gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md text-left group transition-all"
                    >
                      {item.image_url && (
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                          <Image src={item.image_url} alt={item.name} fill sizes="96px" className="object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 py-0.5">
                        <h3 className="font-semibold text-[15px] truncate">{item.name}</h3>
                        {item.description && <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{item.description}</p>}
                        <p className="mt-2 text-base font-bold text-brand-600">{formatPrice(Number(item.price))}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )
        )}
      </div>

      {/* Bottom Bar */}
      {totalItems() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-white via-white to-transparent pt-8 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button
              onClick={() => setOpen(true)}
              className="w-full flex items-center justify-between px-5 py-3.5 rounded-2xl bg-brand-600 text-white shadow-xl shadow-brand-600/30 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5" />
                <span className="font-semibold">Ver carrito · {totalItems()} items</span>
              </div>
              <span className="font-bold">{formatPrice(totalPrice())}</span>
            </button>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      {/* Info Modal */}
      {showInfo && <InfoModal restaurant={restaurant} onClose={() => setShowInfo(false)} />}

      {/* Cart Drawer */}
      {isOpen && <CartDrawer restaurant={restaurant} tableName={tableName} />}
    </div>
  );
}

// ---- Info Modal ----
function InfoModal({ restaurant, onClose }: { restaurant: Restaurant; onClose: () => void }) {
  const days = [
    { key: 'monday', label: 'Lunes' }, { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' }, { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' }, { key: 'saturday', label: 'Sábado' },
    { key: 'sunday', label: 'Domingo' },
  ];

  const hours = restaurant.operating_hours;
  const hasHours = hours && Object.keys(hours).length > 0;
  const hasContact = restaurant.phone || restaurant.address || restaurant.email || restaurant.website;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{restaurant.name}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>

          {restaurant.description && (
            <p className="text-sm text-gray-600 mb-4">{restaurant.description}</p>
          )}

          {hasContact && (
            <div className="space-y-3 mb-5">
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3 text-sm text-gray-700 hover:text-brand-600">
                  <Phone className="w-4 h-4 text-gray-400" /> {restaurant.phone}
                </a>
              )}
              {restaurant.address && (
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" /> {restaurant.address}
                </div>
              )}
              {restaurant.website && (
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-gray-700 hover:text-brand-600">
                  <Globe className="w-4 h-4 text-gray-400" /> {restaurant.website}
                </a>
              )}
            </div>
          )}

          {hasHours && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Horario
              </h3>
              <div className="space-y-1.5">
                {days.map((d) => {
                  const h = hours![d.key];
                  return (
                    <div key={d.key} className="flex justify-between text-sm">
                      <span className="text-gray-500">{d.label}</span>
                      {h?.closed ? (
                        <span className="text-red-500 font-medium">Cerrado</span>
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
            <p className="text-sm text-gray-400 text-center py-4">No hay información adicional disponible</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Product Modal ----
function ProductModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>([]);
  const [notes, setNotes] = useState('');
  const addItem = useCartStore((s) => s.addItem);

  const variants = product.variants ?? [];
  const extras = product.extras ?? [];

  const unitPrice = Number(product.price) + (selectedVariant?.price_delta ?? 0) + selectedExtras.reduce((s, e) => s + Number(e.price), 0);

  const handleAdd = () => {
    addItem(product, selectedVariant, selectedExtras, qty, notes);
    onClose();
  };

  const toggleExtra = (extra: ProductExtra) => {
    setSelectedExtras((prev) =>
      prev.find((e) => e.id === extra.id) ? prev.filter((e) => e.id !== extra.id) : [...prev, extra]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 shadow-sm hover:bg-white">
          <X className="w-4 h-4" />
        </button>

        {product.image_url && (
          <div className="relative w-full aspect-[4/3] bg-gray-100">
            <Image src={product.image_url} alt={product.name} fill sizes="512px" className="object-cover" />
          </div>
        )}

        <div className="p-5 pb-8">
          <h2 className="text-xl font-bold">{product.name}</h2>
          {product.description && <p className="text-sm text-gray-500 mt-1">{product.description}</p>}
          <p className="text-xl font-bold text-brand-600 mt-2">{formatPrice(Number(product.price))}</p>

          {/* Variants */}
          {variants.length > 0 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Variante</label>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      selectedVariant?.id === v.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {v.name} {v.price_delta > 0 && `+${formatPrice(Number(v.price_delta))}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extras */}
          {extras.length > 0 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Extras</label>
              <div className="space-y-2">
                {extras.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => toggleExtra(ex)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all text-left',
                      selectedExtras.find((e) => e.id === ex.id) ? 'border-brand-600 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-sm">{ex.name}</span>
                    <span className="text-sm font-medium text-brand-600">+{formatPrice(Number(ex.price))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mt-4">
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas especiales..." rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
            />
          </div>

          {/* Quantity + Add */}
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-1 py-1">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white"><Minus className="w-4 h-4" /></button>
              <span className="w-6 text-center font-bold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white"><Plus className="w-4 h-4" /></button>
            </div>
            <button onClick={handleAdd} className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-semibold shadow-lg shadow-brand-600/25 hover:-translate-y-0.5 transition-all">
              Agregar · {formatPrice(unitPrice * qty)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Cart Drawer ----
function CartDrawer({ restaurant, tableName }: { restaurant: Restaurant; tableName: string | null }) {
  const items = useCartStore((s) => s.items);
  const setOpen = useCartStore((s) => s.setOpen);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQty = useCartStore((s) => s.updateQty);
  const totalPrice = useCartStore((s) => s.totalPrice);
  const clearCart = useCartStore((s) => s.clearCart);

  const [showCheckout, setShowCheckout] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const handleSendOrder = async () => {
    if (!customerName.trim()) return;
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
          notes: orderNotes,
          items: orderItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setOrderNumber(data.order_number);
      setOrderId(data.order_id);
      clearCart();
    } catch (err) {
      console.error('Error placing order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Order confirmation screen
  if (orderNumber) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={() => { setOpen(false); setOrderNumber(null); }} />
        <div className="relative w-full max-w-sm bg-white h-full flex flex-col items-center justify-center p-8 animate-[slideInRight_0.3s_ease-out]">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <Send className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold mb-1">¡Pedido enviado!</h2>
          <p className="text-gray-500 text-sm mb-4">Tu pedido está en camino a la cocina</p>
          <p className="font-mono font-bold text-lg mb-6">{orderNumber}</p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
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
                  } catch { setPayLoading(false); }
                }}
                disabled={payLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {payLoading ? 'Redirigiendo...' : 'Pagar ahora'}
              </button>
            )}
            <a
              href={`/r/${restaurant.slug}/orden/${orderNumber}`}
              className="w-full py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 text-center"
            >
              Seguir mi pedido
            </a>
            <button
              onClick={() => { setOpen(false); setOrderNumber(null); setOrderId(null); }}
              className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200"
            >
              Volver al menú
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-sm bg-white h-full flex flex-col animate-[slideInRight_0.3s_ease-out] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">{showCheckout ? 'Enviar pedido' : 'Tu carrito'}</h2>
          <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        {!showCheckout ? (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <ShoppingBag className="w-10 h-10 mb-3 opacity-40" />
                  <p className="font-medium">Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                        {item.variant && <p className="text-xs text-gray-400">{item.variant.name}</p>}
                        {item.extras.length > 0 && <p className="text-xs text-gray-400">+{item.extras.map((e) => e.name).join(', ')}</p>}
                        <p className="text-sm text-brand-600 font-semibold mt-0.5">{formatPrice(item.lineTotal)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 px-1 py-0.5">
                          <button onClick={() => updateQty(idx, item.qty - 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"><Minus className="w-3 h-3" /></button>
                          <span className="w-5 text-center text-sm font-bold">{item.qty}</span>
                          <button onClick={() => updateQty(idx, item.qty + 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100"><Plus className="w-3 h-3" /></button>
                        </div>
                        <button onClick={() => removeItem(idx)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total</span>
                  <span className="text-xl font-bold">{formatPrice(totalPrice())}</span>
                </div>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold shadow-lg shadow-brand-600/25 hover:-translate-y-0.5 transition-all"
                >
                  Enviar pedido
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Checkout form */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
                <input
                  type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Instrucciones especiales..." rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.qty}x {item.product.name}</span>
                    <span className="font-medium">{formatPrice(item.lineTotal)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-brand-600">{formatPrice(totalPrice())}</span>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 px-5 py-4 space-y-2">
              <button
                onClick={handleSendOrder}
                disabled={submitting || !customerName.trim()}
                className="w-full py-3 rounded-xl bg-brand-600 text-white font-semibold shadow-lg shadow-brand-600/25 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Confirmar pedido'}
              </button>
              <button
                onClick={() => setShowCheckout(false)}
                className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200"
              >
                Volver al carrito
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
