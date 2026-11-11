'use client';

/**
 * Ruta del repartidor: varios pedidos en un mismo viaje (tope 4).
 *
 * - Un pedido suelto se ve igual que siempre (DriverTrackClient), con un botón
 *   para agregar otro pedido escaneando su QR dentro de la página.
 * - Con 2+ pedidos: lista para ordenar → "Ya tengo los N pedidos" (un solo GPS)
 *   → parada por parada con la pantalla de siempre → resumen de caja.
 * - Cada pedido se sigue abriendo solo con SU token. La lista de tokens vive en
 *   este teléfono (localStorage); el servidor solo guarda batch_id/batch_seq.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Loader2, Plus, X, AlertTriangle } from 'lucide-react';
import { C, money } from '@/components/orders/counter/ui';
import { MAX_ROUTE_ORDERS } from '@/lib/orders/driver-route';
import { DriverTrackClient, queueStatusAction, type RouteCtx } from './DriverTrackClient';
import { QrScanner } from './QrScanner';

const STORE_KEY = 'menius-driver-route-v1';
const STORE_TTL_MS = 8 * 60 * 60 * 1000;

type Stop = {
  token: string;
  orderNumber: string | null;
  customerName: string | null;
  address: string | null;
  total: number;
  currency: string;
  collectCash: boolean;
  status: string;
  pickedUp: boolean;
  delivered: boolean;
  cancelled: boolean;
  restaurantName: string | null;
};

const shortNum = (n: string | null) => (n ? `#${n.split('-').pop()}` : '#—');
const isDone = (s: Stop | undefined) => !!s && (s.delivered || s.cancelled);

function readStore(): string[] | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { tokens?: unknown; at?: unknown };
    if (!Array.isArray(v.tokens) || typeof v.at !== 'number' || Date.now() - v.at > STORE_TTL_MS) return null;
    return v.tokens.filter((t): t is string => typeof t === 'string').slice(0, MAX_ROUTE_ORDERS);
  } catch { return null; }
}
function writeStore(tokens: string[]) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ tokens, at: Date.now() })); } catch { /* modo privado */ }
}

async function fetchStop(token: string): Promise<Stop | null> {
  try {
    const res = await fetch(`/api/driver/order?token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const d = await res.json();
    const closed = d.orderStatus === 'delivered' || d.orderStatus === 'completed';
    return {
      token,
      orderNumber: d.orderNumber ?? null,
      customerName: d.customerName ?? null,
      address: d.deliveryAddress ?? null,
      total: Number(d.total ?? 0),
      currency: d.currency ?? 'USD',
      collectCash: d.paymentMethod === 'cash' && d.paymentStatus !== 'paid',
      status: d.orderStatus,
      pickedUp: !!d.driverPickedUpAt || d.orderStatus === 'out_for_delivery' || closed,
      delivered: !!d.driverDeliveredAt || closed,
      cancelled: d.orderStatus === 'cancelled',
      restaurantName: d.restaurantName ?? null,
    };
  } catch { return null; }
}

async function saveRoute(tokens: string[], release: string[] = []): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const res = await fetch('/api/driver/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokens, release }),
    });
    if (res.ok) return { ok: true };
    const d = await res.json().catch(() => ({}));
    return { ok: false, reason: d.reason ?? 'error' };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

function reasonText(reason: string, en: boolean): string {
  const es: Record<string, string> = {
    not_found: 'Ese QR no es de un pedido de delivery.',
    not_delivery: 'Ese pedido no es para delivery.',
    closed: 'Ese pedido ya está cerrado.',
    expired: 'El QR de ese pedido venció.',
    other_restaurant: 'Ese pedido es de otro restaurante.',
    too_many: `Máximo ${MAX_ROUTE_ORDERS} pedidos por viaje.`,
    network: 'Sin conexión. Intenta de nuevo.',
    dup: 'Ese pedido ya está en tu viaje.',
  };
  const enT: Record<string, string> = {
    not_found: "That QR isn't a delivery order.",
    not_delivery: "That order isn't for delivery.",
    closed: 'That order is already closed.',
    expired: "That order's QR expired.",
    other_restaurant: "That order is from another restaurant.",
    too_many: `Up to ${MAX_ROUTE_ORDERS} orders per trip.`,
    network: 'No connection. Try again.',
    dup: 'That order is already in your trip.',
  };
  return (en ? enT : es)[reason] ?? (en ? 'Could not add it. Try again.' : 'No se pudo agregar. Intenta de nuevo.');
}

export function DriverRouteClient({ token, lang }: { token: string; lang: string }) {
  const en = lang === 'en';
  const [route, setRoute] = useState<string[] | null>(null);
  const [stops, setStops] = useState<Record<string, Stop>>({});
  /** Ruta guardada en este teléfono a la que se puede sumar el pedido de la URL. */
  const [mergeOffer, setMergeOffer] = useState<string[] | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ tone: 'info' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadStops = useCallback(async (tokens: string[]) => {
    const list = await Promise.all(tokens.map(fetchStop));
    setStops((prev) => {
      const next = { ...prev };
      list.forEach((s) => { if (s) next[s.token] = s; });
      return next;
    });
    return list;
  }, []);

  // Arranque: ¿este token ya es parte de la ruta guardada? ¿hay una ruta a la que sumarlo?
  useEffect(() => {
    (async () => {
      const stored = readStore();
      if (stored && stored.includes(token)) {
        setRoute(stored);
        loadStops(stored);
        return;
      }
      if (stored && stored.length > 0) {
        const list = await loadStops(stored);
        const pending = list.filter((s): s is Stop => !!s && !s.pickedUp && !isDone(s)).map((s) => s.token);
        if (pending.length > 0 && pending.length < MAX_ROUTE_ORDERS) {
          setMergeOffer(pending);
          loadStops([token]);
          return;
        }
      }
      setRoute([token]);
      writeStore([token]);
      loadStops([token]);
    })();
  }, [token, loadStops]);

  const commit = useCallback((tokens: string[]) => {
    setRoute(tokens);
    writeStore(tokens);
  }, []);

  // ── Agregar un pedido (escáner o la oferta de unir) ──
  const addToken = useCallback(async (t: string, base: string[]) => {
    if (base.includes(t)) { setScanMsg({ tone: 'error', text: reasonText('dup', en) }); return false; }
    if (base.length >= MAX_ROUTE_ORDERS) { setScanMsg({ tone: 'error', text: reasonText('too_many', en) }); return false; }
    setScanMsg({ tone: 'info', text: en ? 'Adding…' : 'Agregando…' });
    const next = [...base, t];
    const r = await saveRoute(next);
    if (!r.ok) { setScanMsg({ tone: 'error', text: reasonText(r.reason, en) }); return false; }
    commit(next);
    await loadStops([t]);
    setScanMsg(null);
    return true;
  }, [commit, loadStops, en]);

  const onScan = useCallback(async (t: string) => {
    if (!route || busy) return;
    setBusy(true);
    const ok = await addToken(t, route);
    setBusy(false);
    if (ok) setScanOpen(false);
  }, [route, busy, addToken]);

  const acceptMerge = async () => {
    if (!mergeOffer) return;
    setBusy(true);
    const ok = await addToken(token, mergeOffer);
    setBusy(false);
    if (ok) setMergeOffer(null);
  };

  const declineMerge = () => {
    setMergeOffer(null);
    commit([token]);
  };

  // ── Ordenar / quitar (antes de salir) ──
  const move = async (i: number, dir: -1 | 1) => {
    if (!route) return;
    const j = i + dir;
    if (j < 0 || j >= route.length) return;
    const next = [...route];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
    void saveRoute(next);
  };
  const remove = async (t: string) => {
    if (!route) return;
    const next = route.filter((x) => x !== t);
    commit(next);
    void saveRoute(next, [t]);
  };

  // ── Salir: "Ya tengo los N pedidos" ──
  const pickUpAll = async () => {
    if (!route) return;
    setBusy(true);
    setError('');
    const pending = route.filter((t) => !stops[t]?.pickedUp && !isDone(stops[t]));
    for (const t of pending) {
      try {
        const res = await fetch('/api/driver/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: t, action: 'picked_up' }),
        });
        if (!res.ok && res.status !== 409) {
          const d = await res.json().catch(() => ({}));
          setError(d.error ?? (en ? 'Error — try again' : 'Error, intenta de nuevo'));
        }
      } catch {
        await queueStatusAction(t, 'picked_up');
      }
    }
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    setStops((prev) => {
      const next = { ...prev };
      for (const t of pending) if (next[t]) next[t] = { ...next[t], pickedUp: true };
      return next;
    });
    setBusy(false);
  };

  // ── En camino: la parada actual es la primera sin terminar ──
  const current = route?.find((t) => !isDone(stops[t])) ?? null;
  const currentIndex = route && current ? route.indexOf(current) : -1;

  const onStopDone = useCallback(async () => {
    if (!current) return;
    // Lo que el servidor dice manda (entregado / cancelado / cerrado por el mostrador).
    const [s] = await loadStops([current]);
    if (!s || !isDone(s)) {
      setStops((prev) => (prev[current] ? { ...prev, [current]: { ...prev[current], delivered: true } } : prev));
    }
  }, [current, loadStops]);

  const onSkip = useCallback(() => {
    if (!route || !current) return;
    const done = route.filter((t) => isDone(stops[t]));
    const pending = route.filter((t) => !isDone(stops[t]) && t !== current);
    const next = [...done, ...pending, current];
    commit(next);
    void saveRoute([...pending, current]);
  }, [route, current, stops, commit]);

  const routeCtx: RouteCtx | undefined = useMemo(() => {
    if (!route || route.length < 2 || !current) return undefined;
    const pendingAfter = route.slice(currentIndex + 1).filter((t) => !isDone(stops[t]));
    return {
      index: currentIndex,
      total: route.length,
      gpsTokens: route.filter((t) => !isDone(stops[t])),
      upcoming: pendingAfter.map((t) => ({ shortNum: shortNum(stops[t]?.orderNumber ?? null), address: stops[t]?.address ?? null })),
      onStopDone,
      onSkip,
    };
  }, [route, current, currentIndex, stops, onStopDone, onSkip]);

  // ───────────────────────── Render ─────────────────────────

  if (!route && !mergeOffer) return <Spinner />;

  // Pantalla: sumar este pedido a la ruta que ya tiene en el teléfono.
  if (mergeOffer) {
    const me = stops[token];
    return (
      <Shell>
        <main className="flex-1 w-full max-w-md mx-auto px-4 pt-6 pb-4 grid content-start gap-3">
          <p className="text-[12px] font-semibold" style={{ color: C.sub }}>{me?.restaurantName}</p>
          <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight">
            {en ? `Add ${shortNum(me?.orderNumber ?? null)} to your trip?` : `¿Sumar ${shortNum(me?.orderNumber ?? null)} a tu viaje?`}
          </h1>
          <p className="text-[15px]" style={{ color: C.sub }}>
            {en ? 'You already have these orders, not picked up yet:' : 'Ya tienes estos pedidos, todavía sin salir:'}
          </p>
          <ul className="grid gap-2">
            {mergeOffer.map((t) => (
              <li key={t} className="rounded-2xl bg-white px-4 py-3 flex gap-2 text-[14px]" style={{ border: `1px solid ${C.line}` }}>
                <b className="tabular-nums">{shortNum(stops[t]?.orderNumber ?? null)}</b>
                <span className="truncate" style={{ color: C.sub }}>{stops[t]?.address}</span>
              </li>
            ))}
          </ul>
          {scanMsg?.tone === 'error' && <p className="text-[13px] font-semibold" style={{ color: C.red }}>{scanMsg.text}</p>}
        </main>
        <Dock>
          <BigButton onClick={acceptMerge} loading={busy} tone="green">{en ? 'Add to my trip' : 'Sumar a mi viaje'}</BigButton>
          <button type="button" onClick={declineMerge} className="h-12 text-[15px] font-bold" style={{ color: C.sub }}>
            {en ? 'Only this order' : 'Solo este pedido'}
          </button>
        </Dock>
      </Shell>
    );
  }

  const r = route!;
  const scanner = scanOpen && (
    <QrScanner en={en} onToken={onScan} onClose={() => { setScanOpen(false); setScanMsg(null); }} message={scanMsg} />
  );

  // Un solo pedido: la pantalla de siempre, con "Agregar otro pedido".
  if (r.length < 2) {
    const only = r[0] ?? token;
    const s = stops[only];
    return (
      <>
        <DriverTrackClient key={only} token={only} lang={lang}
          onAddOrder={s && !s.pickedUp && !isDone(s) ? () => { setScanMsg(null); setScanOpen(true); } : undefined} />
        {scanner}
      </>
    );
  }

  const anyPicked = r.some((t) => stops[t]?.pickedUp);
  const loaded = r.every((t) => stops[t]);

  // Viaje terminado: resumen de caja.
  if (loaded && !current) {
    const deliveredCash = r.filter((t) => stops[t].delivered && stops[t].collectCash);
    const cashTotal = deliveredCash.reduce((n, t) => n + stops[t].total, 0);
    const cur = stops[r[0]].currency;
    const returned = r.filter((t) => stops[t].cancelled);
    return (
      <Shell>
        <main className="flex-1 w-full max-w-md mx-auto px-4 pt-8 pb-6 grid content-start gap-3">
          <span className="w-16 h-16 rounded-full grid place-items-center justify-self-center" style={{ background: C.green, color: C.greenInk }}>
            <Check className="w-8 h-8" strokeWidth={3} aria-hidden />
          </span>
          <h1 className="font-display text-[28px] font-extrabold tracking-tight text-center">{en ? 'Trip finished' : 'Viaje terminado'}</h1>
          {cashTotal > 0 && (
            <div className="rounded-2xl px-4 py-3" style={{ background: C.orangeSoft, color: C.orange }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em]">{en ? 'Hand in at the register' : 'Entrega en caja'}</p>
              <p className="font-display text-[32px] font-extrabold leading-none tabular-nums mt-1">{money(cashTotal, cur)}</p>
            </div>
          )}
          <ul className="rounded-[18px] bg-white divide-y" style={{ border: `1px solid ${C.line}` }}>
            {r.map((t) => {
              const s = stops[t];
              return (
                <li key={t} className="px-4 py-3 flex items-center justify-between gap-3 text-[14px]">
                  <span className="min-w-0">
                    <b className="tabular-nums">{shortNum(s.orderNumber)}</b>
                    <span style={{ color: C.sub }}> · {s.customerName}</span>
                    <span className="block text-[12.5px] font-semibold" style={{ color: s.cancelled ? C.red : C.greenDeep }}>
                      {s.cancelled ? (en ? 'Cancelled — bring the bag back' : 'Cancelado: devuelve la bolsa') : (en ? 'Delivered' : 'Entregado')}
                    </span>
                  </span>
                  <span className="tabular-nums font-bold flex-shrink-0" style={{ color: s.collectCash && s.delivered ? C.ink : C.faint }}>
                    {s.collectCash ? money(s.total, s.currency) : (en ? 'Paid' : 'Pagado')}
                  </span>
                </li>
              );
            })}
          </ul>
          {returned.length > 0 && (
            <p className="flex items-start gap-2 rounded-2xl px-4 py-3 text-[13px] font-semibold" style={{ background: C.redSoft, color: C.red }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden />
              {en ? 'Return the cancelled bags to the restaurant.' : 'Devuelve al restaurante las bolsas de los pedidos cancelados.'}
            </p>
          )}
        </main>
      </Shell>
    );
  }

  // En camino: parada por parada con la pantalla de siempre.
  if (anyPicked && current && routeCtx) {
    return <DriverTrackClient key={current} token={current} lang={lang} route={routeCtx} />;
  }

  // Antes de salir: la lista del viaje.
  const cashTotal = r.reduce((n, t) => n + (stops[t]?.collectCash ? stops[t].total : 0), 0);
  const cur = stops[r[0]]?.currency ?? 'USD';
  return (
    <Shell>
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-4 grid content-start gap-3">
        <header>
          <p className="text-[12px] font-semibold" style={{ color: C.sub }}>
            {[stops[r[0]]?.restaurantName, cashTotal > 0 ? (en ? `collect ${money(cashTotal, cur)} total` : `cobrar ${money(cashTotal, cur)} en total`) : null].filter(Boolean).join(' · ')}
          </p>
          <h1 className="font-display text-[28px] font-extrabold leading-none tracking-tight">
            {en ? `Your trip · ${r.length} orders` : `Tu viaje · ${r.length} pedidos`}
          </h1>
          <p className="text-[13px] mt-1.5" style={{ color: C.faint }}>
            {en ? 'Order = delivery order. Use the arrows to change it.' : 'El orden es el de entrega. Cámbialo con las flechas.'}
          </p>
        </header>

        <ol className="grid gap-2">
          {r.map((t, i) => {
            const s = stops[t];
            return (
              <li key={t} className="rounded-[18px] bg-white p-3 flex items-center gap-3" style={{ border: `1px solid ${C.line}` }}>
                <span className="w-8 h-8 rounded-full grid place-items-center text-[14px] font-extrabold flex-shrink-0" style={{ background: C.ink, color: '#fff' }}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold truncate">{shortNum(s?.orderNumber ?? null)}{s?.customerName ? ` · ${s.customerName}` : ''}</span>
                  <span className="block text-[13px] leading-snug" style={{ color: C.sub }}>{s?.address ?? '…'}</span>
                  {s && (
                    <span className="block text-[12.5px] font-bold mt-0.5" style={{ color: s.collectCash ? C.orange : C.greenDeep }}>
                      {s.collectCash ? `${en ? 'Collect' : 'Cobrar'} ${money(s.total, s.currency)}` : (en ? 'Paid online' : 'Pagado online')}
                    </span>
                  )}
                </span>
                <span className="grid grid-cols-1 gap-1 flex-shrink-0">
                  <IconBtn label={en ? 'Move up' : 'Subir'} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></IconBtn>
                  <IconBtn label={en ? 'Move down' : 'Bajar'} disabled={i === r.length - 1} onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></IconBtn>
                </span>
                <IconBtn label={en ? 'Remove from trip' : 'Quitar del viaje'} onClick={() => remove(t)}><X className="w-4 h-4" /></IconBtn>
              </li>
            );
          })}
        </ol>

        {r.length < MAX_ROUTE_ORDERS && (
          <button type="button" onClick={() => { setScanMsg(null); setScanOpen(true); }}
            className="h-14 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-bold active:scale-[0.98] transition-transform"
            style={{ border: `2px dashed ${C.line}`, color: C.ink }}>
            <Plus className="w-5 h-5" aria-hidden /> {en ? 'Add another order' : 'Agregar otro pedido'}
          </button>
        )}
        {error && <p className="text-[13px] font-semibold" style={{ color: C.red }}>{error}</p>}
      </main>
      <Dock>
        <BigButton onClick={pickUpAll} loading={busy || !loaded} tone="green">
          {en ? `I have the ${r.length} orders` : `Ya tengo los ${r.length} pedidos`}
        </BigButton>
      </Dock>
      {scanner}
    </Shell>
  );
}

// ── Piezas ──

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] flex flex-col font-sans" style={{ background: C.surface, color: C.ink }}>{children}</div>;
}
function Spinner() {
  return (
    <div className="min-h-[100dvh] grid place-items-center" style={{ background: C.surface }}>
      <Loader2 className="w-7 h-7 animate-spin" style={{ color: C.sub }} aria-hidden />
    </div>
  );
}
function Dock({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 w-full border-t" style={{ background: C.surface, borderColor: C.line, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="max-w-md mx-auto px-4 pt-3 grid gap-1">{children}</div>
    </div>
  );
}
function BigButton({ children, onClick, loading, tone }: { children: React.ReactNode; onClick: () => void; loading: boolean; tone: 'green' | 'black' }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="w-full h-16 rounded-[18px] text-[18px] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
      style={tone === 'green' ? { background: C.green, color: C.greenInk } : { background: C.black, color: '#fff' }}>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden /> : children}
    </button>
  );
}
function IconBtn({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="w-11 h-11 rounded-xl grid place-items-center active:scale-95 transition-transform disabled:opacity-30"
      style={{ border: `1px solid ${C.line}`, color: C.ink }}>
      {children}
    </button>
  );
}
