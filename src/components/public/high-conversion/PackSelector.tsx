'use client';

import React from 'react';
import { Product } from '@/types'; // Asumiendo que Product type existe

interface PackSelectorProps {
  packOptions: Product[];
  selectedPack: Product | null;
  onPackSelect: (pack: Product) => void;
  onAddToCart: (pack: Product, quantity: number) => void; // La cantidad siempre será 1 para un paquete completo
}

export function PackSelector({
  packOptions,
  selectedPack,
  onPackSelect,
  onAddToCart,
}: PackSelectorProps) {
  return (
    <section className="bg-gray-800 p-6 rounded-lg shadow-xl text-white">
      <h3 className="text-3xl font-bold mb-6 text-center">Elige tu Paquete</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {packOptions.map((pack) => (
          <button
            key={pack.id}
            onClick={() => onPackSelect(pack)}
            role="radio"
            aria-checked={selectedPack?.id === pack.id}
            className={`border-4 rounded-lg p-6 flex flex-col items-center justify-center transition-all duration-200 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800
              ${selectedPack?.id === pack.id ? 'border-green-500 bg-green-900/20 scale-105' : 'border-gray-600 hover:border-blue-500'}`}
          >
            <h4 className="text-3xl font-extrabold mb-2 text-center">{pack.name}</h4>
            <p className="text-2xl font-semibold text-green-400">${pack.price.toFixed(2)}</p>
            {pack.description && (
              <p className="text-gray-400 text-sm mt-2 text-center">{pack.description}</p>
            )}
          </button>
        ))}
      </div>
      {selectedPack && (
        <div className="text-center mt-8">
          <button
            onClick={() => onAddToCart(selectedPack, 1)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-bold py-3 px-10 rounded-full shadow-lg transition duration-300 transform hover:scale-105"
          >
            Añadir {selectedPack.name} al Carrito
          </button>
        </div>
      )}
    </section>
  );
}
