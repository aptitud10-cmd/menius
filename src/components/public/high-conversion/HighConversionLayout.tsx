'use client';

import React, { useState } from 'react';
import { Product, Restaurant } from '@/types';

import { HighConversionHero } from './HighConversionHero';
import { PackSelector } from './PackSelector';
import { EventCtaSection } from './EventCtaSection';
import { TrustUrgencySection } from './TrustUrgencySection';

export interface ProductCategory {
  id: string;
  name: string;
  emoji?: string;
  packs: Product[];
}

interface HighConversionLayoutProps {
  restaurant: Restaurant;
  productCategories?: ProductCategory[];
  whatsappNumber?: string;
  includes?: string;
  deliveryNote?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  // Legacy props for backward compatibility
  mainProduct?: Product;
  packOptions?: Product[];
}

export function HighConversionLayout({
  restaurant,
  productCategories,
  whatsappNumber,
  includes,
  deliveryNote,
  heroTitle,
  heroSubtitle,
  mainProduct,
  packOptions,
}: HighConversionLayoutProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    productCategories?.[0]?.id ?? 'default'
  );
  const [selectedPack, setSelectedPack] = useState<Product | null>(null);

  const categories: ProductCategory[] = productCategories ?? (
    mainProduct
      ? [{ id: 'default', name: restaurant.name, packs: packOptions ?? [] }]
      : []
  );

  const activeCategory = categories.find(c => c.id === selectedCategoryId) ?? categories[0];

  const handleCategoryChange = (id: string) => {
    setSelectedCategoryId(id);
    setSelectedPack(null);
  };

  const whatsappUrl = (() => {
    const number = whatsappNumber ?? restaurant.notification_whatsapp ?? '';
    if (!number) return null;
    const clean = number.replace(/\D/g, '');
    const productName = activeCategory?.name ?? 'producto';
    const packName = selectedPack?.name ?? '';
    const msg = packName
      ? `Hola, quiero pedir ${productName} de ${packName} para un evento. ¿Tienen disponibilidad?`
      : `Hola, quiero información sobre su ${productName} para un evento.`;
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  })();

  const heroImage =
    restaurant.cover_image_url ||
    mainProduct?.image_url ||
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=1400&q=85';

  return (
    <div className="min-h-screen bg-white font-sans">
      <HighConversionHero
        title={heroTitle ?? restaurant.name}
        subtitle={heroSubtitle ?? restaurant.description ?? ''}
        imageUrl={heroImage}
        whatsappUrl={whatsappUrl}
      />

      <main className="max-w-lg mx-auto px-4 pb-24 space-y-6 pt-6">
        <PackSelector
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          selectedPack={selectedPack}
          onCategoryChange={handleCategoryChange}
          onPackSelect={setSelectedPack}
          whatsappUrl={whatsappUrl}
          includes={includes}
        />

        <TrustUrgencySection
          deliveryNote={deliveryNote}
          includes={includes}
        />

        <EventCtaSection
          whatsappUrl={whatsappUrl}
          selectedCategory={activeCategory?.name}
          selectedPack={selectedPack?.name}
          restaurantName={restaurant.name}
        />
      </main>
    </div>
  );
}
