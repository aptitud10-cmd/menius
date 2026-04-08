'use client';

import React from 'react';

interface EventCtaSectionProps {
  title?: string;
  buttonText?: string;
  onCtaClick?: () => void;
}

export function EventCtaSection({
  title = '¿Planeando un evento?',
  buttonText = 'Solicitar Presupuesto',
  onCtaClick = () => console.log('Request a quote clicked'),
}: EventCtaSectionProps) {
  return (
    <section className="bg-orange-600 p-6 rounded-lg shadow-xl text-center text-white">
      <h3 className="text-3xl font-bold mb-4">{title}</h3>
      <button
        onClick={onCtaClick}
        className="bg-white text-orange-600 text-xl font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 hover:bg-gray-100"
      >
        {buttonText}
      </button>
    </section>
  );
}
