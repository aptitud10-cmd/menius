'use client';

/**
 * Viaje del repartidor: uno o varios pedidos (tope 4), como el "Live Order
 * Tracking" de Uber para restaurantes con repartidores propios: se escanea el
 * QR de cada ticket y el orden de escaneo es el orden de entrega.
 *
 * - Primer ticket: con la cámara del teléfono (abre esta página). La primera
 *   vez en ese teléfono pregunta "¿Quién eres?" (equipo del restaurante); el
 *   nombre va al cliente y al Counter al salir.
 * - Siguientes: "Escanear otro ticket" abre la cámara dentro de la página y
 *   queda abierta; cada QR suma el pedido. Si en vez de eso usa la cámara del
 *   teléfono otra vez, el pedido se suma solo al viaje que todavía no salió.
 * - "Salir con N pedidos" → un solo GPS → parada por parada → caja.
 * - Cada pedido se abre solo con SU token. La lista vive en este teléfono
 *   (localStorage); el servidor guarda batch_id/batch_seq.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, ScanLine, X, AlertTriangle, UserRound } from 'lucide-react';
import { C, money } from '@/components/orders/counter/ui';
import { MAX_ROUTE_ORDERS } from '@/lib/orders/driver-route';
import { DriverTrackClient, queueStatusAction, type RouteCtx } from './DriverTrackClient';
import { QrScanner } from './QrScanner';

const STORE_KEY = 'menius-driver-route-v1';
const ME_KEY = 'menius-driver-me-v1';
const STORE_TTL_MS = 8 * 60 * 60 * 1000;

type Me = { id: string | null; name: string; restaurantId: string };
type TeamMember = { id: string; name: string };

type Stop = {
  token: string;
  restaurantId: string | null;
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
  /** Su QR ya no sirve (reasignado a otro repartidor, vencido): sale del viaje. */
  gone?: boolean;
  restaurantName: string | null;
};

const shortNum = (n: string | null | undefined) => (n ? `#${n.split('-').pop()}` : '#—');
const isDone = (s: Stop | undefined) => !!s && (s.delivered || s.cancelled || !!s.gone);
/** Sumar solo si los tickets anteriores se escanearon hace poco (mismo viaje). */
const MERGE_WINDOW_MS = 30 * 60 * 1000;

function readJSON<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
function writeJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* modo privado */ }
}
function readRoute(): { tokens: string[]; at: number } | null {
  const v = readJSON<{ tokens?: unknown; at?: unknown }>(STORE_KEY);
  if (!v || !Array.isArray(v.tokens) || typeof v.at !== 'number' || Date.now() - v.at > STORE_TTL_MS) return null;
  return { tokens: v.tokens.filter((t): t is string => typeof t === 'string').slice(0, MAX_ROUTE_ORDERS), at: v.at };
}
const writeRoute = (tokens: string[]) => writeJSON(STORE_KEY, { tokens, at: Date.now() });

const goneStop = (token: string): Stop => ({
  token, restaurantId: null, orderNumber: null, customerName: null, address: null, total: 0, currency: 'USD',
  collectCash: false, status: 'gone', pickedUp: false, delivered: false, cancelled: false, gone: true, restaurantName: null,
});

/** null = sin red (se reintenta); gone = el QR ya no sirve. */
async function fetchStop(token: string): Promise<Stop | null> {
  try {
    const res = await fetch(`/api/driver/order?token=${encodeURIComponent(token)}`);
    if (res.status === 404 || res.status === 410) return goneStop(token);
    if (!res.ok) return null;
    const d = await res.json();
    const closed = d.orderStatus === 'delivered' || d.orderStatus === 'completed';
    return {
      token,
      restaurantId: d.restaurantId ?? null,
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
    dup: 'Ese ticket ya está en tu viaje.',
    out: 'Ya saliste con este viaje. Ese pedido va en el próximo.',
  };
  const enT: Record<string, string> = {
    not_found: "That QR isn't a delivery order.",
    not_delivery: "That order isn't for delivery.",
    closed: 'That order is already closed.',
    expired: "That order's QR expired.",
    other_restaurant: 'That order is from another restaurant.',
    too_many: `Up to ${MAX_ROUTE_ORDERS} orders per trip.`,
    network: 'No connection. Try again.',
    dup: 'That ticket is already in your trip.',
    out: "You already left on this trip. That order goes on the next one.",
  };
  return (en ? enT : es)[reason] ?? (en ? 'Could not add it. Try again.' : 'No se pudo sumar. Intenta de nuevo.');
}

export function DriverRouteClient({ token, lang }: { token: string; lang: string }) {
  const en = lang === 'en';
  const [route, setRoute] = useState<string[] | null>(null);
  const [stops, setStops] = useState<Record<string, Stop>>({});
  const [scanOpen, setScanOpen] = useState(false);
  const [scanMsg, setScanMsg] = useState<{ tone: 'info' | 'ok' | 'error'; text: string } | null>(null);
  /** Aviso arriba: "#043 se sumó a tu viaje" o por qué no se pudo. */
  const [joinedNote, setJoinedNote] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [askWho, setAskWho] = useState(false);
  const busyRef = useRef(false);

  const loadStops = useCallback(async (tokens: string[]) => {
    const list = await Promise.all(tokens.map(fetchStop));
    setStops((prev) => {
      const next = { ...prev };
      list.forEach((s) => { if (s) next[s.token] = s; });
      return next;
    });
    return list;
  }, []);

  // false si esta pestaña quedó suelta (no se pudo sumar al viaje guardado):
  // lo que haga acá no pisa el viaje del teléfono.
  const persistRef = useRef(true);
  const commit = useCallback((tokens: string[]) => {
    setRoute(tokens);
    if (persistRef.current) writeRoute(tokens);
  }, []);

  // ── Arranque ──
  useEffect(() => {
    (async () => {
      const stored = readRoute();
      if (stored && stored.tokens.includes(token)) {
        setRoute(stored.tokens);
        loadStops(stored.tokens);
        return;
      }
      if (stored && stored.tokens.length > 0) {
        const list = await loadStops(stored.tokens);
        const live = list.filter((s): s is Stop => !!s && !isDone(s));
        // Va en camino con un viaje: ese viaje no se pisa nunca (iOS recarga la
        // pestaña al volver de Maps). Este ticket va en el próximo viaje.
        if (live.some((s) => s.pickedUp)) {
          setRoute(stored.tokens);
          setJoinedNote({ tone: 'error', text: reasonText('out', en) });
          return;
        }
        // Escaneó otro ticket con la cámara del teléfono minutos después: se
        // suma solo al viaje que todavía no salió (igual que con el botón).
        const fresh = Date.now() - stored.at < MERGE_WINDOW_MS;
        if (fresh && live.length > 0 && live.length < MAX_ROUTE_ORDERS) {
          const next = [...live.map((s) => s.token), token];
          const r = await saveRoute(next);
          const [mine] = await loadStops([token]);
          if (r.ok) {
            commit(next);
            setJoinedNote({ tone: 'ok', text: en ? `${shortNum(mine?.orderNumber)} was added to your trip` : `${shortNum(mine?.orderNumber)} se sumó a tu viaje` });
          } else {
            // Sin pisar el viaje guardado: este ticket queda solo en esta pestaña.
            persistRef.current = false;
            setRoute([token]);
            setJoinedNote({ tone: 'error', text: `${shortNum(mine?.orderNumber)}: ${reasonText(r.reason, en)}` });
          }
          return;
        }
      }
      commit([token]);
      loadStops([token]);
      // Viaje nuevo de un solo ticket: si venía de una ruta abandonada, la suelta
      // (si no, su cliente vería paradas que nunca salieron).
      void saveRoute([token]);
    })();
  }, [token, loadStops, commit, en]);

  // Un ticket que no cargó por falta de señal se reintenta (si no, "Salir"
  // quedaba girando hasta recargar la página).
  useEffect(() => {
    if (!route) return;
    const missing = route.filter((t) => !stops[t]);
    if (missing.length === 0) return;
    const retry = () => { void loadStops(missing); };
    const id = setInterval(retry, 5000);
    window.addEventListener('online', retry);
    return () => { clearInterval(id); window.removeEventListener('online', retry); };
  }, [route, stops, loadStops]);

  useEffect(() => {
    if (!joinedNote) return;
    const id = setTimeout(() => setJoinedNote(null), joinedNote.tone === 'ok' ? 5000 : 9000);
    return () => clearTimeout(id);
  }, [joinedNote]);

  // Antes de salir, un ticket que ya no sirve (lo reasignaron) sale del viaje.
  useEffect(() => {
    if (!route || route.length < 2) return;
    if (route.some((t) => stops[t]?.pickedUp)) return;
    const gone = route.filter((t) => stops[t]?.gone);
    if (gone.length === 0) return;
    const next = route.filter((t) => !gone.includes(t));
    if (next.length === 0) return;
    commit(next);
    void saveRoute(next, gone);
    setJoinedNote({ tone: 'error', text: en ? 'A ticket is no longer yours (reassigned) and left the trip.' : 'Un ticket ya no es tuyo (lo reasignaron) y salió del viaje.' });
    if (gone.includes(token)) router.replace(`/driver/track/${next[0]}${en ? '?lang=en' : ''}`);
  }, [route, stops, commit, en, token, router]);

  // Otra pestaña (otro QR abierto con la cámara) cambió el viaje: misma lista acá.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORE_KEY) return;
      const next = readRoute();
      if (!next || !next.tokens.includes(token)) return;
      setRoute(next.tokens);
      loadStops(next.tokens);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [token, loadStops]);

  // ── ¿Quién eres? (una vez por teléfono y restaurante) ──
  const restaurantId = route ? (stops[route[0]]?.restaurantId ?? null) : null;
  useEffect(() => {
    if (!restaurantId) return;
    const saved = readJSON<Me>(ME_KEY);
    if (saved && saved.restaurantId === restaurantId && saved.name) { setMe(saved); return; }
    setAskWho(true);
  }, [restaurantId]);
  useEffect(() => {
    if (!askWho || team) return;
    fetch(`/api/driver/team?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : { drivers: [] }))
      .then((d) => setTeam(Array.isArray(d.drivers) ? d.drivers : []))
      .catch(() => setTeam([]));
  }, [askWho, team, token]);
  const chooseMe = (m: { id: string | null; name: string }) => {
    if (!restaurantId || !m.name.trim()) return;
    const v: Me = { id: m.id, name: m.name.trim().slice(0, 60), restaurantId };
    writeJSON(ME_KEY, v);
    setMe(v);
    setAskWho(false);
  };

  // ── Sumar un ticket desde el escáner ──
  const onScan = useCallback(async (t: string) => {
    if (!route || busyRef.current) return;
    if (route.includes(t)) { setScanMsg({ tone: 'error', text: reasonText('dup', en) }); return; }
    if (route.some((x) => stops[x]?.pickedUp && !isDone(stops[x]))) { setScanMsg({ tone: 'error', text: reasonText('out', en) }); return; }
    if (route.length >= MAX_ROUTE_ORDERS) { setScanMsg({ tone: 'error', text: reasonText('too_many', en) }); return; }
    busyRef.current = true;
    setScanMsg({ tone: 'info', text: en ? 'Adding…' : 'Sumando…' });
    const next = [...route, t];
    const r = await saveRoute(next);
    if (!r.ok) {
      setScanMsg({ tone: 'error', text: reasonText(r.reason, en) });
    } else {
      commit(next);
      const [s] = await loadStops([t]);
      setScanMsg({ tone: 'ok', text: en ? `✓ ${shortNum(s?.orderNumber)} added` : `✓ ${shortNum(s?.orderNumber)} sumado` });
      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
    }
    busyRef.current = false;
  }, [route, stops, commit, loadStops, en]);

  const openScanner = () => { setScanMsg(null); setScanOpen(true); };

  const remove = (t: string) => {
    if (!route) return;
    const next = route.filter((x) => x !== t);
    commit(next);
    void saveRoute(next, [t]);
    // Quitó el ticket con el que se abrió esta página: la URL pasa a otro del
    // viaje, si no al recargar (iOS lo hace al volver de Maps) se perdía el viaje.
    if (t === token && next.length > 0) {
      router.replace(`/driver/track/${next[0]}${en ? '?lang=en' : ''}`);
    }
  };

  // ── Salir con todos ──
  const pickUpAll = async () => {
    if (!route || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    const pending = route.filter((t) => !stops[t]?.pickedUp && !isDone(stops[t]));
    const queued: string[] = [];
    for (const t of pending) {
      try {
        await fetch('/api/driver/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: t, action: 'picked_up', ...(me ? { driver: { id: me.id, name: me.name } } : {}) }),
        });
      } catch {
        // Sin red: queda en cola y se manda solo al volver la señal.
        await queueStatusAction(t, 'picked_up');
        queued.push(t);
      }
    }
    // Lo que diga el servidor manda: cancelados salen del viaje, los que
    // fallaron se avisan y su parada vuelve a ofrecer "Ya tengo el pedido".
    const fresh = await loadStops(pending.filter((t) => !queued.includes(t)));
    const failed = fresh.filter((s): s is Stop => !!s && !s.pickedUp && !isDone(s));
    const cancelled = fresh.filter((s): s is Stop => !!s && s.cancelled);
    if (queued.length) {
      setStops((prev) => {
        const next = { ...prev };
        for (const t of queued) if (next[t]) next[t] = { ...next[t], pickedUp: true };
        return next;
      });
    }
    if (failed.length || cancelled.length) {
      setError([
        failed.length ? (en ? `Could not mark ${failed.map((s) => shortNum(s.orderNumber)).join(', ')}. Try again.` : `No se pudo marcar ${failed.map((s) => shortNum(s.orderNumber)).join(', ')}. Intenta de nuevo.`) : null,
        cancelled.length ? (en ? `${cancelled.map((s) => shortNum(s.orderNumber)).join(', ')} was cancelled: leave that bag.` : `${cancelled.map((s) => shortNum(s.orderNumber)).join(', ')} se canceló: deja esa bolsa.`) : null,
      ].filter(Boolean).join(' '));
    }
    if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
    setBusy(false);
    busyRef.current = false;
  };

  // ── En camino: la parada actual es la primera sin terminar ──
  const current = route?.find((t) => !isDone(stops[t])) ?? null;
  const currentIndex = route && current ? route.indexOf(current) : -1;

  const onStopDone = useCallback(async () => {
    if (!current) return;
    const [s] = await loadStops([current]);
    if (!s || !isDone(s)) {
      setStops((prev) => (prev[current] ? { ...prev, [current]: { ...prev[current], delivered: true } } : prev));
    }
  }, [current, loadStops]);

  const onSkip = useCallback(() => {
    if (!route || !current) return;
    const done = route.filter((t) => isDone(stops[t]));
    const pending = route.filter((t) => !isDone(stops[t]) && t !== current);
    commit([...done, ...pending, current]);
    void saveRoute([...pending, current]);
  }, [route, current, stops, commit]);

  const routeCtx: RouteCtx | undefined = useMemo(() => {
    if (!route || route.length < 2 || !current) return undefined;
    const pendingAfter = route.slice(currentIndex + 1).filter((t) => !isDone(stops[t]));
    return {
      index: currentIndex,
      total: route.length,
      gpsTokens: route.filter((t) => !isDone(stops[t])),
      upcoming: pendingAfter.map((t) => ({ shortNum: shortNum(stops[t]?.orderNumber), address: stops[t]?.address ?? null })),
      onStopDone,
      onSkip,
    };
  }, [route, current, currentIndex, stops, onStopDone, onSkip]);

  // ───────────────────────── Render ─────────────────────────

  if (!route) return <Spinner />;
  const r = route;
  const first = stops[r[0]];
  const notLeft = r.every((t) => !stops[t]?.pickedUp);

  // ¿Quién eres? — antes de salir, una sola vez en este teléfono.
  if (askWho && notLeft && first && !isDone(first)) {
    return <WhoAreYou en={en} restaurantName={first.restaurantName} team={team} onPick={chooseMe} />;
  }

  const scanner = scanOpen && (
    <QrScanner en={en} onToken={onScan} onClose={() => { setScanOpen(false); setScanMsg(null); }} message={scanMsg}
      items={r.map((t) => shortNum(stops[t]?.orderNumber))} />
  );

  // Aviso arriba (se sumó / no se pudo / va en el próximo viaje). Se cierra solo o tocándolo.
  const toast = joinedNote && (
    <button type="button" onClick={() => setJoinedNote(null)} role="status"
      className="fixed inset-x-3 z-[80] max-w-md mx-auto flex items-start gap-2 rounded-2xl px-4 py-3 text-left text-[14px] font-bold shadow-lg"
      style={{ top: 'max(0.75rem, env(safe-area-inset-top))', ...(joinedNote.tone === 'ok' ? { background: C.greenSoft, color: C.greenDeep } : { background: C.redSoft, color: C.red }) }}>
      {joinedNote.tone === 'ok' ? <Check className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={3} aria-hidden /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden />}
      {joinedNote.text}
    </button>
  );

  const whoLine = me && (
    <p className="flex items-center justify-center gap-1.5 text-[13px] font-semibold" style={{ color: C.sub }}>
      <UserRound className="w-4 h-4" aria-hidden />
      {en ? `You're taking it, ${me.name}` : `Lo llevas tú, ${me.name}`}
      <span aria-hidden>·</span>
      <button type="button" onClick={() => setAskWho(true)} className="underline underline-offset-4">{en ? 'Not you?' : '¿No eres tú?'}</button>
    </p>
  );

  const scanButton = (
    <button type="button" onClick={openScanner}
      className="h-14 rounded-2xl flex items-center justify-center gap-2 text-[16px] font-extrabold active:scale-[0.98] transition-transform"
      style={{ background: C.ink, color: '#fff' }}>
      <ScanLine className="w-5 h-5" aria-hidden /> {en ? 'Scan another ticket' : 'Escanear otro ticket'}
    </button>
  );

  // Un solo pedido: la pantalla de siempre + escanear otro ticket.
  if (r.length < 2) {
    const only = r[0];
    const s = stops[only];
    const canAdd = !!s && !s.pickedUp && !isDone(s);
    return (
      <>
        <DriverTrackClient key={only} token={only} lang={lang} driver={me}
          startExtra={canAdd ? <div className="grid gap-3 pt-1">{scanButton}{whoLine}</div> : whoLine} />
        {scanner}
        {toast}
      </>
    );
  }

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
                    <span className="block text-[12.5px] font-semibold" style={{ color: s.cancelled ? C.red : s.gone ? C.faint : C.greenDeep }}>
                      {s.cancelled ? (en ? 'Cancelled — bring the bag back' : 'Cancelado: devuelve la bolsa')
                        : s.gone ? (en ? 'No longer yours (reassigned)' : 'Ya no es tuyo (lo reasignaron)')
                        : (en ? 'Delivered' : 'Entregado')}
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
          <p className="text-[13px] text-center mt-2" style={{ color: C.faint }}>
            {en ? 'Your next trip starts by scanning its first ticket.' : 'El próximo viaje empieza escaneando su primer ticket.'}
          </p>
        </main>
      </Shell>
    );
  }

  // En camino: parada por parada con la pantalla de siempre.
  if (!notLeft && current && routeCtx) {
    return (
      <>
        <DriverTrackClient key={current} token={current} lang={lang} route={routeCtx} driver={me} />
        {toast}
      </>
    );
  }

  // Antes de salir: los tickets escaneados, en orden de entrega.
  const cashTotal = r.reduce((n, t) => n + (stops[t]?.collectCash ? stops[t].total : 0), 0);
  const cur = first?.currency ?? 'USD';
  return (
    <Shell>
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4 pb-4 grid content-start gap-3">
        <header>
          <p className="text-[12px] font-semibold" style={{ color: C.sub }}>
            {[first?.restaurantName, cashTotal > 0 ? (en ? `collect ${money(cashTotal, cur)} total` : `cobrar ${money(cashTotal, cur)} en total`) : null].filter(Boolean).join(' · ')}
          </p>
          <h1 className="font-display text-[28px] font-extrabold leading-none tracking-tight">
            {en ? `Your trip · ${r.length} orders` : `Tu viaje · ${r.length} pedidos`}
          </h1>
          <p className="text-[13px] mt-1.5" style={{ color: C.faint }}>
            {en ? 'Delivered in the order you scanned them.' : 'Se entregan en el orden en que los escaneaste.'}
          </p>
        </header>

        <ol className="grid gap-2">
          {r.map((t, i) => {
            const s = stops[t];
            return (
              <li key={t} className="rounded-[18px] bg-white p-3 pl-4 flex items-center gap-3" style={{ border: `1px solid ${C.line}` }}>
                <span className="w-8 h-8 rounded-full grid place-items-center text-[14px] font-extrabold flex-shrink-0" style={{ background: C.ink, color: '#fff' }}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold truncate">{shortNum(s?.orderNumber)}{s?.customerName ? ` · ${s.customerName}` : ''}</span>
                  <span className="block text-[13px] leading-snug" style={{ color: C.sub }}>{s?.address ?? '…'}</span>
                  {s && (
                    <span className="block text-[12.5px] font-bold mt-0.5" style={{ color: s.collectCash ? C.orange : C.greenDeep }}>
                      {s.collectCash ? `${en ? 'Collect' : 'Cobrar'} ${money(s.total, s.currency)}` : (en ? 'Paid online' : 'Pagado online')}
                    </span>
                  )}
                </span>
                <button type="button" aria-label={en ? `Remove ${shortNum(s?.orderNumber)} from the trip` : `Quitar ${shortNum(s?.orderNumber)} del viaje`}
                  onClick={() => remove(t)}
                  className="w-11 h-11 rounded-xl grid place-items-center flex-shrink-0 active:scale-95 transition-transform"
                  style={{ border: `1px solid ${C.line}`, color: C.sub }}>
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ol>

        {r.length < MAX_ROUTE_ORDERS && scanButton}
        {whoLine}
        {error && <p className="text-[13px] font-semibold" style={{ color: C.red }}>{error}</p>}
      </main>
      <Dock>
        <BigButton onClick={pickUpAll} loading={busy || !loaded}>
          {en ? `Leave with ${r.length} orders` : `Salir con ${r.length} pedidos`}
        </BigButton>
      </Dock>
      {scanner}
      {toast}
    </Shell>
  );
}

// ── ¿Quién eres? ──

function WhoAreYou({ en, restaurantName, team, onPick }: {
  en: boolean;
  restaurantName: string | null;
  team: TeamMember[] | null;
  onPick: (m: { id: string | null; name: string }) => void;
}) {
  const [typed, setTyped] = useState('');
  return (
    <Shell>
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-8 pb-4 grid content-start gap-4">
        <div>
          <p className="text-[12px] font-semibold" style={{ color: C.sub }}>{restaurantName}</p>
          <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">{en ? 'Who are you?' : '¿Quién eres?'}</h1>
          <p className="text-[14px] mt-1" style={{ color: C.sub }}>
            {en ? 'The customer will see your name. We only ask once on this phone.' : 'El cliente verá tu nombre. Solo se pregunta una vez en este teléfono.'}
          </p>
        </div>
        {team === null ? (
          <Loader2 className="w-6 h-6 animate-spin justify-self-center" style={{ color: C.sub }} aria-hidden />
        ) : team.length > 0 && (
          <div className="grid gap-2">
            {team.map((d) => (
              <button key={d.id} type="button" onClick={() => onPick({ id: d.id, name: d.name })}
                className="h-16 rounded-2xl bg-white px-4 flex items-center gap-3 text-[18px] font-extrabold text-left active:scale-[0.98] transition-transform"
                style={{ border: `1px solid ${C.line}` }}>
                <span className="w-10 h-10 rounded-full grid place-items-center text-[16px] font-extrabold" style={{ background: C.ink, color: '#fff' }} aria-hidden>
                  {d.name.slice(0, 1).toUpperCase()}
                </span>
                {d.name}
              </button>
            ))}
          </div>
        )}
        <form className="grid gap-2" onSubmit={(e) => { e.preventDefault(); onPick({ id: null, name: typed }); }}>
          <label htmlFor="drv-name" className="text-[13px] font-bold" style={{ color: C.sub }}>
            {team && team.length > 0 ? (en ? 'Not on the list? Type your name' : '¿No estás en la lista? Escribe tu nombre') : (en ? 'Your name' : 'Tu nombre')}
          </label>
          <div className="flex gap-2">
            <input id="drv-name" value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={60} autoComplete="given-name"
              placeholder={en ? 'e.g. Carlos' : 'Ej. Carlos'}
              className="flex-1 min-w-0 h-14 rounded-2xl bg-white px-4 text-[16px] font-semibold outline-none" style={{ border: `1px solid ${C.line}` }} />
            <button type="submit" disabled={!typed.trim()} className="h-14 px-5 rounded-2xl text-[16px] font-extrabold disabled:opacity-40" style={{ background: C.ink, color: '#fff' }}>
              {en ? 'Go' : 'Listo'}
            </button>
          </div>
        </form>
      </main>
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
function BigButton({ children, onClick, loading }: { children: React.ReactNode; onClick: () => void; loading: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={loading}
      className="w-full h-16 rounded-[18px] text-[18px] font-extrabold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
      style={{ background: C.green, color: C.greenInk }}>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" aria-hidden /> : children}
    </button>
  );
}
