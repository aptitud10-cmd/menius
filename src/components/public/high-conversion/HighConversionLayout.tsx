'use client';

import React, { useState } from 'react';
import { Product, Restaurant } from '@/types'; // Asumiendo que Product y Restaurant types existen
import { useCartStore } from '@/store/cartStore'; // Nuevo import

import { HighConversionHero } from './HighConversionHero';
import { FeaturedProductSection } from './FeaturedProductSection';
import { PackSelector } from './PackSelector';
import { EventCtaSection } from './EventCtaSection';
import { TrustUrgencySection } from './TrustUrgencySection';

interface HighConversionLayoutProps {
  restaurant: Restaurant;
  mainProduct: Product;
  packOptions: Product[];
}

export function HighConversionLayout({
  restaurant,
  mainProduct,
  packOptions,
}: HighConversionLayoutProps) {
  const [featuredProductQuantity, setFeaturedProductQuantity] = useState(1);
  const [selectedPack, setSelectedPack] = useState<Product | null>(null);

  const { addItem, setRestaurantId, toggleCart } = useCartStore();

  const handleAddToCart = (product: Product, quantity: number) => {
    setRestaurantId(restaurant.id); // Asegura que el carrito esté asociado al restaurante correcto
    addItem(product, null, [], quantity, ''); // Sin variantes, extras ni modificadores para este modo
    toggleCart(); // Abre el carrito para mostrar el producto añadido
    console.log(`Adding ${quantity} of ${product.name} to cart.`);
  };

  const handleHeroCtaClick = () => {
    // El CTA del héroe añade el producto principal con la cantidad por defecto y abre el carrito.
    handleAddToCart(mainProduct, featuredProductQuantity);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <HighConversionHero
        title="La mejor lechona de Bogotá 🔥"
        subtitle="Crujiente por fuera, jugosa por dentro"
        imageUrl={restaurant.cover_image_url || mainProduct.image_url}
        // Opcional: videoUrl={restaurant.hero_video_url}
        onCtaClick={handleHeroCtaClick}
      />

      <main className="relative z-10 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-12">
        <FeaturedProductSection
          product={mainProduct}
          onQuantityChange={setFeaturedProductQuantity}
          onAddToCart={handleAddToCart}
        />

        {packOptions.length > 0 && (
          <PackSelector
            packOptions={packOptions}
            selectedPack={selectedPack}
            onPackSelect={setSelectedPack}
            onAddToCart={handleAddToCart}
          />
        )}

        <EventCtaSection />

        <TrustUrgencySection
          trustText="Fresco diariamente"
          urgencyText="¡Solo quedan pocas porciones para hoy!"
          reviews={[
            { text: 'La mejor lechona que he probado en mi vida.', author: 'Juan P.' },
            { text: 'Simplemente espectacular, el sabor y la textura son perfectos.', author: 'María G.' },
          ]} // Ejemplo de reseñas
        />
      </main>
    </div>
  );
}
