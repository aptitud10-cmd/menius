'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getTranslations } from '@/lib/translations';

interface Props {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  orderId: string;
  customerName: string;
  locale: string;
  /** Estrella que el cliente tocó en el email (1–5); 0 = ninguna. */
  initialRating?: number;
  /** restaurants.google_business_url: offered after sending, to EVERYONE. */
  googleReviewUrl?: string | null;
}

const STAR_LABEL_KEYS = ['starLabel1', 'starLabel2', 'starLabel3', 'starLabel4', 'starLabel5'] as const;

const STAR_PATH =
  'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

export default function ReviewPageClient({ restaurantId, restaurantName, restaurantSlug, orderId, customerName, locale, initialRating = 0, googleReviewUrl }: Props) {
  const t = getTranslations(locale);
  const en = locale === 'en';
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);
  const [name, setName] = useState(customerName);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const displayRating = hovered || rating;
  const starLabel = displayRating ? t[STAR_LABEL_KEYS[displayRating - 1]] : '';
  const starAria = (s: number) => (en ? `${s} ${s === 1 ? 'star' : 'stars'}` : `${s} ${s === 1 ? 'estrella' : 'estrellas'}`);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError(t.reviewSelectRating);
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
          customer_name: name.trim() || t.reviewAnonymous,
          rating,
          comment: comment.trim(),
          _hp: '',
        }),
      });
      if (res.status === 409) {
        setSubmitted(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Error');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.reviewError);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div lang={en ? 'en' : 'es'} className="min-h-[100dvh] bg-[#f5f5f3] flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-sm w-full">
          <div className="flex justify-center gap-1 mb-5" aria-label={starAria(rating)} role="img">
            {[1, 2, 3, 4, 5].map((s) => (
              <svg key={s} className={`w-8 h-8 ${s <= rating ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d={STAR_PATH} />
              </svg>
            ))}
          </div>
          <h1 className="font-menu text-[34px] leading-tight text-gray-900 mb-2">{t.reviewThankYou}</h1>
          <p className="text-[15px] text-gray-600 mb-8">
            {t.reviewThankYouAppreciate} {restaurantName}.
          </p>
          <div className="space-y-3">
            {/* Google policy: no review gating. Every customer who sends a
                review sees this, whatever the rating — never only the happy
                ones. */}
            {googleReviewUrl && (
              <>
                <a
                  href={googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-full bg-[#05c8a7] text-[#04241E] font-semibold text-[15px] hover:bg-[#04b096] transition-colors"
                >
                  {t.reviewGoogleCta}
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
                <p className="text-[13px] text-gray-600 -mt-1 pb-1">{t.reviewGoogleHint.replace('{name}', restaurantName)}</p>
              </>
            )}
            <Link
              href={`/${restaurantSlug}`}
              className={
                googleReviewUrl
                  ? 'flex items-center justify-center w-full h-12 rounded-full border border-gray-300 text-gray-900 font-semibold text-[15px] hover:bg-white transition-colors'
                  : 'flex items-center justify-center w-full h-12 rounded-full bg-[#05c8a7] text-[#04241E] font-semibold text-[15px] hover:bg-[#04b096] transition-colors'
              }
            >
              {t.backToMenu}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div lang={en ? 'en' : 'es'} className="min-h-[100dvh] bg-[#f5f5f3] flex flex-col">
      <header className="bg-white border-b border-gray-200 pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto h-14 px-2 flex items-center gap-1">
          <Link
            href={`/${restaurantSlug}`}
            aria-label={t.backToMenu}
            className="w-11 h-11 flex items-center justify-center rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <span className="text-[15px] font-semibold text-gray-900 truncate">{restaurantName}</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] max-w-md mx-auto w-full">
        <div className="text-center mb-6 w-full">
          <h1 className="font-menu text-[34px] leading-tight text-gray-900 mb-1">{t.whatDidYouThink}</h1>
          <p className="text-[15px] text-gray-600">{t.reviewHelp}</p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="w-full space-y-4">
          <fieldset className="bg-white rounded-2xl p-5 border border-gray-200 text-center">
            <legend className="sr-only">{en ? 'Rating' : 'Calificación'}</legend>
            <div className="flex justify-center gap-1.5 mb-2" onMouseLeave={() => setHovered(0)}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setRating(s); setError(''); }}
                  onMouseEnter={() => setHovered(s)}
                  aria-label={starAria(s)}
                  aria-pressed={rating === s}
                  className="rounded-xl transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
                >
                  <svg
                    className={`w-12 h-12 transition-colors duration-100 ${s <= displayRating ? 'text-amber-400' : 'text-gray-300'}`}
                    fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"
                  >
                    <path d={STAR_PATH} />
                  </svg>
                </button>
              ))}
            </div>
            <p className={`text-[15px] font-semibold h-6 ${displayRating >= 4 ? 'text-[#047a65]' : displayRating > 0 ? 'text-amber-800' : 'text-gray-600'}`} aria-live="polite">
              {starLabel || t.reviewTapStar}
            </p>
          </fieldset>

          <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-[#05c8a7] focus-within:ring-2 focus-within:ring-[#05c8a7]/20">
            <label htmlFor="review-name" className="block text-[13px] font-semibold text-gray-600 mb-1">
              {t.reviewYourName}
            </label>
            <input
              id="review-name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder={t.reviewAnonymousPlaceholder}
              className="w-full text-base text-gray-900 placeholder:text-[#6B6B74] bg-transparent focus:outline-none"
            />
          </div>

          <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 focus-within:border-[#05c8a7] focus-within:ring-2 focus-within:ring-[#05c8a7]/20">
            <label htmlFor="review-comment" className="block text-[13px] font-semibold text-gray-600 mb-1">
              {t.reviewComments}
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder={t.reviewTellUs}
              className="w-full text-base text-gray-900 placeholder:text-[#6B6B74] bg-transparent focus:outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-[#b42318] text-center" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || rating === 0}
            className="w-full h-[52px] rounded-full bg-[#05c8a7] text-[#04241E] font-semibold text-base hover:bg-[#04b096] active:scale-[.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? t.reviewSubmitting : t.reviewSubmit}
          </button>
        </form>
      </div>
    </div>
  );
}
