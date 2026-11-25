'use client';

import { PiggyBank, AlarmClockOff, Timer, CheckCircle2 } from 'lucide-react';
import type { AppSavings, LostSales, ReadyTimes } from '@/lib/owner-insights';
import { APP_COMMISSION } from '@/lib/owner-insights';

export interface OwnerInsights {
  appSavings: AppSavings;
  lostNotAccepted: LostSales;
  readyTimes: ReadyTimes | null;
}

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
  const { appSavings, lostNotAccepted, readyTimes } = data;
  const pctLabel = (r: number) => `${Math.round(r * 100)}%`;

  return (
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
                      className={slow ? 'flex-1 rounded-sm bg-amber-500' : 'flex-1 rounded-sm bg-gray-300'}
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
  );
}
