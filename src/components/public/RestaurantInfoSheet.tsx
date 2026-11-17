'use client';

import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, ExternalLink, MapPin, Phone, X } from 'lucide-react';
import { hoursRangeLabel } from '@/lib/option-hours';
import { inTimeZone } from '@/lib/orders/business-hours';
import { prettyPhone, telHref } from '@/lib/phone-format';
import type { getTranslations } from '@/lib/translations';

type DayHours = { open?: string | null; close?: string | null; closed?: boolean | null; fullDay?: boolean | null };

export interface RestaurantInfo {
  name: string;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  google_business_url?: string | null;
  operating_hours?: Record<string, DayHours> | null;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** "Open 24 hours" / "7:00 AM – 10:00 PM" / "Closed" for one day. */
export function dayHoursText(
  dh: DayHours | null | undefined,
  locale: string,
  t: ReturnType<typeof getTranslations>,
): string {
  if (!dh || dh.closed) return t.closedDay;
  if (dh.fullDay || (dh.open === '00:00' && dh.close === '23:59')) return t.open24h;
  if (!dh.open || !dh.close) return t.closedDay;
  return hoursRangeLabel(dh.open, dh.close, locale);
}

export function directionsHref(r: RestaurantInfo): string | null {
  if (r.latitude != null && r.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`;
  }
  return r.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.address}`)}` : null;
}

/**
 * The store's info in one place. Before, it lived only in a footer under
 * 2.5k px of dishes, with today's hours alone and the phone as "+17184295188".
 * Bottom sheet on phones, centered dialog from md up.
 */
export function RestaurantInfoSheet({
  open,
  onClose,
  restaurant,
  locale,
  t,
}: {
  open: boolean;
  onClose: () => void;
  restaurant: RestaurantInfo;
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

  const hours = restaurant.operating_hours ?? null;
  const hasHours = !!hours && Object.keys(hours).length > 0;
  const todayIdx = inTimeZone(new Date(), restaurant.timezone || 'UTC').getDay();
  // Today first, like Google Maps: the line you came for is on top.
  const week = Array.from({ length: 7 }, (_, i) => (todayIdx + i) % 7);
  // Weekday names in the menu's language (2026-11-15 was a Sunday).
  const dayName = (idx: number) =>
    new Date(Date.UTC(2026, 10, 15 + idx)).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-MX', {
      weekday: 'long',
      timeZone: 'UTC',
    });
  const directions = directionsHref(restaurant);
  const texts = week.map((idx) => dayHoursText(hours?.[DAY_KEYS[idx]], locale, t));
  // Same hours all week (Buccaneer: 24 h): one line, not seven equal ones.
  const sameAllWeek = texts.every((x) => x === texts[0]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center">
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
            className="relative w-full md:max-w-md max-h-[88dvh] overflow-y-auto bg-white rounded-t-3xl md:rounded-3xl shadow-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm flex items-start justify-between gap-3 pl-5 pr-2 pt-4 pb-2">
              <h2 id={titleId} className="font-menu text-[30px] leading-tight text-gray-900 pt-1">
                {restaurant.name}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={t.close}
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="px-5 space-y-5">
              {hasHours && (
                <section>
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    {t.schedule}
                  </h3>
                  <ul className="rounded-2xl border border-gray-200 divide-y divide-gray-100">
                    {sameAllWeek ? (
                      <li className="flex items-center justify-between gap-3 px-4 py-3 text-[15px] font-semibold text-gray-900">
                        <span>{t.everyDay}</span>
                        <span className="text-[#047a65]">{texts[0]}</span>
                      </li>
                    ) : week.map((idx, i) => {
                      const today = i === 0;
                      return (
                        <li
                          key={idx}
                          className={`flex items-center justify-between gap-3 px-4 py-2.5 text-[15px] ${today ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                        >
                          <span className="capitalize">{dayName(idx)}</span>
                          <span className={`tabular-nums text-right ${today ? 'text-[#047a65]' : ''}`}>
                            {texts[i]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {restaurant.address && (
                <section>
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold text-gray-600 uppercase tracking-wide mb-2">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    {t.addressLabel}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-gray-900">{restaurant.address}</p>
                </section>
              )}

              <div className="flex flex-col gap-2.5 pt-1">
                {directions && (
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-12 flex items-center justify-center gap-2 rounded-full bg-[#05c8a7] text-[#04241E] text-[15px] font-semibold hover:bg-[#04b096] transition-colors"
                  >
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    {t.getDirections}
                  </a>
                )}
                {restaurant.phone && (
                  <a
                    href={telHref(restaurant.phone)}
                    className="h-12 flex items-center justify-center gap-2 rounded-full border border-gray-300 text-gray-900 text-[15px] font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="w-4 h-4" aria-hidden="true" />
                    {prettyPhone(restaurant.phone)}
                  </a>
                )}
                {restaurant.google_business_url && (
                  <a
                    href={restaurant.google_business_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 inline-flex items-center justify-center gap-1.5 text-[14px] font-semibold text-[#047a65] hover:underline"
                  >
                    {t.seeOnGoogleMaps}
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
