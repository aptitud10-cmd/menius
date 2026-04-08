'use client';

import React, { useState } from 'react';
import Image from 'next/image'; // Nuevo import
import { Product } from '@/types'; // Asumiendo que Product type existe

interface FeaturedProductSectionProps {
  product: Product;
  onQuantityChange: (qty: number) => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

export function FeaturedProductSection({
  product,
  onQuantityChange,
  onAddToCart,
}: FeaturedProductSectionProps) {
  const [quantity, setQuantity] = useState(1);

  const increment = () => {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    onQuantityChange(newQuantity);
  };

  const decrement = () => {
    if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      onQuantityChange(newQuantity);
    }
  };

  return (
    <section className="bg-gray-800 p-6 rounded-lg shadow-xl text-center text-white relative">
      <Image
        src={product.image_url}
        alt={product.name}
        width={500} // Ajusta el tamaño según sea necesario para la relación de aspecto
        height={300} // Ajusta el tamaño según sea necesario
        layout="responsive"
        objectFit="cover"
        className="w-full max-w-lg mx-auto rounded-lg mb-6 aspect-video sm:aspect-square"
      />
      <h3 className="text-3xl font-bold mb-2">{product.name}</h3>
      <p className="text-gray-300 mb-4 text-lg">{product.description}</p>
      <p className="text-4xl font-extrabold text-green-400 mb-6">${product.price.toFixed(2)}</p>

      <div className="flex items-center justify-center mb-6 space-x-4">
        <button
          onClick={decrement}
          aria-label="Disminuir cantidad"
          className="bg-red-600 text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
        >
          -
        </button>
        <span className="text-3xl font-bold" aria-live="polite" aria-atomic="true">{quantity}</span>
        <button
          onClick={increment}
          aria-label="Aumentar cantidad"
          className="bg-green-600 text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors"
        >
          +
        </button>
      </div>

      <button
        onClick={() => onAddToCart(product, quantity)}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-3 px-10 rounded-full shadow-lg transition duration-300 transform hover:scale-105"
      >
        Añadir al Carrito
      </button>
    </section>
  );
}
