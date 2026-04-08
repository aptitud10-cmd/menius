'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image'; // Nuevo import

interface HighConversionHeroProps {
  title: string;
  subtitle: string;
  imageUrl: string; // URL de la imagen de fondo
  videoUrl?: string; // URL opcional del video de fondo
  onCtaClick: () => void;
}

export function HighConversionHero({
  title,
  subtitle,
  imageUrl,
  videoUrl,
  onCtaClick,
}: HighConversionHeroProps) {
  const [isStickyCtaVisible, setIsStickyCtaVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > window.innerHeight * 0.5) {
        setIsStickyCtaVisible(true);
      } else {
        setIsStickyCtaVisible(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative h-screen flex items-center justify-center text-center overflow-hidden bg-gray-900">
      {videoUrl ? (
        <video
          className="absolute inset-0 object-cover w-full h-full"
          src={videoUrl}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : (
        <Image
          src={imageUrl}
          alt="Hero Background"
          layout="fill"
          objectFit="cover"
          priority // Carga prioritaria para la imagen principal
          className="absolute inset-0"
        />
      )}

      <div className="absolute inset-0 bg-black opacity-50"></div> {/* Superposición */} 
      <div className="relative z-10 text-white p-4 max-w-2xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-2 leading-tight drop-shadow-lg">
          {title}
        </h1>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-8 drop-shadow-md">
          {subtitle}
        </h2>
        <button
          onClick={onCtaClick}
          className="bg-red-600 hover:bg-red-700 text-white text-lg sm:text-xl font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105"
        >
          Pedir Ahora
        </button>
      </div>

      {/* CTA fijo para móvil, visible al hacer scroll */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-red-600 text-white p-4 text-center z-50 transition-transform duration-300 ease-in-out
          ${isStickyCtaVisible ? 'translate-y-0' : 'translate-y-full'} md:hidden`}
      >
        <button
          onClick={onCtaClick}
          className="w-full text-lg font-bold py-2 px-4 rounded-full"
        >
          Pedir Ahora
        </button>
      </div>
    </section>
  );
}
