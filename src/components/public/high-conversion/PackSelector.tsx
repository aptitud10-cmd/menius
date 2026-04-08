'use client';

import React from 'react';
import { Product } from '@/types';
import { ProductCategory } from './HighConversionLayout';

interface PackSelectorProps {
  categories: ProductCategory[];
  selectedCategoryId: string;
  selectedPack: Product | null;
  onCategoryChange: (id: string) => void;
  onPackSelect: (pack: Product) => void;
  whatsappUrl: string | null;
  includes?: string;
}

function formatCOP(price: number): string {
  return '$' + price.toLocaleString('es-CO');
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function PackSelector({
  categories,
  selectedCategoryId,
  selectedPack,
  onCategoryChange,
  onPackSelect,
  whatsappUrl,
  includes,
}: PackSelectorProps) {
  const activeCategory = categories.find(c => c.id === selectedCategoryId) ?? categories[0];

  if (!activeCategory) return null;

  return (
    <section>
      {/* Section header */}
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">¿Cuántas personas son?</h2>
        <p className="text-sm text-gray-500 mt-0.5">Elige el tamaño perfecto para tu evento</p>
      </div>

      {/* Category tabs */}
      {categories.length > 1 && (
        <div className="flex gap-2 mb-5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                selectedCategoryId === cat.id
                  ? 'border-amber-500 bg-amber-50 text-amber-800'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              {cat.emoji && <span className="text-base">{cat.emoji}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Pack cards grid */}
      <div className="grid grid-cols-2 gap-3">
        {activeCategory.packs.map((pack) => {
          const isSelected = selectedPack?.id === pack.id;
          return (
            <button
              key={pack.id}
              onClick={() => onPackSelect(pack)}
              className={`relative flex flex-col items-start p-4 rounded-2xl border-2 text-left transition-all duration-200 active:scale-[0.97] ${
                isSelected
                  ? 'border-green-500 bg-green-50 shadow-md shadow-green-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              } ${pack.is_featured ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
            >
              {/* Popular badge */}
              {pack.is_featured && (
                <span className="absolute -top-2.5 left-3 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Popular
                </span>
              )}

              {/* Checkmark */}
              <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                isSelected ? 'bg-green-500' : 'bg-gray-100 border border-gray-300'
              }`}>
                {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
              </div>

              <span className={`text-base font-bold mt-1 ${isSelected ? 'text-green-800' : 'text-gray-900'}`}>
                {pack.name}
              </span>
              <span className={`text-lg font-black mt-1 ${isSelected ? 'text-green-700' : 'text-gray-800'}`}>
                {formatCOP(pack.price)}
              </span>
              {pack.description && (
                <span className="text-xs text-gray-400 mt-1 leading-snug">{pack.description}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Includes note */}
      {includes && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-4 bg-gray-50 rounded-xl px-3 py-2.5">
          <span className="text-base">🍽️</span>
          <span>{includes}</span>
        </p>
      )}

      {/* WhatsApp CTA — slide up when pack selected */}
      <div
        className={`transition-all duration-300 ease-out overflow-hidden ${
          selectedPack ? 'max-h-32 opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        {selectedPack && whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-lg transition-all duration-150 text-sm"
          >
            <WhatsAppIcon className="w-5 h-5 shrink-0" />
            Pedir {activeCategory.name} de {selectedPack.name} por WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}
