'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface HighConversionHeroProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  videoUrl?: string;
  whatsappUrl: string | null;
  onCtaClick?: () => void;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function HighConversionHero({
  title,
  subtitle,
  imageUrl,
  videoUrl,
  whatsappUrl,
  onCtaClick,
}: HighConversionHeroProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > window.innerHeight * 0.55);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCta = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } else if (onCtaClick) {
      onCtaClick();
    }
  };

  return (
    <>
      <section className="relative h-[92svh] min-h-[560px] flex flex-col items-center justify-end text-center overflow-hidden">
        {/* Background */}
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
            alt={title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        )}

        {/* Gradient overlay — dark bottom, lighter top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

        {/* Social proof badge — top center */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full">
            <span className="text-yellow-400">★★★★★</span>
            <span>4.9 · +500 eventos exitosos</span>
          </span>
        </div>

        {/* Content — pinned to bottom */}
        <div className="relative z-10 w-full px-6 pb-10 max-w-lg mx-auto">
          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-3 drop-shadow-lg">
            {title}
          </h1>
          <p className="text-base sm:text-lg text-white/85 mb-7 leading-snug drop-shadow">
            {subtitle}
          </p>

          <button
            onClick={handleCta}
            className="inline-flex items-center justify-center gap-2.5 w-full max-w-xs mx-auto bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 text-white text-base font-bold py-4 px-6 rounded-2xl shadow-xl transition-all duration-200"
          >
            <WhatsAppIcon className="w-5 h-5 shrink-0" />
            Pedir por WhatsApp
          </button>

          <p className="text-white/50 text-xs mt-4">
            Respuesta inmediata · Sin intermediarios
          </p>
        </div>
      </section>

      {/* Sticky CTA — mobile, appears on scroll */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out md:hidden ${
          isScrolled ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-white border-t border-gray-200 shadow-2xl px-4 py-3 safe-area-pb">
          <button
            onClick={handleCta}
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-150 text-sm"
          >
            <WhatsAppIcon className="w-4 h-4 shrink-0" />
            Pedir por WhatsApp
          </button>
        </div>
      </div>
    </>
  );
}
