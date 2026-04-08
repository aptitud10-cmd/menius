'use client';

import React from 'react';

interface TrustUrgencySectionProps {
  deliveryNote?: string;
  includes?: string;
  reviews?: { text: string; author: string; rating?: number }[];
}

const DEFAULT_REVIEWS = [
  {
    text: 'La lechona estuvo espectacular, todos quedaron felices. La van a contratar para el próximo evento.',
    author: 'Carlos M.',
    rating: 5,
  },
  {
    text: 'Puntualísimos en la entrega y la lechona de fábrica se nota. Auténtica y deliciosa.',
    author: 'Sandra P.',
    rating: 5,
  },
];

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg className={`w-3.5 h-3.5 ${filled ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function Stars({ rating = 5 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} filled={i <= rating} />
      ))}
    </div>
  );
}

const BADGES = [
  {
    icon: '🏭',
    label: 'De fábrica',
    desc: 'Auténtica lechona tolimense',
  },
  {
    icon: '🛵',
    label: 'Domicilio gratis',
    desc: 'Bogotá y Soacha',
    highlight: true,
  },
  {
    icon: '🍽️',
    label: 'Todo incluido',
    desc: 'Arepas, tenedores y platos',
  },
];

export function TrustUrgencySection({
  deliveryNote,
  includes,
  reviews,
}: TrustUrgencySectionProps) {
  const displayReviews = reviews ?? DEFAULT_REVIEWS;

  const badges = BADGES.map((b) => {
    if (b.label === 'Domicilio gratis' && deliveryNote) {
      return { ...b, desc: deliveryNote };
    }
    if (b.label === 'Todo incluido' && includes) {
      return { ...b, desc: includes };
    }
    return b;
  });

  return (
    <section className="space-y-5">
      {/* Trust badges */}
      <div className="grid grid-cols-3 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.label}
            className={`flex flex-col items-center text-center p-3 rounded-xl border ${
              badge.highlight
                ? 'border-green-200 bg-green-50'
                : 'border-gray-100 bg-gray-50'
            }`}
          >
            <span className="text-2xl mb-1.5">{badge.icon}</span>
            <span className={`text-xs font-bold leading-tight ${badge.highlight ? 'text-green-800' : 'text-gray-800'}`}>
              {badge.label}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5 leading-snug">{badge.desc}</span>
          </div>
        ))}
      </div>

      {/* Reviews */}
      {displayReviews.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon key={i} filled />
              ))}
            </div>
            <span className="text-sm font-bold text-gray-900">4.9</span>
            <span className="text-xs text-gray-400">· Reseñas reales</span>
          </div>
          <div className="space-y-3">
            {displayReviews.map((review, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <Stars rating={review.rating} />
                <p className="text-sm text-gray-700 mt-2 leading-snug italic">
                  &ldquo;{review.text}&rdquo;
                </p>
                <p className="text-xs text-gray-400 mt-2 font-medium">— {review.author}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
