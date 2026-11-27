'use client';

/**
 * Pestaña "Menú" del Counter (auditoría 2026-11-21, maqueta aprobada en
 * .specify/docs/counter-auditoria/menu-maqueta.html).
 * Marcar "Se acabó" a pantalla completa: antes era una caja de 256 px dentro del panel lateral,
 * difícil de leer y de scrollear. Categorías a la izquierda (300 px) con buscador y "Agotados N",
 * filas de 76 px y botón fijo a la derecha. Cada toque deja "Deshacer": un scroll mal hecho
 * no puede sacar un plato del menú sin que se note.
 * Sopas y especiales no están acá: se manejan en "Hoy".
 * Fase B: "Se acabó" pregunta hasta cuándo — "Hasta mañana" (products.in_stock_until = próximo
 * corte del día; lo devuelve el cron daily-reset) o "Hasta que lo vuelva a poner" (sin fecha).
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ban, Lock, Moon, Pencil, Search, Sun, X } from 'lucide-react';
import { cutoffLabel } from '@/lib/daily-menu';
import { PriceDialog, postPrice, relockTablet } from './PriceDialog';
import { PinPad } from './OwnerPanelButton';
import { C, type CounterText } from './ui';

interface MenuCat { id: string; name: string; group: string | null }
interface MenuItem {
  id: string; name: string; price: number; in_stock: boolean; category_id: string;
  /** Agotado con vuelta automática: cuándo vuelve. null = no vuelve solo (o está a la venta). */
  until: string | null;
}
/** El globo de "Se acabó…": el plato y dónde está su botón. */
interface Pop { item: MenuItem; rect: { top: number; bottom: number; right: number } }
type Mode = { kind: 'all' } | { kind: 'out' } | { kind: 'search'; q: string };
interface Toast { text: string; tone: 'ok' | 'error'; undo?: () => void }

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Marca en negrita la parte del nombre que coincide con la búsqueda. */
function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? norm(text).indexOf(norm(q)) : -1;
  // Si quitar tildes cambia el largo (tildes ya descompuestas), los índices no coinciden: no se resalta.
  if (i < 0 || norm(text).length !== text.length) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-extrabold underline decoration-2 underline-offset-[3px]" style={{ color: C.ink }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Fila de un plato. Memo con props estables (rendimiento, Galaxy Tab A11 2026-11-24):
 * con ~400 platos, re-dibujar todas las filas en cada cambio de categoría activa o en
 * cada polling trababa el scroll. Así solo se re-dibuja la fila que cambió.
 */
const MenuRow = memo(function MenuRow({ p, sub, busy, query, cut, T, fmt, onPrice, onAskOut, onBack }: {
  p: MenuItem; sub?: string; busy: boolean; query: string; cut: string; T: CounterText; fmt: Intl.NumberFormat;
  onPrice: (p: MenuItem) => void;
  onAskOut: (p: MenuItem, rect: Pop['rect']) => void;
  onBack: (p: MenuItem) => void;
}) {
  const out = !p.in_stock;
  return (
    <div className="relative min-h-[76px] flex items-center gap-3 min-[600px]:gap-4 py-2.5 pr-3 pl-4 min-[600px]:pl-5 [&+&]:border-t"
      style={{ borderColor: C.line, boxShadow: out ? `inset 4px 0 0 ${C.destructive}` : undefined }}>
      <div className="flex-1 min-w-0">
        <p className="text-[18px] min-[600px]:text-[20px] font-semibold leading-tight" style={{ color: out ? C.sub : C.ink }}>
          <Highlight text={p.name} q={query} />
        </p>
        {out ? (
          <span className="inline-flex items-center gap-1.5 mt-1.5 min-h-[28px] py-0.5 px-2.5 rounded-lg text-[14px] font-bold uppercase tracking-[.02em] leading-tight"
            style={{ background: C.warnBg, color: C.destructive }}>
            {!p.until && <Lock className="w-3.5 h-3.5 flex-none" strokeWidth={2.6} />}
            {p.until ? T.mChipAuto(cut) : T.mChipManual}
          </span>
        ) : sub ? (
          <p className="mt-1 text-[15px] truncate" style={{ color: C.sub }}>{sub}</p>
        ) : null}
      </div>
      <button type="button" onClick={() => onPrice(p)} aria-label={`${T.pEdit(p.name)} · ${fmt.format(p.price)}`} aria-haspopup="dialog"
        className="hidden min-[520px]:inline-flex flex-none items-center justify-end gap-1.5 min-w-[104px] h-12 px-3 rounded-xl text-[17px] font-semibold tabular-nums"
        style={{ color: C.ink, boxShadow: `inset 0 0 0 1px ${C.line}` }}>
        {fmt.format(p.price)}
        <Pencil className="w-4 h-4 flex-none" strokeWidth={2.2} style={{ color: C.sub }} aria-hidden />
      </button>
      <button type="button" disabled={busy} aria-haspopup={out ? undefined : 'dialog'}
        onClick={(e) => {
          if (out) { onBack(p); return; }
          const r = e.currentTarget.getBoundingClientRect();
          onAskOut(p, { top: r.top, bottom: r.bottom, right: r.right });
        }}
        className="flex-none w-[128px] min-[600px]:w-[168px] h-14 rounded-[14px] text-[16px] min-[600px]:text-[17px] font-bold disabled:opacity-60"
        style={out ? { background: C.inverse, color: C.onInverse } : { background: C.fill, color: C.ink }}>
        {out ? T.mBack : T.mOutBtn}
      </button>
    </div>
  );
});

/**
 * memo: el Counter se re-renderiza con sus relojes y el polling de pedidos, y nada de
 * eso le importa al Menú (sus props son estables: T y currency fijos, onGoToday con
 * useCallback en CounterView).
 */
export const MenuView = memo(function MenuView({ T, currency, onGoToday }: {
  T: CounterText; currency: string;
  /** Lleva a "Hoy". Solo si la tienda tiene sopas o especiales del día. */
  onGoToday?: () => void;
}) {
  const [cats, setCats] = useState<MenuCat[] | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: 'all' });
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  // En "Agotados", lo que se vuelve a poner queda en la lista hasta salir de la vista:
  // si la fila desapareciera, la de abajo subiría justo debajo del dedo.
  // id → si tenía vuelta automática (para mostrarlo en su grupo de "Agotados").
  const [kept, setKept] = useState<Map<string, boolean>>(new Map());
  const [cutoff, setCutoff] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  // Tanda 3: el plato cuyo precio se está cambiando, y el "Deshacer" que necesita PIN de nuevo.
  const [priceItem, setPriceItem] = useState<MenuItem | null>(null);
  const [undoPin, setUndoPin] = useState<(() => void) | null>(null);
  const itemsRef = useRef<MenuItem[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingRef = useRef(0);
  // Sube en cada guardado: una respuesta del polling que salió antes de un cambio se descarta.
  const versionRef = useRef(0);
  /** Última respuesta del menú que se aplicó, y con qué versión local. */
  const lastApplied = useRef<{ text: string; v: number } | null>(null);
  const spyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const railRefs = useRef<Map<string, HTMLElement>>(new Map());
  const chipRefs = useRef<Map<string, HTMLElement>>(new Map());
  const skipSpy = useRef(false);

  const fmt = useMemo(() => {
    try { return new Intl.NumberFormat(T.locale, { style: 'currency', currency: currency || 'USD' }); }
    catch { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }); }
  }, [T.locale, currency]);

  const load = useCallback(async () => {
    const v = versionRef.current;
    try {
      const res = await fetch('/api/counter/menu', { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const text = await res.text();
      // Si hay un cambio guardándose, o hubo uno desde que salió el pedido, no se pisa:
      // la respuesta puede traer el estado de antes del toque.
      if (pendingRef.current > 0 || versionRef.current !== v) return;
      // Igual a la última aplicada y sin cambios locales desde entonces: no se toca nada
      // (si no, el polling de cada minuto re-dibujaba los ~400 platos sin motivo).
      if (lastApplied.current && lastApplied.current.text === text && lastApplied.current.v === v) {
        setLoadFailed(false);
        return;
      }
      const data = JSON.parse(text) as { categories: MenuCat[]; products: MenuItem[]; cutoff: string | null };
      lastApplied.current = { text, v };
      setCats(data.categories);
      setItems(data.products);
      setCutoff(data.cutoff);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, []);

  // Otra tablet (o el panel) puede agotar un plato: se refresca cada minuto y al volver a la app.
  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(spyTimer.current); }, []);

  const showToast = useCallback((t: Toast) => {
    clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), t.undo ? 8000 : 5000);
  }, []);

  // En el render (no en un efecto): la reversión de save() siempre parte de lo que está en pantalla.
  itemsRef.current = items;

  /**
   * Guarda in_stock para varios platos. Cambia la pantalla al instante y revierte lo que falle.
   * auto (solo al agotar): vuelve solo en el próximo corte del día; si no, hasta que lo vuelvan a poner.
   */
  const save = useCallback(async (ids: string[], inStock: boolean, auto = false): Promise<boolean> => {
    if (ids.length === 0) return true;
    const idSet = new Set(ids);
    const before = new Map(itemsRef.current.filter((p) => idSet.has(p.id)).map((p) => [p.id, { in_stock: p.in_stock, until: p.until }]));
    pendingRef.current += 1;
    versionRef.current += 1;
    setPending((prev) => new Set(Array.from(prev).concat(ids)));
    // Mientras el servidor calcula la hora exacta, cualquier texto sirve: solo importa si hay vuelta o no.
    const optimisticUntil = !inStock && auto ? 'pending' : null;
    setItems((prev) => prev.map((p) => (idSet.has(p.id) ? { ...p, in_stock: inStock, until: optimisticUntil } : p)));
    // undefined = falló; string | null = lo que guardó el servidor.
    const results = await Promise.all(ids.map((id) =>
      fetch('/api/products/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: id, in_stock: inStock, ...(!inStock && auto ? { until: 'next_cutoff' } : {}) }),
      })
        .then(async (r) => (r.ok ? (((await r.json()) as { in_stock_until?: string | null }).in_stock_until ?? null) : undefined))
        .catch(() => undefined),
    ));
    const saved = new Map(ids.map((id, i) => [id, results[i]]));
    setItems((prev) => prev.map((p) => {
      if (!saved.has(p.id)) return p;
      const r = saved.get(p.id);
      if (r === undefined) return { ...p, ...(before.get(p.id) ?? {}) };
      return { ...p, until: inStock ? null : r };
    }));
    pendingRef.current -= 1;
    setPending((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    return results.every((r) => r !== undefined);
  }, []);

  const fail = useCallback(() => showToast({ text: T.mFailed, tone: 'error' }), [showToast, T]);

  const en = T.locale.startsWith('en');
  const cut = cutoffLabel(cutoff, en);

  const markOut = useCallback(async (p: MenuItem, auto: boolean) => {
    setPop(null);
    if (!(await save([p.id], false, auto))) return fail();
    showToast({
      text: auto ? T.mIsOutAuto(p.name, cut) : T.mIsOutManual(p.name), tone: 'ok',
      undo: async () => { setToast(null); if (!(await save([p.id], true))) fail(); },
    });
  }, [save, fail, showToast, T, cut]);

  const putBack = useCallback(async (p: MenuItem) => {
    const wasAuto = !!p.until;
    if (mode.kind === 'out') setKept((prev) => new Map(prev).set(p.id, wasAuto));
    if (!(await save([p.id], true))) return fail();
    showToast({
      text: T.mIsBack(p.name), tone: 'ok',
      undo: async () => { setToast(null); if (!(await save([p.id], false, wasAuto))) fail(); },
    });
  }, [mode.kind, save, fail, showToast, T]);

  // Callbacks estables para MenuRow (memo): putBack cambia con la vista; la fila llama al último por ref.
  const putBackRef = useRef(putBack);
  putBackRef.current = putBack;
  const onBack = useCallback((p: MenuItem) => { void putBackRef.current(p); }, []);
  const askOut = useCallback((p: MenuItem, rect: Pop['rect']) => setPop({ item: p, rect }), []);

  const catById = useMemo(() => new Map((cats ?? []).map((c) => [c.id, c])), [cats]);
  const byCat = useMemo(() => {
    const m = new Map<string, MenuItem[]>();
    for (const p of items) {
      const arr = m.get(p.category_id);
      if (arr) arr.push(p); else m.set(p.category_id, [p]);
    }
    return m;
  }, [items]);
  const outItems = useMemo(() => items.filter((p) => !p.in_stock), [items]);
  const outCount = outItems.length;

  const putAllBack = useCallback(async () => {
    if (outItems.length === 0) return;
    const autoIds = outItems.filter((p) => p.until).map((p) => p.id);
    const manualIds = outItems.filter((p) => !p.until).map((p) => p.id);
    setKept((prev) => {
      const n = new Map(prev);
      autoIds.forEach((id) => n.set(id, true));
      manualIds.forEach((id) => n.set(id, false));
      return n;
    });
    if (!(await save(autoIds.concat(manualIds), true))) return fail();
    showToast({
      text: T.mAllBack(outItems.length), tone: 'ok',
      undo: async () => {
        setToast(null);
        const ok = await Promise.all([save(autoIds, false, true), save(manualIds, false, false)]);
        if (!ok.every(Boolean)) fail();
      },
    });
  }, [outItems, save, fail, showToast, T]);

  // ── Tanda 3: precios ──
  const setLocalPrice = useCallback((id: string, price: number) => {
    versionRef.current += 1; // una respuesta del polling que salió antes no pisa el precio nuevo
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, price } : p)));
  }, []);

  // El PIN de precios desbloquea la tablet 10 min (device_sessions.panel_unlocked_until) y eso
  // abre más que precios. Por eso, si se puso el PIN acá, se vuelve a bloquear al terminar:
  // al cerrar el diálogo, o al vencer el "Deshacer" (8 s) si se guardó.
  const pinUsedRef = useRef(false);
  const relockTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const markPinUsed = useCallback(() => { pinUsedRef.current = true; }, []);
  const relockSoon = useCallback((ms: number) => {
    clearTimeout(relockTimer.current);
    relockTimer.current = setTimeout(() => {
      if (!pinUsedRef.current) return;
      pinUsedRef.current = false;
      relockTablet();
    }, ms);
  }, []);
  useEffect(() => () => {
    clearTimeout(relockTimer.current);
    if (pinUsedRef.current) relockTablet(); // salir de la pestaña también lo cierra
  }, []);

  const undoPrice = useCallback(async (p: MenuItem, oldPrice: number, newPrice: number) => {
    setToast(null);
    clearTimeout(relockTimer.current);
    const r = await postPrice(p.id, oldPrice, newPrice, { isUndo: true, confirmBig: true });
    if (r.kind === 'pin') {
      // Ya se había bloqueado: se pide el PIN de nuevo y se reintenta.
      setUndoPin(() => () => { setUndoPin(null); markPinUsed(); void undoPrice(p, oldPrice, newPrice); });
      return;
    }
    relockSoon(0);
    if (r.kind === 'ok') { setLocalPrice(p.id, r.price); showToast({ text: T.pDone(p.name, fmt.format(r.price)), tone: 'ok' }); return; }
    if (r.kind === 'changed') { setLocalPrice(p.id, r.price); showToast({ text: T.pChanged(fmt.format(r.price)), tone: 'error' }); return; }
    fail();
  }, [setLocalPrice, showToast, fail, markPinUsed, relockSoon, T, fmt]);

  const onPriceSaved = useCallback((p: MenuItem, oldPrice: number, newPrice: number) => {
    setPriceItem(null);
    setLocalPrice(p.id, newPrice);
    showToast({ text: T.pDone(p.name, fmt.format(newPrice)), tone: 'ok', undo: () => { void undoPrice(p, oldPrice, newPrice); } });
    relockSoon(8500); // después del "Deshacer"
  }, [setLocalPrice, showToast, undoPrice, relockSoon, T, fmt]);

  // Símbolo de la moneda de la tienda para el campo del precio ("$").
  const symbol = useMemo(() => fmt.formatToParts(0).find((x) => x.type === 'currency')?.value ?? '$', [fmt]);

  // Lo que muestra la lista en "Agotados" y en la búsqueda.
  const flatList = useMemo(() => {
    if (mode.kind === 'out') return items.filter((p) => !p.in_stock || kept.has(p.id));
    if (mode.kind === 'search') {
      const q = norm(mode.q.trim());
      return q ? items.filter((p) => norm(p.name).includes(q)) : [];
    }
    return [];
  }, [mode, items, kept]);

  // Categorías agrupadas como en la carta (Breakfast, Lunch, Dinner…).
  const groups = useMemo(() => {
    // Por nombre de grupo, en el orden en que aparece: si dos grupos comparten orden, no se repite el título.
    const byName = new Map<string, { name: string | null; cats: MenuCat[] }>();
    for (const c of cats ?? []) {
      const key = c.group ?? `__${c.id}`;
      const g = byName.get(key);
      if (g) g.cats.push(c); else byName.set(key, { name: c.group, cats: [c] });
    }
    return Array.from(byName.values());
  }, [cats]);
  // Mismo orden en el riel, en la lista y en el scroll-spy.
  const ordered = useMemo(() => groups.flatMap((g) => g.cats), [groups]);

  // Categoría activa según el scroll (la última cuyo título ya pasó el borde de arriba).
  // Una vez por cuadro (rAF): el evento scroll llega muchas veces por cuadro y cada pasada
  // medía todas las secciones. Las secciones están en el mismo orden que `ordered`, así que
  // se corta en la primera que todavía no llegó arriba.
  const spyRaf = useRef(0);
  const onListScroll = useCallback(() => {
    if (spyRaf.current) return;
    spyRaf.current = requestAnimationFrame(() => {
      spyRaf.current = 0;
      if (mode.kind !== 'all' || skipSpy.current) return;
      const list = listRef.current;
      if (!list) return;
      const top = list.getBoundingClientRect().top + 24;
      let current = ordered[0]?.id ?? null;
      for (const c of ordered) {
        const el = sectionRefs.current.get(c.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top > top) break;
        current = c.id;
      }
      setActiveCat(current);
    });
  }, [mode.kind, ordered]);
  useEffect(() => () => cancelAnimationFrame(spyRaf.current), []);

  // La categoría activa siempre a la vista en el riel (o en la fila de categorías en el celular).
  // Uno de los dos está oculto (display:none) y ahí scrollIntoView no hace nada.
  useEffect(() => {
    if (!activeCat) return;
    railRefs.current.get(activeCat)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    chipRefs.current.get(activeCat)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeCat]);

  const goToCat = (id: string) => {
    const wasAll = mode.kind === 'all';
    setMode({ kind: 'all' });
    setActiveCat(id);
    const jump = () => {
      const el = sectionRefs.current.get(id);
      const list = listRef.current;
      if (!el || !list) return;
      skipSpy.current = true;
      list.scrollTo({ top: el.offsetTop - 8, behavior: wasAll ? 'smooth' : 'auto' });
      clearTimeout(spyTimer.current);
      spyTimer.current = setTimeout(() => { skipSpy.current = false; }, 600);
    };
    if (wasAll) jump(); else requestAnimationFrame(() => requestAnimationFrame(jump));
  };

  // Cada cambio de vista arranca arriba: si no, la lista queda en el scroll de la vista anterior
  // (a mitad de los resultados, o el riel marcando una categoría que no es la visible).
  const resetScroll = () => { listRef.current?.scrollTo({ top: 0 }); setActiveCat(null); };
  const setQuery = (q: string) => {
    resetScroll();
    setMode(q ? { kind: 'search', q } : { kind: 'all' });
  };
  const toggleOut = () => {
    resetScroll();
    if (mode.kind === 'out') { setMode({ kind: 'all' }); return; }
    setKept(new Map());
    setMode({ kind: 'out' });
  };


  const rawQuery = mode.kind === 'search' ? mode.q : '';
  const query = rawQuery.trim();
  // Antes del primer scroll, la activa es la primera.
  const shownCat = activeCat ?? ordered[0]?.id ?? null;

  // ── Fila de un plato ──
  const row = (p: MenuItem, sub?: string) => (
    <MenuRow key={p.id} p={p} sub={sub} busy={pending.has(p.id)} query={query} cut={cut} T={T} fmt={fmt}
      onPrice={setPriceItem} onAskOut={askOut} onBack={onBack} />
  );

  const card = (children: React.ReactNode) => (
    <div className="rounded-[22px] overflow-hidden mt-2" style={{ background: C.surface }}>{children}</div>
  );

  const head = (title: React.ReactNode, meta: string, crumb?: string | null, action?: React.ReactNode) => (
    <div className="flex items-baseline gap-3 min-h-[48px] pt-2 flex-wrap">
      {crumb && <span className="text-[17px] font-medium" style={{ color: C.sub }}>{crumb} ›</span>}
      <h2 className="text-[22px] min-[600px]:text-[26px] font-bold tracking-[-0.02em]" style={{ color: C.ink }}>{title}</h2>
      <span className="ml-auto text-[16px]" style={{ color: C.sub }}>{meta}</span>
      {action}
    </div>
  );

  const searchBox = (
    <label className="relative flex items-center gap-2.5 h-14 rounded-[14px] px-3.5 focus-within:ring-2"
      style={{ background: C.surface, boxShadow: `inset 0 0 0 1px ${C.lineStrong}`, ['--tw-ring-color' as string]: C.ink }}>
      <Search className="w-5 h-5 flex-none" strokeWidth={2.2} style={{ color: C.sub }} />
      <input value={rawQuery} onChange={(e) => setQuery(e.target.value)} placeholder={T.mSearch} aria-label={T.mSearch}
        className="flex-1 min-w-0 bg-transparent outline-none text-[18px]" style={{ color: C.ink }} />
      {rawQuery && (
        <button type="button" onClick={() => setQuery('')} aria-label={T.close}
          className="flex-none w-11 h-11 -mr-2 rounded-full inline-flex items-center justify-center" style={{ background: C.fill, color: C.ink }}>
          <X className="w-4 h-4" strokeWidth={2.4} />
        </button>
      )}
    </label>
  );

  const outButton = (
    <button type="button" onClick={toggleOut} aria-pressed={mode.kind === 'out'}
      className="flex items-center gap-2.5 h-14 rounded-[14px] px-3.5 text-[18px] font-semibold whitespace-nowrap"
      style={{ background: C.surface, color: C.ink, boxShadow: mode.kind === 'out' ? `inset 0 0 0 2px ${C.destructive}` : undefined }}>
      <Ban className="w-5 h-5 flex-none" strokeWidth={2.4} style={{ color: C.destructive }} />
      {T.mOut}
      {outCount > 0 && (
        <span className="ml-auto min-w-[24px] h-6 px-[7px] rounded-xl inline-flex items-center justify-center text-[14px] font-bold tabular-nums"
          style={{ background: C.destructive, color: '#fff' }}>
          {outCount}
        </span>
      )}
    </button>
  );

  // ── Estados de carga ──
  if (!cats) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-6" style={{ background: C.bg }}>
        <p className="text-[18px] font-medium" style={{ color: C.sub }}>{loadFailed ? T.mLoadFailed : T.mLoading}</p>
        {loadFailed && (
          <button type="button" onClick={load} className="h-14 px-6 rounded-[14px] text-[17px] font-bold" style={{ background: C.inverse, color: C.onInverse }}>
            {T.mRetry}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0 flex flex-col min-[880px]:flex-row" style={{ background: C.bg }}>
      {/* Riel de categorías (tablet horizontal y más ancho). */}
      <aside className="hidden min-[880px]:flex flex-none w-[300px] flex-col gap-2.5 pt-4 pb-4 pl-4 pr-3 border-r" style={{ borderColor: C.line }}>
        {searchBox}
        {outButton}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain mt-1 -mr-1 pr-1" aria-label={T.menuTab}>
          {groups.map((g, gi) => (
            <div key={`${g.name ?? ''}-${gi}`}>
              {g.name && (
                <p className="px-3 pt-3 pb-1 text-[14px] font-semibold uppercase tracking-[.04em]" style={{ color: C.sub }}>{g.name}</p>
              )}
              {g.cats.map((c) => {
                const list = byCat.get(c.id) ?? [];
                const o = list.filter((p) => !p.in_stock).length;
                const on = mode.kind === 'all' && shownCat === c.id;
                return (
                  <button key={c.id} type="button" onClick={() => goToCat(c.id)} aria-current={on ? 'true' : undefined}
                    ref={(el) => { if (el) railRefs.current.set(c.id, el); else railRefs.current.delete(c.id); }}
                    className="w-full min-h-[52px] flex items-center gap-2 px-3 py-1.5 rounded-xl text-left text-[17px] font-semibold leading-tight"
                    style={{ color: C.ink, ...(on ? { background: C.surface, boxShadow: `inset 4px 0 0 ${C.ink}` } : {}) }}>
                    <span className="min-w-0">{c.name}</span>
                    {o > 0 && (
                      <span className="flex-none inline-flex items-center gap-0.5 text-[15px] font-bold tabular-nums" style={{ color: C.destructive }}>
                        <Ban className="w-3.5 h-3.5" strokeWidth={2.6} />{o}
                      </span>
                    )}
                    <span className="ml-auto flex-none text-[16px] font-medium tabular-nums" style={{ color: C.sub }}>{list.length}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        {onGoToday && (
          <button type="button" onClick={onGoToday} className="flex items-start gap-2 border-t pt-3.5 px-3 text-left text-[15px] leading-snug"
            style={{ borderColor: C.line, color: C.sub }}>
            <Sun className="w-4 h-4 mt-0.5 flex-none" strokeWidth={2.2} />
            <span>{T.mTodayHint} <b style={{ color: C.ink }}>{T.mTodayLink} ›</b></span>
          </button>
        )}
      </aside>

      {/* Celular y tablet vertical: buscador + agotados arriba y categorías en una fila que se desliza. */}
      <div className="min-[880px]:hidden flex-none flex flex-col gap-2 px-4 pt-2 pb-2">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          {searchBox}
          {outButton}
        </div>
        <div className="flex gap-2 overflow-x-auto overscroll-x-contain -mx-4 px-4 pb-1 [scrollbar-width:none]">
          {ordered.map((c) => {
            const on = mode.kind === 'all' && shownCat === c.id;
            return (
              <button key={c.id} type="button" onClick={() => goToCat(c.id)}
                ref={(el) => { if (el) chipRefs.current.set(c.id, el); else chipRefs.current.delete(c.id); }}
                className="flex-none h-11 px-4 rounded-full text-[16px] font-semibold whitespace-nowrap"
                style={on ? { background: C.inverse, color: C.onInverse } : { background: C.fill, color: C.ink }}>
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      <main ref={listRef} onScroll={onListScroll}
        className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 min-[880px]:px-5 pt-2 min-[880px]:pt-4"
        style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 6rem))' }}>
        {mode.kind === 'out' ? (
          <>
            {head(T.mOut, T.mItems(flatList.filter((p) => !p.in_stock).length), null,
              outCount > 0 ? (
                <button type="button" onClick={putAllBack} disabled={pending.size > 0} className="ml-2 h-12 px-[18px] rounded-xl text-[16px] font-bold" style={{ background: C.fill, color: C.ink }}>
                  {T.mBackAll}
                </button>
              ) : null)}
            {flatList.length === 0
              ? <p className="py-12 text-center text-[18px] font-medium" style={{ color: C.sub }}>{T.mNoneOut}</p>
              : (() => {
                // Lo vuelto a poner queda en el grupo donde estaba (kept guarda si tenía vuelta automática).
                const isAuto = (p: MenuItem) => (p.in_stock ? !!kept.get(p.id) : !!p.until);
                const autoList = flatList.filter(isAuto);
                const manualList = flatList.filter((p) => !isAuto(p));
                const section = (title: string, list: MenuItem[], first: boolean) => list.length === 0 ? null : (
                  <div key={title} className={first ? 'mt-2' : 'mt-4'}>
                    {card(<>
                      <p className="px-5 pt-3.5 pb-1 text-[14px] font-semibold uppercase tracking-[.04em]" style={{ color: C.sub }}>{title}</p>
                      {list.map((p) => row(p, catById.get(p.category_id)?.name))}
                    </>)}
                  </div>
                );
                return <>{section(T.mSecAuto(cut), autoList, true)}{section(T.mSecManual, manualList, autoList.length === 0)}</>;
              })()}
          </>
        ) : mode.kind === 'search' ? (
          <>
            {head(`“${mode.q.trim()}”`, T.mResults(flatList.length))}
            {flatList.length === 0
              ? <p className="py-12 text-center text-[18px] font-medium" style={{ color: C.sub }}>{T.mNoResults}</p>
              : card(flatList.map((p) => row(p, catById.get(p.category_id)?.name)))}
          </>
        ) : (
          ordered.map((c, i) => {
            const list = byCat.get(c.id) ?? [];
            const o = list.filter((p) => !p.in_stock).length;
            return (
              <section key={c.id} ref={(el) => { if (el) sectionRefs.current.set(c.id, el); else sectionRefs.current.delete(c.id); }}
                className={i > 0 ? 'mt-4' : undefined}>
                {head(c.name, o > 0 ? T.mItemsOut(list.length, o) : T.mItems(list.length), c.group)}
                {card(list.map((p) => row(p)))}
              </section>
            );
          })
        )}
      </main>

      {pop && (
        <SoldOutPop T={T} cut={cut} pop={pop} onClose={() => setPop(null)}
          onPick={(auto) => markOut(pop.item, auto)} />
      )}

      {priceItem && (
        <PriceDialog T={T} name={priceItem.name} productId={priceItem.id} price={priceItem.price} format={(n) => fmt.format(n)}
          symbol={symbol}
          onClose={() => { setPriceItem(null); relockSoon(0); }}
          onSaved={(oldPrice, newPrice) => onPriceSaved(priceItem, oldPrice, newPrice)}
          onChangedElsewhere={(price) => setLocalPrice(priceItem.id, price)}
          onPinUsed={markPinUsed} />
      )}

      {undoPin && (
        <PinPad en={en} title={T.pPinTitle} layer="z-[56]" onUnlocked={undoPin}
          onClose={() => { setUndoPin(null); showToast({ text: T.pNotUndone, tone: 'error' }); }} />
      )}

      {toast && (
        <div role="status" aria-live="polite"
          className="absolute z-20 left-4 min-[880px]:left-[316px] right-4 min-[880px]:right-auto max-w-[620px] rounded-2xl pl-5 pr-2 py-2 flex items-center gap-4 shadow-2xl"
          style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))', background: toast.tone === 'error' ? C.critical : C.inverse, color: toast.tone === 'error' ? C.onCritical : C.onInverse }}>
          <span className="flex-1 min-w-0 text-[17px] font-semibold py-2">{toast.text}</span>
          {toast.undo && (
            <button type="button" onClick={toast.undo} className="flex-none h-12 px-[18px] rounded-xl text-[16px] font-bold"
              style={{ background: 'color-mix(in srgb, currentColor 16%, transparent)' }}>
              {T.mUndo}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

/** Globo de "Se acabó…": hasta mañana (vuelve solo al corte) o hasta que lo vuelvan a poner. */
function SoldOutPop({ T, cut, pop, onClose, onPick }: {
  T: CounterText; cut: string; pop: Pop; onClose: () => void; onPick: (auto: boolean) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Debajo del botón, alineado a su borde derecho; si no entra abajo, arriba.
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(380, vw - 32);
  const left = Math.max(16, Math.min(pop.rect.right - width, vw - width - 16));
  const below = pop.rect.bottom + 8 + 210 < vh;
  const place: React.CSSProperties = below ? { top: pop.rect.bottom + 8 } : { bottom: vh - pop.rect.top + 8 };

  const opt = 'w-full min-h-[64px] mt-2 rounded-[14px] flex items-center gap-3.5 px-4 py-2.5 text-left';
  return (
    <>
      <button type="button" aria-label={T.close} onClick={onClose} className="fixed inset-0 z-40 cursor-default" style={{ background: 'rgba(0,0,0,.18)' }} />
      <div role="dialog" aria-modal="true" aria-label={T.mPopTitle(pop.item.name)}
        className="fixed z-[41] rounded-[20px] p-4"
        style={{ ...place, left, width, background: C.raised, color: C.ink, boxShadow: `0 0 0 1px ${C.raisedEdge}, 0 24px 48px rgba(0,0,0,.28)` }}>
        <h3 className="mx-1 mt-0.5 mb-1 text-[18px] font-bold leading-snug">{T.mPopTitle(pop.item.name)}</h3>
        <button type="button" onClick={() => onPick(true)} className={opt} style={{ background: C.inverse, color: C.onInverse }}>
          <Moon className="w-[22px] h-[22px] flex-none" strokeWidth={2.2} />
          <span>
            <strong className="block text-[18px]">{T.mTomorrow}</strong>
            <span className="block text-[15px] opacity-75 mt-0.5">{T.mTomorrowSub(cut)}</span>
          </span>
        </button>
        <button type="button" onClick={() => onPick(false)} className={opt} style={{ background: C.fill, color: C.ink }}>
          <Lock className="w-[22px] h-[22px] flex-none" strokeWidth={2.2} />
          <span>
            <strong className="block text-[18px]">{T.mManual}</strong>
            <span className="block text-[15px] opacity-75 mt-0.5">{T.mManualSub}</span>
          </span>
        </button>
      </div>
    </>
  );
}
