'use client';

import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star, X } from 'lucide-react';
import type { getTranslations } from '@/lib/translations';

export interface SheetReview {
  id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

/** "Today", "3 days ago", "Nov 2026" — same wording as the menu's review cards. */
export function reviewWhen(iso: string, locale: string, t: ReturnType<typeof getTranslations>): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return t.todayLabel;
  if (days === 1) return t.yesterdayLabel;
  if (days < 7) return t.daysAgoLabel.replace('{n}', String(days));
  if (days < 30) return t.weeksAgoLabel.replace('{n}', String(Math.floor(days / 7)));
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', { month: 'short', year: 'numeric' });
}

function Stars({ value, size }: { value: number; size: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`${size} ${s <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

/**
 * Opened from the rating on the cover. Before, the rating couldn't be tapped
 * and the reviews sat at the very end of the menu (in large-catalog mode, at
 * the end of each category). Bottom sheet on phones, dialog from md up.
 */
export function ReviewsSheet({
  open,
  onClose,
  restaurantName,
  average,
  total,
  reviews,
  locale,
  t,
}: {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  average: number;
  total: number;
  reviews: SheetReview[];
  locale: string;
  t: ReturnType<typeof getTranslations>;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  const en = locale === 'en';
  const avgText = average.toLocaleString(en ? 'en-US' : 'es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-80 flex items-end md:items-center justify-center">
          <motion.div
            className="absolute inset-0 bg-black/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full md:max-w-lg max-h-[88dvh] overflow-y-auto bg-white rounded-t-3xl md:rounded-3xl shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs border-b border-gray-100 flex items-start justify-between gap-3 pl-5 pr-2 pt-4 pb-3">
              <div className="min-w-0">
                <h2 id={titleId} className="font-menu text-[30px] leading-tight text-gray-900">
                  {t.customersTestimonial}
                </h2>
                <p className="mt-1 flex items-center gap-2 text-[15px] text-gray-700">
                  <span className="text-[22px] font-bold text-gray-900 tabular-nums">{avgText}</span>
                  <Stars value={average} size="w-4 h-4" />
                  <span className="text-gray-600">
                    · {total} {t.reviews}
                  </span>
                  <span className="sr-only">{restaurantName}</span>
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <ul className="px-5 divide-y divide-gray-100">
              {reviews.map((r) => (
                <li key={r.id} className="py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-full bg-[#d0f7f1] flex items-center justify-center text-[14px] font-bold text-[#047a65] shrink-0" aria-hidden="true">
                      {r.customer_name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-gray-900 truncate">{r.customer_name}</p>
                      <p className="flex items-center gap-1.5 text-[13px] text-gray-600">
                        <Stars value={r.rating} size="w-3.5 h-3.5" />
                        <span className="sr-only">{en ? `${r.rating} of 5` : `${r.rating} de 5`}</span>
                        {reviewWhen(r.created_at, locale, t)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-gray-800 whitespace-pre-line">{r.comment}</p>
                </li>
              ))}
            </ul>
            <p className="px-5 pt-2 text-[13px] text-gray-600">{t.reviewsLatestNote}</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
