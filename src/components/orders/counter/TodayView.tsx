'use client';

/**
 * Pestaña "Hoy" del Counter (Pedro 2026-11-20, maqueta .specify/docs/especiales/premium/tablero.html).
 * El tablero del día: SOLO lo que está puesto hoy, como las tarjetas que el restaurante engancha sobre la carta.
 * Especiales: hasta 5 lugares; el "+" abre la biblioteca (20+). Sopas: 4 (2 fijas + 2 del día, "Cambiar").
 * Fondo oscuro propio (no sigue el tema Claro/Oscuro): es otra pantalla y es lo que la hace sentir premium.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Cormorant_Garamond } from 'next/font/google';
import { Lock, Plus, RotateCcw, Search, X } from 'lucide-react';
import { addDays, cutoffLabel } from '@/lib/daily-menu';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['600', '700'], style: ['normal', 'italic'], display: 'swap' });

type Kind = 'soup' | 'special';
interface Item {
  id: string; name: string; description: string; price: number; kind: Kind; always: boolean;
  label: string | null; on: boolean; out: boolean; lastOn: string | null;
}
interface DayState {
  day: string; cutoff: string; timezone: string; items: Item[]; yesterday: string[];
  limits: Record<Kind, number>;
  /** Solo en la respuesta de "Igual que ayer": lo que encendió. */
  activated?: string[];
}
/** restore: devuelve daily_last_on a como estaba (lo usa "Deshacer"). */
type Op = { action: 'on' | 'off' | 'out' | 'back' | 'swap'; product_id: string; replace_id?: string; restore?: Record<string, string | null> };

const K = {
  room: '#141210', ink: '#F3EDE4', sub: '#A79E92', mute: '#7d746a', gold: '#C9A46A',
  paper: '#F6EFE2', paper2: '#ECE4D4', navy: '#1E2A44', navySub: '#56607a', red: '#B0232C',
};
const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .28 0 0 0 0 .2 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const money = (v: number) => `$${v.toFixed(2)}`;

function txt(en: boolean) {
  return en ? {
    today: 'Today at', note: (c: string) => `What isn't put on doesn't show · everything resets at ${c}`,
    specials: 'Specials', soups: 'Soups', onMenu: (n: number, max: number) => `${n} on the menu · max ${max}`,
    soupsMeta: '2 every day · 2 of the day', soldOut: 'Sold out', back: 'Put back', change: 'Change',
    returns: (c: string) => `back at ${c}`, putSpecial: 'Add special', fromLibrary: 'pick from the library',
    putSoup: 'Add soup', fromSoups: 'pick today\'s soup', fixed: 'every day', same: 'Same as yesterday',
    sameNone: 'Nothing from yesterday', library: 'The library', addSpecial: 'Add special', search: 'Search specials…',
    recent: 'Recently used', az: 'A–Z', onBoard: 'Already on the board', usedOn: (d: string) => `Used ${d}`, neverUsed: 'Not used yet',
    soupOfDay: 'Soup of the day', everyDay: 'Every day', changeSoup: (n: string) => `Change ${n}`, chooseSoup: 'Today\'s soup',
    undo: 'Undo', isOn: (n: string) => `${n} on the menu`, isOff: (n: string) => `${n} off the menu`,
    isOut: (n: string, c: string) => `${n} · sold out until ${c}`, isBack: (n: string) => `${n} back on the menu`,
    sameDone: 'Done: same as yesterday', full: (n: number) => `There are already ${n}: take one off first`,
    error: 'Could not save. Try again.', remove: 'Take off', loading: 'Loading…', today2: 'today',
    noneYet: 'No specials or soups loaded for this store yet.',
  } : {
    today: 'Hoy en', note: (c: string) => `lo que no se pone no aparece · todo vuelve a las ${c}`,
    specials: 'Especiales', soups: 'Sopas', onMenu: (n: number, max: number) => `${n} en el menú · máx. ${max}`,
    soupsMeta: '2 todos los días · 2 del día', soldOut: 'Se acabó', back: 'Volver a poner', change: 'Cambiar',
    returns: (c: string) => `vuelve a las ${c}`, putSpecial: 'Poner especial', fromLibrary: 'elegí de la biblioteca',
    putSoup: 'Poner sopa', fromSoups: 'elegí la sopa del día', fixed: 'fija', same: 'Igual que ayer',
    sameNone: 'Ayer no hubo nada', library: 'La biblioteca', addSpecial: 'Poner especial', search: 'Buscar entre los especiales…',
    recent: 'Usados hace poco', az: 'A–Z', onBoard: 'Ya está en el tablero', usedOn: (d: string) => `Usado ${d}`, neverUsed: 'Todavía sin usar',
    soupOfDay: 'Soup of the day', everyDay: 'Every day', changeSoup: (n: string) => `Cambiar ${n}`, chooseSoup: 'Sopa del día',
    undo: 'Deshacer', isOn: (n: string) => `${n} en el menú`, isOff: (n: string) => `${n} fuera del menú`,
    isOut: (n: string, c: string) => `${n} · se acabó hasta las ${c}`, isBack: (n: string) => `${n} de vuelta en el menú`,
    sameDone: 'Listo: lo mismo que ayer', full: (n: number) => `Ya hay ${n}: sacá uno primero`,
    error: 'No se pudo guardar. Probá de nuevo.', remove: 'Sacar', loading: 'Cargando…', today2: 'hoy',
    noneYet: 'Esta tienda todavía no tiene sopas ni especiales cargados.',
  };
}

/** "2026-11-20" → "Viernes 20 de noviembre" / "Friday, November 20". */
function dayLong(day: string, en: boolean) {
  const [y, m, d] = day.split('-').map(Number);
  const s = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(en ? 'en-US' : 'es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Cuándo se usó por última vez, relativo al día de trabajo. */
function usedLabel(lastOn: string | null, day: string, en: boolean, T: ReturnType<typeof txt>) {
  if (!lastOn) return T.neverUsed;
  const diff = Math.round((Date.parse(day) - Date.parse(lastOn)) / 86400000);
  if (diff <= 0) return T.usedOn(T.today2);
  if (diff === 1) return T.usedOn(en ? 'yesterday' : 'ayer');
  if (diff < 7) {
    const [y, m, d] = lastOn.split('-').map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(en ? 'en-US' : 'es-ES', { weekday: 'long', timeZone: 'UTC' });
    return T.usedOn(en ? `on ${wd}` : `el ${wd}`);
  }
  return T.usedOn(en ? `${diff} days ago` : `hace ${diff} días`);
}

function Clip({ w = 54 }: { w?: number }) {
  return (
    <span aria-hidden className="absolute left-1/2 -translate-x-1/2" style={{
      top: -9, width: w, height: 16, borderRadius: '3px 3px 5px 5px',
      background: 'linear-gradient(#e6e3de,#9c968d 55%,#bdb7ae)', boxShadow: '0 2px 3px #0007, inset 0 1px 0 #fff9',
    }} />
  );
}

const cardStyle = (out: boolean, tilt: number): React.CSSProperties => ({
  background: out ? K.paper2 : K.paper, backgroundImage: NOISE, color: K.navy,
  boxShadow: '0 1px 0 #fff8 inset, 0 18px 30px -12px #000c, 0 4px 10px #0006',
  transform: `rotate(${tilt}deg)`, filter: out ? 'saturate(.4)' : undefined,
});

function Stamp({ T, cutoff, small }: { T: ReturnType<typeof txt>; cutoff: string; small?: boolean }) {
  return (
    <span className="inline-block whitespace-nowrap font-bold uppercase leading-[1.05]" style={{
      border: `2.5px solid ${K.red}`, color: K.red, borderRadius: 6, transform: `rotate(${small ? -4 : -9}deg)`,
      padding: small ? '4px 9px 3px' : '6px 12px 5px', fontSize: small ? 13 : 17, letterSpacing: '.08em', background: '#F6EFE2e6',
    }}>
      {T.soldOut}
      <small className="block normal-case font-bold" style={{ fontSize: small ? 10 : 11.5, letterSpacing: '.04em' }}>{T.returns(cutoff)}</small>
    </span>
  );
}

export function TodayView({ en, restaurantName }: { en: boolean; restaurantName: string }) {
  const T = useMemo(() => txt(en), [en]);
  const [state, setState] = useState<DayState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | { type: 'library' } | { type: 'soup'; replace: string | null }>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recent' | 'az'>('recent');
  const [toast, setToast] = useState<null | { msg: string; kick?: string | null; undo?: Op[] }>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/counter/today', { cache: 'no-store' });
      if (res.ok) setState(await res.json());
    } catch { /* sin conexión: queda lo último */ }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const showToast = useCallback((t: { msg: string; kick?: string | null; undo?: Op[] }) => {
    setToast(t);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const post = useCallback(async (body: Op | { action: 'same' }): Promise<DayState | 'full' | null> => {
    const res = await fetch('/api/counter/today', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (res.status === 409 && data?.error === 'full') { if (data.items) setState(data); return 'full'; }
    if (!res.ok || !data?.items) return null;
    setState(data);
    return data as DayState;
  }, []);

  const cutoff = state ? cutoffLabel(state.cutoff, en) : '';
  const byId = useMemo(() => new Map((state?.items ?? []).map((i) => [i.id, i])), [state]);

  const run = useCallback(async (op: Op, done: (s: DayState) => { msg: string; kick?: string | null; undo?: Op[] }) => {
    setBusy(op.product_id);
    try {
      const r = await post(op);
      if (r === 'full') {
        const kind = byId.get(op.product_id)?.kind ?? 'special';
        showToast({ msg: T.full(state?.limits[kind] ?? 5) });
      } else if (!r) showToast({ msg: T.error });
      else showToast(done(r));
    } catch { showToast({ msg: T.error }); }
    finally { setBusy(null); }
  }, [post, byId, showToast, T, state]);

  /** Valor actual de daily_last_on, para que "Deshacer" lo devuelva tal cual. */
  const prevOn = useCallback((...ids: string[]) => Object.fromEntries(ids.map((id) => [id, byId.get(id)?.lastOn ?? null])), [byId]);

  const undo = useCallback(async (ops: Op[]) => {
    setToast(null);
    setBusy('undo');
    let failed = false;
    try {
      for (const op of ops) {
        const r = await post(op).catch(() => null);
        if (!r || r === 'full') failed = true;
      }
    } finally { setBusy(null); }
    if (failed) showToast({ msg: T.error });
  }, [post, showToast, T]);

  if (!state) {
    return <div className="flex-1 grid place-items-center" style={{ background: K.room, color: K.sub }}>{T.loading}</div>;
  }

  const specials = state.items.filter((i) => i.kind === 'special');
  const soups = state.items.filter((i) => i.kind === 'soup');
  if (specials.length + soups.length === 0) {
    return <div className="flex-1 grid place-items-center px-6 text-center" style={{ background: K.room, color: K.sub }}>{T.noneYet}</div>;
  }
  const onSpecials = specials.filter((i) => i.on);
  const onSoups = [...soups.filter((i) => i.on && i.always), ...soups.filter((i) => i.on && !i.always)];
  const pendingSame = state.yesterday.map((id) => byId.get(id)).filter((i): i is Item => !!i && !i.on);

  const sameDo = async () => {
    const yesterday = addDays(state.day, -1);
    setBusy('same');
    try {
      const r = await post({ action: 'same' });
      if (r && r !== 'full') {
        // El servidor dice qué encendió; antes de encenderse, su último día era ayer.
        const added = (r.activated ?? []).map((id) => ({ action: 'off' as const, product_id: id, restore: { [id]: yesterday } }));
        showToast({ msg: T.sameDone, undo: added });
      } else showToast({ msg: T.error });
    } catch { showToast({ msg: T.error }); }
    finally { setBusy(null); }
  };

  const libList = specials
    .filter((i) => !query.trim() || `${i.name} ${i.label ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'az'
      ? a.name.localeCompare(b.name)
      : (b.lastOn ?? '').localeCompare(a.lastOn ?? '') || a.name.localeCompare(b.name));

  const act = 'h-12 rounded-[10px] font-semibold text-[15px] px-3 disabled:opacity-50';
  const actIdle: React.CSSProperties = { background: '#1E2A440d', color: K.navy, border: '1px solid #1E2A441f' };
  const actSolid: React.CSSProperties = { background: K.navy, color: K.paper, border: `1px solid ${K.navy}` };

  return (
    <div className="flex-1 min-h-0 relative flex flex-col"
      style={{ background: `radial-gradient(120% 70% at 50% -10%, #2b2520 0%, ${K.room} 60%)`, color: K.ink, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-7 pt-5 pb-28">
        {/* Encabezado */}
        <div className="flex flex-wrap items-end gap-4 mb-5">
          <div className="min-w-0">
            <h1 className={serif.className} style={{ fontWeight: 600, fontSize: 42, lineHeight: 0.98, letterSpacing: '-.01em' }}>
              {T.today} <i style={{ color: K.gold }}>{restaurantName}</i>
            </h1>
            <p className="mt-2 text-[15px]" style={{ color: K.sub }}>{dayLong(state.day, en)} · {T.note(cutoff)}</p>
          </div>
          <span className="flex-1" />
          <button type="button" onClick={sameDo} disabled={pendingSame.length === 0 || busy !== null}
            className="h-[52px] px-5 rounded-[14px] flex items-center gap-3 text-left disabled:opacity-40"
            style={{ border: '1px solid #ffffff22' }}>
            <RotateCcw className="w-5 h-5 flex-none" strokeWidth={2.2} />
            <span>
              <span className="block font-semibold text-[16px]">{T.same}</span>
              <span className="block text-[12.5px] font-medium max-w-[280px] truncate" style={{ color: K.sub }}>
                {pendingSame.length ? pendingSame.map((i) => i.name).join(', ') : T.sameNone}
              </span>
            </span>
          </button>
        </div>

        {/* Especiales */}
        <SectionTitle title={T.specials} meta={T.onMenu(onSpecials.filter((i) => !i.out).length, state.limits.special)} />
        <div className="grid gap-[18px] mt-4 mb-7" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
          {onSpecials.map((it, idx) => (
            <article key={it.id} className="relative rounded-[6px] flex flex-col text-center px-[18px] pt-[26px] pb-4 min-h-[300px]"
              style={cardStyle(it.out, idx % 2 ? 0.5 : -0.6)}>
              <span aria-hidden className="absolute inset-[7px] rounded-[3px] pointer-events-none" style={{ border: '1px solid #1E2A4420' }} />
              <Clip />
              <div className={serif.className} style={{ fontStyle: 'italic', fontWeight: 600, color: K.red, fontSize: 23, lineHeight: 1, opacity: it.out ? 0.45 : 1 }}>
                {it.label ?? T.specials}
              </div>
              <div className={`${serif.className} uppercase mt-3.5 line-clamp-4`} style={{ fontWeight: 700, fontSize: 21, lineHeight: 1.08, letterSpacing: '.035em', opacity: it.out ? 0.45 : 1 }}>
                {it.name}
              </div>
              {it.description && !it.out && (
                <div className="mt-3 text-[13px] leading-[1.35] font-medium line-clamp-3" style={{ color: K.navySub }}>
                  <span aria-hidden className="block w-7 h-px mx-auto mb-2.5" style={{ background: '#1E2A4440' }} />
                  {it.description}
                </div>
              )}
              {it.out && <div className="mt-6 mx-auto"><Stamp T={T} cutoff={cutoff} /></div>}
              <div className={`${serif.className} mt-auto pt-3`} style={{ fontWeight: 700, fontSize: 27, fontVariantNumeric: 'lining-nums', opacity: it.out ? 0.45 : 1 }}>{money(it.price)}</div>
              <div className="flex gap-2 mt-3">
                {it.out ? (
                  <button type="button" className={`${act} flex-1`} style={actSolid} disabled={busy !== null}
                    onClick={() => run({ action: 'back', product_id: it.id }, () => ({ msg: T.isBack(it.name), undo: [{ action: 'out', product_id: it.id }] }))}>
                    {T.back}
                  </button>
                ) : (
                  <button type="button" className={`${act} flex-1`} style={actIdle} disabled={busy !== null}
                    onClick={() => run({ action: 'out', product_id: it.id }, () => ({ msg: T.isOut(it.name, cutoff), undo: [{ action: 'back', product_id: it.id }] }))}>
                    {T.soldOut}
                  </button>
                )}
                <button type="button" className={`${act} w-12 flex-none grid place-items-center px-0`} style={actIdle} aria-label={`${T.remove} ${it.name}`}
                  disabled={busy !== null}
                  onClick={() => run({ action: 'off', product_id: it.id }, () => ({ msg: T.isOff(it.name), undo: [{ action: 'on', product_id: it.id, restore: prevOn(it.id) }] }))}>
                  <X className="w-5 h-5" strokeWidth={2.4} />
                </button>
              </div>
            </article>
          ))}
          {Array.from({ length: Math.max(0, state.limits.special - onSpecials.length) }).map((_, i) => (
            <button key={`e${i}`} type="button" onClick={() => { setQuery(''); setSheet({ type: 'library' }); }}
              className="min-h-[300px] rounded-[8px] flex flex-col items-center justify-center gap-2.5 font-semibold text-[16px] active:bg-white/5"
              style={{ border: '1.5px dashed #ffffff30', color: K.sub }}>
              <span className="w-14 h-14 rounded-full grid place-items-center" style={{ border: '1.5px solid #ffffff40', color: K.ink }}>
                <Plus className="w-7 h-7" strokeWidth={2} />
              </span>
              {T.putSpecial}
              {i === 0 && <small className="font-medium text-[13px]" style={{ color: K.mute }}>{T.fromLibrary}</small>}
            </button>
          ))}
        </div>

        {/* Sopas */}
        <SectionTitle title={T.soups} meta={T.soupsMeta} />
        <div className="grid gap-[18px] mt-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {onSoups.map((it, idx) => (
            <article key={it.id} className="relative rounded-[6px] flex flex-col px-[18px] pt-5 pb-3.5 min-h-[156px]"
              style={cardStyle(it.out, idx % 2 ? 0.5 : -0.6)}>
              <span aria-hidden className="absolute inset-[7px] rounded-[3px] pointer-events-none" style={{ border: '1px solid #1E2A4420' }} />
              <Clip w={44} />
              <div className="flex items-start gap-2 min-h-[24px]">
                <span className={serif.className} style={{ fontStyle: 'italic', fontWeight: 600, color: K.red, fontSize: 19, lineHeight: 1, opacity: it.out ? 0.45 : 1 }}>
                  {it.always ? T.everyDay : T.soupOfDay}
                </span>
                <span className="ml-auto">
                  {it.out ? <Stamp T={T} cutoff={cutoff} small /> : it.always ? (
                    <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: K.navySub }}>
                      <Lock className="w-3.5 h-3.5" strokeWidth={2.4} />{T.fixed}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className={`${serif.className} uppercase mt-1.5 truncate`} style={{ fontWeight: 700, fontSize: 22, letterSpacing: '.035em', opacity: it.out ? 0.45 : 1 }}>{it.name}</div>
              <div className="flex gap-2 mt-auto pt-3">
                {it.out ? (
                  <button type="button" className={`${act} flex-1`} style={actSolid} disabled={busy !== null}
                    onClick={() => run({ action: 'back', product_id: it.id }, () => ({ msg: T.isBack(it.name), undo: [{ action: 'out', product_id: it.id }] }))}>
                    {T.back}
                  </button>
                ) : (
                  <button type="button" className={`${act} flex-1`} style={actIdle} disabled={busy !== null}
                    onClick={() => run({ action: 'out', product_id: it.id }, () => ({ msg: T.isOut(it.name, cutoff), undo: [{ action: 'back', product_id: it.id }] }))}>
                    {T.soldOut}
                  </button>
                )}
                {!it.always && (
                  <button type="button" className={`${act} flex-none`} style={actIdle} disabled={busy !== null}
                    onClick={() => setSheet({ type: 'soup', replace: it.id })}>
                    {T.change}
                  </button>
                )}
              </div>
            </article>
          ))}
          {Array.from({ length: Math.max(0, state.limits.soup - onSoups.length) }).map((_, i) => (
            <button key={`s${i}`} type="button" onClick={() => setSheet({ type: 'soup', replace: null })}
              className="min-h-[156px] rounded-[8px] flex items-center justify-center gap-3 font-semibold text-[16px] active:bg-white/5"
              style={{ border: '1.5px dashed #ffffff30', color: K.sub }}>
              <span className="w-12 h-12 rounded-full grid place-items-center" style={{ border: '1.5px solid #ffffff40', color: K.ink }}>
                <Plus className="w-6 h-6" strokeWidth={2} />
              </span>
              <span className="text-left">{T.putSoup}<small className="block font-medium text-[13px]" style={{ color: K.mute }}>{T.fromSoups}</small></span>
            </button>
          ))}
        </div>
      </div>

      {/* Aviso con Deshacer */}
      {toast && (
        <div role="status" className="absolute left-1/2 -translate-x-1/2 bottom-[max(18px,env(safe-area-inset-bottom))] h-14 rounded-2xl flex items-center gap-3.5 pl-5 pr-2 max-w-[calc(100%-32px)]"
          style={{ background: K.paper, color: K.navy, boxShadow: '0 18px 40px #000a' }}>
          <span className="font-semibold text-[16px] truncate">
            {toast.kick && <i className={serif.className} style={{ color: K.red, fontSize: 19, fontWeight: 600 }}>{toast.kick} </i>}
            {toast.msg}
          </span>
          {toast.undo && toast.undo.length > 0 ? (
            <button type="button" onClick={() => undo(toast.undo as Op[])} className="h-11 px-[18px] rounded-[11px] font-bold flex-none"
              style={{ background: K.navy, color: K.paper }}>{T.undo}</button>
          ) : <span className="w-2" />}
        </div>
      )}

      {/* Biblioteca / sopas */}
      {sheet && (
        <>
          <button type="button" aria-label="Cerrar" className="absolute inset-0 z-10" style={{ background: '#0009' }} onClick={() => setSheet(null)} />
          <aside className="absolute z-20 right-0 top-0 bottom-0 w-full sm:w-[540px] flex flex-col" style={{ background: K.paper, color: K.navy, boxShadow: '-20px 0 50px #0008' }}>
            <div className="px-6 pt-6 pb-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className={serif.className} style={{ fontStyle: 'italic', fontWeight: 600, color: K.red, fontSize: 22, lineHeight: 1 }}>
                  {sheet.type === 'library' ? T.library : T.soupOfDay}
                </div>
                <h3 className={`${serif.className} truncate`} style={{ fontWeight: 700, fontSize: 34, lineHeight: 1.05, marginTop: 4 }}>
                  {sheet.type === 'library' ? T.addSpecial
                    : sheet.replace ? T.changeSoup(byId.get(sheet.replace)?.name ?? '') : T.chooseSoup}
                </h3>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setSheet(null)} className="w-12 h-12 rounded-full grid place-items-center flex-none"
                style={{ border: '1px solid #1E2A4422' }}><X className="w-5 h-5" strokeWidth={2.4} /></button>
            </div>

            {sheet.type === 'library' ? (
              <>
                <div className="px-6">
                  <label className="h-[52px] rounded-xl flex items-center gap-2.5 px-4" style={{ background: '#fff', border: '1px solid #1E2A4422' }}>
                    <Search className="w-5 h-5 flex-none" style={{ color: K.navySub }} />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={T.search}
                      className="flex-1 min-w-0 bg-transparent outline-none text-[16px]" style={{ color: K.navy }} />
                  </label>
                  <div className="flex gap-2 mt-3 mb-1">
                    {(['recent', 'az'] as const).map((s) => (
                      <button key={s} type="button" onClick={() => setSort(s)} className="h-10 px-4 rounded-full font-semibold text-[14.5px]"
                        style={sort === s ? { background: K.navy, color: K.paper } : { border: '1px solid #1E2A4422' }}>
                        {s === 'recent' ? T.recent : T.az}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 pb-6">
                  {libList.map((it) => {
                    const full = !it.on && onSpecials.length >= state.limits.special;
                    return (
                      <button key={it.id} type="button" disabled={it.on || busy !== null}
                        onClick={async () => {
                          if (full) { showToast({ msg: T.full(state.limits.special) }); return; }
                          setSheet(null);
                          await run({ action: 'on', product_id: it.id }, () => ({ msg: T.isOn(it.name), kick: it.label, undo: [{ action: 'off', product_id: it.id, restore: prevOn(it.id) }] }));
                        }}
                        className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left min-h-[72px] active:bg-black/5"
                        style={{ borderBottom: '1px solid #1E2A4412', opacity: it.on ? 0.5 : 1 }}>
                        <div className="min-w-0 flex-1">
                          {it.label && <div className={serif.className} style={{ fontStyle: 'italic', color: K.red, fontSize: 17, fontWeight: 600, lineHeight: 1 }}>{it.label}</div>}
                          <div className={`${serif.className} uppercase`} style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.1, letterSpacing: '.03em', marginTop: 3 }}>{it.name}</div>
                          <div className="text-[12.5px] font-semibold mt-0.5" style={{ color: K.navySub }}>{it.on ? T.onBoard : usedLabel(it.lastOn, state.day, en, T)}</div>
                        </div>
                        <div className={serif.className} style={{ fontWeight: 700, fontSize: 21, fontVariantNumeric: 'lining-nums' }}>{money(it.price)}</div>
                        <span className="w-11 h-11 rounded-full grid place-items-center flex-none"
                          style={it.on ? { border: `1.5px solid ${K.navy}` } : { background: K.navy, color: K.paper }}>
                          {it.on ? '✓' : <Plus className="w-5 h-5" strokeWidth={2.4} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain grid grid-cols-2 gap-2.5 content-start px-6 pb-6 pt-2">
                {soups.filter((s) => !s.always).map((s) => (
                  <button key={s.id} type="button" disabled={s.on || busy !== null}
                    onClick={async () => {
                      const replace = sheet.replace;
                      setSheet(null);
                      if (replace) {
                        await run({ action: 'swap', product_id: s.id, replace_id: replace }, () => ({
                          msg: T.isOn(s.name), kick: T.soupOfDay, undo: [{ action: 'swap', product_id: replace, replace_id: s.id, restore: prevOn(replace, s.id) }],
                        }));
                      } else {
                        await run({ action: 'on', product_id: s.id }, () => ({ msg: T.isOn(s.name), kick: T.soupOfDay, undo: [{ action: 'off', product_id: s.id, restore: prevOn(s.id) }] }));
                      }
                    }}
                    className={`${serif.className} h-16 rounded-xl uppercase text-left px-3.5 flex items-center justify-between gap-2`}
                    style={s.on ? { background: K.navy, color: K.paper, fontWeight: 700, fontSize: 16.5, letterSpacing: '.03em' }
                      : { background: '#fff', border: '1px solid #1E2A4422', fontWeight: 700, fontSize: 16.5, letterSpacing: '.03em' }}>
                    <span className="leading-[1.1]">{s.name}</span>
                    {s.on && <span className="normal-case text-[12px] font-semibold font-sans opacity-70">{T.today2}</span>}
                  </button>
                ))}
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

function SectionTitle({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <h2 className="text-[13px] font-bold tracking-[.14em] uppercase" style={{ color: K.sub }}>{title}</h2>
      <span className="text-[13px] font-semibold" style={{ color: K.mute }}>{meta}</span>
      <span className="flex-1 h-px self-center" style={{ background: '#ffffff12' }} />
    </div>
  );
}
