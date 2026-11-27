'use client';

import Link from 'next/link';
import { PiggyBank, AlarmClockOff, Timer, CheckCircle2, Star, CalendarDays } from 'lucide-react';
import type { AppSavings, LostSales, ReadyTimes, ReviewsSummary, WeekdaySales } from '@/lib/owner-insights';
import { APP_COMMISSION } from '@/lib/owner-insights';

export interface OwnerInsights {
  appSavings: AppSavings;
  lostNotAccepted: LostSales;
  readyTimes: ReadyTimes | null;
  weekdays?: WeekdaySales | null;
  reviews?: ReviewsSummary | null;
}

const DAY_NAMES = {
  es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const DAY_INITIALS = { es: ['D', 'L', 'M', 'M', 'J', 'V', 'S'], en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'] };
/** Monday first. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "7–8 pm" / "19–20 h" for a local hour 0-23. */
function hourRange(hour: number, en: boolean): string {
  if (!en) return `${hour}–${(hour + 1) % 24} h`;
  const h12 = (h: number) => ((h + 11) % 12) + 1;
  const ampm = (h: number) => (h % 24 < 12 ? 'am' : 'pm');
  const next = (hour + 1) % 24;
  return ampm(hour) === ampm(next) ? `${h12(hour)}–${h12(next)} ${ampm(next)}` : `${h12(hour)} ${ampm(hour)}–${h12(next)} ${ampm(next)}`;
}

export function OwnerHighlights({ data, locale, fmt }: { data: OwnerInsights; locale: string; fmt: (v: number) => string }) {
  const en = locale === 'en';
  const L = (es: string, enText: string) => (en ? enText : es);
  const { appSavings, lostNotAccepted, readyTimes, weekdays, reviews } = data;
  const pctLabel = (r: number) => `${Math.round(r * 100)}%`;
  const lang = en ? 'en' : 'es';
  const rating = (v: number) => v.toLocaleString(en ? 'en-US' : 'es', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return (
    <div className="space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* 1. Commissions not paid to the apps */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 text-emerald-700">
          <PiggyBank className="w-4 h-4" aria-hidden="true" />
          <h3 className="text-xs font-semibold">{L('Comisiones que no pagaste', 'Commissions you didn’t pay')}</h3>
        </div>
        {appSavings.orders > 0 ? (
          <>
            <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{fmt(appSavings.amount)}</p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {L(
                `Lo que se habrían llevado Uber Eats o DoorDash por estos ${appSavings.orders} pedidos (estimado con su plan Plus: ${pctLabel(APP_COMMISSION.delivery)} en delivery y ${pctLabel(APP_COMMISSION.pickup)} en pickup).`,
                `What Uber Eats or DoorDash would have kept on these ${appSavings.orders} orders (estimate with their Plus plan: ${pctLabel(APP_COMMISSION.delivery)} on delivery, ${pctLabel(APP_COMMISSION.pickup)} on pickup).`,
              )}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500 mt-2">{L('Todavía no hay pedidos de delivery o pickup en este período.', 'No delivery or pickup orders in this period yet.')}</p>
        )}
      </section>

      {/* 2. Sales lost because nobody accepted in time */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        {lostNotAccepted.orders > 0 ? (
          <>
            <div className="flex items-center gap-2 text-red-600">
              <AlarmClockOff className="w-4 h-4" aria-hidden="true" />
              <h3 className="text-xs font-semibold">{L('Ventas perdidas', 'Lost sales')}</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{fmt(lostNotAccepted.amount)}</p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {lostNotAccepted.orders === 1
                ? L('1 pedido se canceló porque nadie lo aceptó en 15 minutos.', '1 order was cancelled because nobody accepted it within 15 minutes.')
                : L(`${lostNotAccepted.orders} pedidos se cancelaron porque nadie los aceptó en 15 minutos.`, `${lostNotAccepted.orders} orders were cancelled because nobody accepted them within 15 minutes.`)}
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <h3 className="text-xs font-semibold">{L('Ventas perdidas', 'Lost sales')}</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">{fmt(0)}</p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {L('Ningún pedido se perdió por no aceptarlo a tiempo.', 'No order was lost for not being accepted in time.')}
            </p>
          </>
        )}
      </section>

      {/* 3. Time until "Ready" */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 text-gray-700">
          <Timer className="w-4 h-4" aria-hidden="true" />
          <h3 className="text-xs font-semibold">{L('Tiempo hasta “Listo”', 'Time until “Ready”')}</h3>
        </div>
        {readyTimes ? (
          <>
            <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">
              {readyTimes.medianMinutes} <span className="text-sm font-medium text-gray-500">min</span>
            </p>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              {L('Desde que entra el pedido, en la mitad de los casos.', 'From the moment the order comes in, for half of the orders.')}
              {readyTimes.slowestHour && readyTimes.slowestHour.avgMinutes > readyTimes.medianMinutes && (
                <>
                  {L(' El horario más lento: ', ' Slowest time: ')}
                  <strong className="text-gray-700">{hourRange(readyTimes.slowestHour.hour, en)}</strong>
                  {L(`, ${readyTimes.slowestHour.avgMinutes} min en promedio.`, `, ${readyTimes.slowestHour.avgMinutes} min on average.`)}
                </>
              )}
            </p>
            {readyTimes.byHour.length >= 2 && (
              <div className="flex items-end gap-1 h-10 mt-3" aria-hidden="true">
                {readyTimes.byHour.map((h) => {
                  const max = Math.max(...readyTimes.byHour.map((x) => x.avgMinutes));
                  const slow = readyTimes.slowestHour?.hour === h.hour;
                  return (
                    <div
                      key={h.hour}
                      title={`${hourRange(h.hour, en)} · ${h.avgMinutes} min`}
                      className={slow ? 'flex-1 rounded-xs bg-amber-500' : 'flex-1 rounded-xs bg-gray-300'}
                      style={{ height: `${Math.max(10, (h.avgMinutes / max) * 100)}%` }}
                    />
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 mt-2">{L('Todavía no hay pedidos marcados como “Listo” en este período.', 'No orders marked “Ready” in this period yet.')}</p>
        )}
      </section>
    </div>

    {(reviews || weekdays) && (
      <div className={reviews && weekdays ? 'grid grid-cols-1 md:grid-cols-2 gap-3' : 'grid grid-cols-1 gap-3'}>
        {reviews && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-gray-700">
              <Star className="w-4 h-4 text-amber-500" aria-hidden="true" />
              <h3 className="text-xs font-semibold">{L('Reseñas', 'Reviews')}</h3>
            </div>
            {reviews.avg != null ? (
              <p className="text-2xl font-bold text-gray-900 mt-2 tabular-nums">
                {rating(reviews.avg)} <span className="text-amber-500" aria-hidden="true">★</span>
                <span className="ml-2 text-sm font-medium text-gray-500">
                  {reviews.count === 1 ? L('1 reseña', '1 review') : L(`${reviews.count} reseñas`, `${reviews.count} reviews`)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-2">{L('Sin reseñas nuevas en este período.', 'No new reviews in this period.')}</p>
            )}
            {reviews.prevAvg != null && (
              <p className="text-xs text-gray-500 mt-2">
                {L('Período anterior: ', 'Previous period: ')}{rating(reviews.prevAvg)} ★
                {reviews.avg != null && reviews.avg !== reviews.prevAvg && (
                  <span className={reviews.avg > reviews.prevAvg ? 'ml-1 font-semibold text-emerald-600' : 'ml-1 font-semibold text-red-600'} aria-hidden="true">
                    {reviews.avg > reviews.prevAvg ? '▲' : '▼'}
                  </span>
                )}
              </p>
            )}
            {reviews.lowUnanswered > 0 && (
              <p className="text-xs text-amber-700 mt-2">
                {reviews.lowUnanswered === 1
                  ? L('1 reseña de 3★ o menos sin responder. ', '1 review of 3★ or less without an answer. ')
                  : L(`${reviews.lowUnanswered} reseñas de 3★ o menos sin responder. `, `${reviews.lowUnanswered} reviews of 3★ or less without an answer. `)}
                <Link href="/app/reviews" className="font-semibold underline underline-offset-2">{L('Responder', 'Reply')}</Link>
              </p>
            )}
          </section>
        )}

        {weekdays && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 text-gray-700">
              <CalendarDays className="w-4 h-4" aria-hidden="true" />
              <h3 className="text-xs font-semibold">{L('Mejor y peor día', 'Best and worst day')}</h3>
            </div>
            <p className="text-sm text-gray-700 mt-2 leading-relaxed">
              {L('Tu mejor día es el ', 'Your best day is ')}
              <strong className="text-gray-900">{DAY_NAMES[lang][weekdays.best.dow]}</strong>
              {L(` (${fmt(weekdays.best.avg)} en promedio). El más flojo, el `, ` (${fmt(weekdays.best.avg)} on average). The slowest is `)}
              <strong className="text-gray-900">{DAY_NAMES[lang][weekdays.worst.dow]}</strong>
              {` (${fmt(weekdays.worst.avg)}).`}
            </p>
            <div className="flex items-end gap-1.5 h-16 mt-3" aria-hidden="true">
              {WEEK_ORDER.map((dow) => {
                const d = weekdays.days[dow];
                const max = Math.max(1, ...weekdays.days.map((x) => x.avg));
                const tone = dow === weekdays.best.dow ? 'bg-emerald-500' : dow === weekdays.worst.dow ? 'bg-red-400' : 'bg-gray-300';
                return (
                  <div key={dow} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <div className={`w-full rounded-xs ${tone}`} style={{ height: `${Math.max(4, (d.avg / max) * 100)}%` }} title={`${DAY_NAMES[lang][dow]} · ${fmt(d.avg)}`} />
                    <span className="text-[10px] text-gray-500">{DAY_INITIALS[lang][dow]}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    )}
    </div>
  );
}
