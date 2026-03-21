'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  orderId: string;
  customerName: string;
  locale: string;
}

const STAR_LABELS: Record<number, { en: string; es: string }> = {
  1: { en: 'Terrible', es: 'Muy malo' },
  2: { en: 'Bad', es: 'Malo' },
  3: { en: 'OK', es: 'Regular' },
  4: { en: 'Good', es: 'Bueno' },
  5: { en: 'Excellent!', es: '¡Excelente!' },
};

export default function ReviewPageClient({ restaurantId, restaurantName, restaurantSlug, orderId, customerName, locale }: Props) {
  const en = locale === 'en';
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [name, setName] = useState(customerName);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const displayRating = hovered || rating;
  const starLabel = displayRating ? (en ? STAR_LABELS[displayRating].en : STAR_LABELS[displayRating].es) : '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError(en ? 'Please select a rating.' : 'Por favor selecciona una calificación.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          order_id: orderId,
          customer_name: name.trim() || (en ? 'Anonymous' : 'Anónimo'),
          rating,
          comment: comment.trim(),
          _hp: '',
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : (en ? 'Something went wrong. Please try again.' : 'Algo salió mal. Intenta de nuevo.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
            {en ? 'Thank you!' : '¡Gracias!'}
          </h1>
          <p className="text-sm text-gray-500 mb-1">
            {en ? 'Your review helps us improve.' : 'Tu reseña nos ayuda a mejorar.'}
          </p>
          <p className="text-sm text-gray-400 mb-8">
            {en ? `We appreciate your feedback for ${restaurantName}.` : `Apreciamos tu opinión sobre ${restaurantName}.`}
          </p>
          <div className="flex justify-center gap-1 mb-8">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg
                key={s}
                className={`w-8 h-8 ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}
                fill="currentColor" viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <Link
            href={`/${restaurantSlug}`}
            className="block w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors"
          >
            {en ? 'Back to menu' : 'Volver al menú'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3">
        <Link href={`/${restaurantSlug}`} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Back">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <span className="text-sm font-semibold text-gray-700 truncate">{restaurantName}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-10 pb-8 max-w-md mx-auto w-full">
        {/* Heading */}
        <div className="text-center mb-8 w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
            {en ? 'How was your experience?' : '¿Cómo fue tu experiencia?'}
          </h1>
          <p className="text-sm text-gray-500">
            {en ? 'Your feedback helps us improve.' : 'Tu opinión nos ayuda a mejorar.'}
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="w-full space-y-5">
          {/* Stars */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
            <div
              className="flex justify-center gap-2 mb-2"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setRating(s); setError(''); }}
                  onMouseEnter={() => setHovered(s)}
                  className="transition-transform active:scale-90 focus:outline-none"
                  aria-label={`${s} star${s > 1 ? 's' : ''}`}
                >
                  <svg
                    className={`w-11 h-11 transition-colors duration-100 ${
                      s <= displayRating ? 'text-amber-400' : 'text-gray-200'
                    }`}
                    fill="currentColor" viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </button>
              ))}
            </div>
            <p className={`text-sm font-semibold h-5 transition-colors ${displayRating >= 4 ? 'text-emerald-600' : displayRating > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
              {starLabel || (en ? 'Tap a star to rate' : 'Toca una estrella para calificar')}
            </p>
          </div>

          {/* Name */}
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {en ? 'Your name' : 'Tu nombre'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder={en ? 'Anonymous' : 'Anónimo'}
              className="w-full text-sm text-gray-900 placeholder-gray-300 bg-transparent focus:outline-none"
            />
          </div>

          {/* Comment */}
          <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              {en ? 'Comments (optional)' : 'Comentarios (opcional)'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={en ? 'Tell us about your experience…' : 'Cuéntanos tu experiencia…'}
              className="w-full text-sm text-gray-900 placeholder-gray-300 bg-transparent focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 active:scale-[.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting
              ? (en ? 'Submitting…' : 'Enviando…')
              : (en ? 'Submit review' : 'Enviar reseña')}
          </button>
        </form>
      </div>
    </div>
  );
}
