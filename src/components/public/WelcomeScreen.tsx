'use client';

import { UtensilsCrossed, ShoppingBag, Truck, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import type { Restaurant, OrderType, Product } from '@/types';
import type { Translations } from '@/lib/translations';

interface WelcomeScreenProps {
  restaurant: Restaurant;
  enabledTypes: OrderType[];
  onSelect: (type: OrderType) => void;
  onReorder: () => void;
  products: Product[];
  t: Translations;
}

const ORDER_TYPE_CONFIG: Record<OrderType, {
  icon: typeof UtensilsCrossed;
  descKey: 'dineInDesc' | 'pickupDesc' | 'deliveryDesc';
  labelKey: 'dineIn' | 'pickup' | 'delivery';
}> = {
  dine_in: { icon: UtensilsCrossed, descKey: 'dineInDesc', labelKey: 'dineIn' },
  pickup: { icon: ShoppingBag, descKey: 'pickupDesc', labelKey: 'pickup' },
  delivery: { icon: Truck, descKey: 'deliveryDesc', labelKey: 'delivery' },
};

export function WelcomeScreen({ restaurant, enabledTypes, onSelect, onReorder, products, t }: WelcomeScreenProps) {
  const lastOrder = useCartStore((s) => s.lastOrder);
  const reorder = useCartStore((s) => s.reorder);

  const hasReorder = lastOrder && lastOrder.restaurantId === restaurant.id && lastOrder.items.length > 0;

  const handleReorder = () => {
    const added = reorder(products);
    if (added > 0) onReorder();
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8">

        {/* Logo */}
        {restaurant.logo_url && (
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden mb-6 shadow-sm border border-gray-100">
            <Image
              src={restaurant.logo_url}
              alt={restaurant.name}
              fill
              sizes="80px"
              className="object-cover"
            />
          </div>
        )}

        {/* Name */}
        <h1 className="text-[clamp(1.75rem,6vw,2.75rem)] font-extrabold text-gray-900 text-center leading-[1.1] tracking-tight">
          {t.welcomeTo}
          <br />
          {restaurant.name}
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg text-gray-400 text-center font-medium max-w-xs">
          {t.howToReceive}
        </p>

        {/* Order type buttons */}
        <div className="mt-10 w-full max-w-sm space-y-3">
          {enabledTypes.map((type) => {
            const config = ORDER_TYPE_CONFIG[type];
            if (!config) return null;
            const Icon = config.icon;

            return (
              <button
                key={type}
                onClick={() => onSelect(type)}
                className="w-full flex items-center gap-4 px-5 py-4 sm:py-5 rounded-2xl border-2 border-gray-200 bg-white text-left transition-all duration-150 active:scale-[0.98] hover:border-emerald-400 hover:bg-emerald-50/40 group"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                  <Icon className="w-5 h-5 text-emerald-600" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <span className="block text-[15px] sm:text-base font-bold text-gray-900">
                    {t[config.labelKey]}
                  </span>
                  <span className="block text-xs sm:text-sm text-gray-400 mt-0.5">
                    {t[config.descKey]}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Reorder button */}
          {hasReorder && (
            <button
              onClick={handleReorder}
              className="w-full flex items-center gap-4 px-5 py-4 sm:py-5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 text-left transition-all duration-150 active:scale-[0.98] hover:border-emerald-400 hover:bg-emerald-50 group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
                <RotateCcw className="w-5 h-5 text-emerald-600" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <span className="block text-[15px] sm:text-base font-bold text-emerald-700">
                  {t.welcomeTo.startsWith('Bienvenid') ? 'Repetir último pedido' : 'Reorder last order'}
                </span>
                <span className="block text-xs sm:text-sm text-emerald-500 mt-0.5 truncate">
                  {lastOrder!.items.map((i) => `${i.qty}x ${i.productName}`).join(', ')}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      {restaurant.address && (
        <div className="pb-8 pt-4 text-center px-6">
          <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">
            {restaurant.address}
          </p>
        </div>
      )}
    </div>
  );
}
