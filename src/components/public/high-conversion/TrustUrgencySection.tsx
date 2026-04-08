'use client';

import React from 'react';

interface TrustUrgencySectionProps {
  trustText?: string;
  urgencyText?: string;
  reviews?: { text: string; author: string }[]; // Formato para reseñas con autor
}

export function TrustUrgencySection({
  trustText = 'Fresco diariamente',
  urgencyText = 'Disponibilidad limitada',
  reviews,
}: TrustUrgencySectionProps) {
  return (
    <section className="bg-gray-800 p-6 rounded-lg shadow-xl text-center text-white">
      <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-6">
        <p className="text-xl font-semibold text-yellow-400">{trustText}</p>
        <p className="text-xl font-semibold text-red-400">{urgencyText}</p>
      </div>
      {reviews && reviews.length > 0 && (
        <div className="mt-4">
          <h4 className="text-2xl font-bold mb-4">Lo que dicen nuestros clientes:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reviews.map((review, index) => (
              <blockquote key={index} className="italic text-gray-300">
                "{review.text}"
                <footer className="mt-2 text-sm text-gray-400">- {review.author}</footer>
              </blockquote>
            ))}
          </div>
          {/* Podríamos añadir un botón para ver todas las reseñas si hay un link o una página dedicada */}
        </div>
      )}
    </section>
  );
};
