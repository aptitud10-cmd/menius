'use client';

import type { StorefrontStats, Funnel } from '@/lib/storefront-analytics';
import type { TrafficSource } from '@/lib/store-traffic';
import { cn } from '@/lib/utils';

/**
 * Analytics → "Tu tienda online" (maqueta aprobada 2026-11-25,
 * .specify/docs/analitica-dueno): funnel, sources, dishes looked at but
 * rarely ordered, first-time vs returning customers.
 */

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const per100 = (f: Funnel) => (f.visits > 0 ? Math.round((f.orders / f.visits) * 100) : 0);

const SOURCE_LABEL: Record<TrafficSource, { es: string; en: string }> = {
  google: { es: 'Google y buscadores', en: 'Google and search' },
  table_qr: { es: 'QR de la mesa', en: 'Table QR code' },
  social: { es: 'Redes sociales', en: 'Social media' },
  direct: { es: 'Link directo', en: 'Direct link' },
  other: { es: 'Otros sitios', en: 'Other websites' },
};

export function StorefrontInsights({ data, locale, fmt }: { data: StorefrontStats; locale: string; fmt: (v: number) => string }) {
  const en = locale === 'en';
  const L = (es: string, enText: string) => (en ? enText : es);
  const nf = (n: number) => n.toLocaleString(en ? 'en-US' : 'es');
  const f = data.funnel;
  const hasTraffic = data.trafficReady && f.visits > 0;
  const { firstTime, returning } = data.customers;
  const customersTotal = firstTime + returning;

  const steps = [
    { label: L('Abrieron el menú', 'Opened the menu'), value: f.visits, of: null as number | null },
    { label: L('Agregaron un plato', 'Added a dish'), value: f.carts, of: f.visits },
    { label: L('Llegaron a pagar', 'Reached checkout'), value: f.checkouts, of: f.carts },
    { label: L('Pidieron', 'Ordered'), value: f.orders, of: f.checkouts },
  ];
  // Biggest drop between two consecutive steps.
  const drops = [
    { at: L('entre abrir el menú y agregar un plato', 'between opening the menu and adding a dish'), lost: f.visits - f.carts, from: f.visits },
    { at: L('entre agregar un plato y llegar a pagar', 'between adding a dish and reaching checkout'), lost: f.carts - f.checkouts, from: f.carts },
    { at: L('en el pago', 'at checkout'), lost: f.checkouts - f.orders, from: f.checkouts },
  ].filter((d) => d.from > 0).sort((a, b) => b.lost / b.from - a.lost / a.from);
  const worstDrop = drops[0];
  const maxSourceVisits = Math.max(1, ...data.sources.map((s) => s.visits));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-900">{L('Tu tienda online', 'Your online store')}</h2>
        {data.trackedSince && (
          <p className="text-xs text-gray-500">
            {L('Visitas medidas desde el ', 'Visits counted since ')}
            {new Date(`${data.trackedSince}T12:00:00Z`).toLocaleDateString(en ? 'en-US' : 'es', { day: 'numeric', month: 'long', timeZone: 'UTC' })}
          </p>
        )}
      </div>

      {data.trafficReady && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          {!hasTraffic ? (
            <p className="text-sm text-gray-500">
              {L(
                'Todavía no hay visitas medidas en este período. Desde ahora se cuenta cuánta gente abre tu menú, cuánta agrega un plato y cuánta pide.',
                'No visits counted in this period yet. From now on we count how many people open your menu, add a dish and order.',
              )}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h3 className="font-semibold text-sm text-gray-900">
                  {L('De cada 100 personas que abren tu menú, ', 'Out of every 100 people who open your menu, ')}
                  <span className="text-emerald-600">{per100(f)} {L('piden', 'order')}</span>
                </h3>
                {data.previousFunnel && (
                  <p className="text-xs text-gray-500">
                    {L('Período anterior: ', 'Previous period: ')}
                    {per100(data.previousFunnel)} {L('de cada 100', 'out of 100')}
                    {per100(f) !== per100(data.previousFunnel) && (
                      <span className={cn('ml-1 font-semibold', per100(f) > per100(data.previousFunnel) ? 'text-emerald-600' : 'text-red-600')} aria-hidden="true">
                        {per100(f) > per100(data.previousFunnel) ? '▲' : '▼'}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {steps.map((s, i) => {
                  const last = i === steps.length - 1;
                  return (
                    <div key={s.label} className={cn('rounded-xl p-4', last ? 'bg-emerald-50' : 'bg-gray-50')}>
                      <p className={cn('text-xs', last ? 'text-emerald-800' : 'text-gray-500')}>{s.label}</p>
                      <p className={cn('text-2xl font-bold mt-1 tabular-nums', last ? 'text-emerald-700' : 'text-gray-900')}>
                        {nf(s.value)}
                        {s.of != null && <span className={cn('ml-1.5 text-xs font-medium', last ? 'text-emerald-700/80' : 'text-gray-500')}>{pct(s.value, s.of)}%</span>}
                      </p>
                      <div className="h-1.5 rounded-full bg-black/4 mt-3">
                        <div className={cn('h-1.5 rounded-full', last ? 'bg-emerald-600' : 'bg-emerald-500')} style={{ width: `${Math.max(2, pct(s.value, f.visits))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {worstDrop && worstDrop.lost > 0 && (
                <p className="text-xs text-gray-500 mt-3">
                  {L('Donde más gente se va: ', 'Where most people leave: ')}
                  <strong className="text-gray-700">{worstDrop.at}</strong>
                  {` (${pct(worstDrop.lost, worstDrop.from)}%).`}
                </p>
              )}
            </>
          )}
        </section>
      )}

      <div className={cn('grid grid-cols-1 gap-4', hasTraffic && data.sources.length > 0 && 'lg:grid-cols-2')}>
        {hasTraffic && data.sources.length > 0 && (
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-sm text-gray-900 mb-4">{L('De dónde vienen', 'Where they come from')}</h3>
            <div className="space-y-3.5">
              {data.sources.map((s) => (
                <div key={s.source}>
                  <div className="flex justify-between gap-3 text-xs mb-1">
                    <span className="font-medium text-gray-900">{SOURCE_LABEL[s.source][en ? 'en' : 'es']}</span>
                    <span className="text-gray-500 tabular-nums">
                      {nf(s.visits)} {L('visitas', 'visits')} · {pct(s.orders, s.visits)}% {L('piden', 'order')}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.max(2, (s.visits / maxSourceVisits) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-sm text-gray-900 mb-4">{L('Tus clientes', 'Your customers')}</h3>
          {customersTotal === 0 ? (
            <p className="text-sm text-gray-500">{L('Todavía no hay pedidos con cliente identificado en este período.', 'No orders with a known customer in this period yet.')}</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">{L('Primera vez', 'First time')}</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">{nf(firstTime)}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">{L('Volvieron a pedir', 'Came back')}</p>
                  <p className="text-2xl font-bold mt-1 tabular-nums">{nf(returning)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                <strong className="text-gray-700">{pct(returning, customersTotal)}%</strong>
                {L(' de tus clientes de este período ya había pedido antes o pidió más de una vez.', ' of this period’s customers had ordered before or ordered more than once.')}
                {data.customers.avgTicketReturning != null && data.customers.avgTicketFirstTime != null && (
                  <>
                    {L(' Los que vuelven gastan en promedio ', ' Returning customers spend on average ')}
                    <strong className="text-gray-700">{fmt(data.customers.avgTicketReturning)}</strong>
                    {L(' por pedido (los nuevos, ', ' per order (first-timers, ')}
                    {fmt(data.customers.avgTicketFirstTime)}).
                  </>
                )}
              </p>
            </>
          )}
        </section>
      </div>

      {hasTraffic && data.lowConversionDishes.length > 0 && (
        <section className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-sm text-gray-900">{L('Platos que miran mucho y casi nadie pide', 'Dishes people open a lot but rarely order')}</h3>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">{L('Revisa la foto, el precio o la descripción de estos platos.', 'Check the photo, price or description of these dishes.')}</p>
          <div className="divide-y divide-gray-100 text-sm">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              <span>{L('Plato', 'Dish')}</span>
              <span className="text-right">{L('Lo abrieron', 'Opened')}</span>
              <span className="text-right">{L('Lo pidieron', 'Ordered')}</span>
              <span className="text-right w-12">%</span>
            </div>
            {data.lowConversionDishes.map((d) => {
              const rate = pct(d.units, d.views);
              return (
                <div key={d.productId} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 py-2.5 items-center">
                  <span className="font-medium text-gray-900 truncate">{d.name}</span>
                  <span className="text-right tabular-nums">{nf(d.views)}</span>
                  <span className="text-right tabular-nums">{nf(d.units)}</span>
                  <span className={cn('text-right w-12 tabular-nums font-semibold', rate < 5 ? 'text-red-600' : 'text-amber-600')}>{rate}%</span>
                </div>
              );
            })}
          </div>
          {data.avgDishConversion != null && data.avgDishConversion > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              {L('Para comparar: en tu menú, en promedio, se piden ', 'For comparison: across your menu, on average, ')}
              <strong className="text-gray-700">{Math.round(data.avgDishConversion * 100)}</strong>
              {L(' de cada 100 platos que se abren.', ' out of every 100 dishes opened get ordered.')}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
