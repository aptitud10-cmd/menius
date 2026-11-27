"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Search, X, Plus, Check, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tName } from "@/lib/i18n";
import { searchAddons } from "@/lib/addon-search";
import { quickPickStep } from "@/lib/quick-pick";
import type { ModifierGroup, ModifierOption, ModifierSelection, Product } from "@/types";
import type { Translations, Locale } from "@/lib/translations";

interface AddonSearchProps {
  /** Grupo con display_type 'search' (agregados sin pregunta propia). Puede no haber:
   *  el buscador igual encuentra los extras de las preguntas y lo del menú. */
  group: ModifierGroup | null;
  /** Las demás preguntas visibles del plato: lo que ya preguntan no se duplica. */
  otherGroups: ModifierGroup[];
  selected: ModifierOption[];
  /** Si una opción de otra pregunta del plato ya está elegida (bacon marcado desde acá). */
  isPicked?: (groupId: string, optionId: string) => boolean;
  onToggle: (group: ModifierGroup, option: ModifierOption) => void;
  /** Lleva a una pregunta de más arriba ("Ya está arriba · Would you like to add meat?"). */
  onRevealGroup: (groupId: string) => void;
  /** Sin resultado: al campo de "Special instructions", con lo escrito. */
  onGoToNotes: (query: string) => void;
  /** Al enfocar, subir el buscador para que el teclado no tape los resultados. */
  onFocusInput?: () => void;
  /** Sin agregado que encaje: lo que sí está en el menú (bebidas, sides, postres).
   *  "pepsi" en una burger → "Sodas — Pepsi, Sprite & more · Add after this". */
  findOnMenu?: (query: string) => Product[];
  /** Producto que se abre cuando el cliente agrega este plato. */
  queued?: Product | null;
  /** Con `selections` ya se eligió acá mismo (Sprite): va directo al carrito. */
  onQueue?: (product: Product, selections?: ModifierSelection[]) => void;
  onUnqueue?: () => void;
  /** Agotada u otra hora (grits después de las 11): no se ofrece al elegir acá. */
  isOptionAvailable?: (o: ModifierOption) => boolean;
  fmtPrice: (n: number) => string;
  t: Translations;
  locale: Locale;
  defaultLocale: string;
}

/**
 * "Add something else": el cliente escribe lo que quiere agregar (en inglés o
 * español, con errores) y aparece solo lo que encaja con este plato. Lo elegido
 * queda como chips con precio; se cobra y se imprime como cualquier opción.
 */
export function AddonSearch({
  group,
  otherGroups,
  selected,
  isPicked,
  onToggle,
  onRevealGroup,
  onGoToNotes,
  onFocusInput,
  findOnMenu,
  queued = null,
  onQueue,
  onUnqueue,
  isOptionAvailable,
  fmtPrice,
  t,
  locale,
  defaultLocale,
}: AddonSearchProps) {
  const [query, setQuery] = useState("");
  // Lo que se mandó directo al pedido desde acá (sin preguntas): se confirma abajo.
  const [sentToOrder, setSentToOrder] = useState<string[]>([]);
  // Producto del menú que se está eligiendo acá mismo (Sodas → Sprite).
  const [pick, setPick] = useState<PickState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const resultsId = useId();

  const results = useMemo(
    () => searchAddons(query, group, otherGroups),
    [query, group, otherGroups],
  );
  const groupById = useMemo(
    () => new Map(otherGroups.map((g) => [g.id, g])),
    [otherGroups],
  );

  // Ejemplos del propio plato: en una burger "avocado, mushrooms"; en pancakes
  // "nutella, walnuts". Del buscador del plato o, si no tiene, de sus extras.
  const exampleSource = group?.options.length
    ? group.options
    : otherGroups.filter((g) => !g.is_required).flatMap((g) => g.options);
  const examples = [
    ...exampleSource.slice(0, 2).map((o) => tName(o, locale, defaultLocale).toLowerCase()),
    ...(findOnMenu ? [t.addonSearchExampleDrink] : []),
  ].join(", ");
  const trimmed = query.trim();
  // Lo del menú sale siempre (no solo cuando no hay agregados): "fries" en una burger
  // encuentra el extra y también las papas como plato aparte.
  const menuHits = useMemo(
    () => (trimmed.length >= 2 && findOnMenu ? findOnMenu(trimmed).slice(0, 3) : []),
    [findOnMenu, trimmed],
  );
  const noResults = trimmed.length >= 2 && results.length === 0 && menuHits.length === 0;
  const needsChoices = (p: Product) =>
    (p.variants?.length ?? 0) > 0 || (p.extras?.length ?? 0) > 0 || !!p.has_modifiers;

  const isSelected = (o: ModifierOption) => selected.some((s) => s.id === o.id);

  // Con un resultado claro en el menú, los parecidos débiles del plato sobran:
  // "soda" no tiene que ofrecer "Soup" (sopa) en una cena.
  const onDish = menuHits.length > 0 ? results.filter((r) => r.score >= 60) : results;

  const toggleResult = (r: (typeof results)[number]) => {
    if (r.inSearchGroup) {
      if (group) onToggle(group, r.option);
      return;
    }
    const g = groupById.get(r.groupId);
    if (r.direct && g) onToggle(g, r.option);
    else onRevealGroup(r.groupId);
  };

  const available = isOptionAvailable ?? ((o: ModifierOption) => !o.sold_out);

  /** Lo agregado se confirma abajo: "Sodas (Sprite) added to your order". */
  const confirmAdded = (p: Product, chosen: ModifierOption[] = []) => {
    const short = tName(p, locale, defaultLocale).split(" — ")[0];
    const opts = chosen.map((o) => tName(o, locale, defaultLocale)).join(", ");
    setSentToOrder((prev) => [...prev, opts ? `${short} (${opts})` : short]);
  };

  /** Contesta el paso que toca; si ya no falta nada, al carrito. */
  const advance = (p: Product, groups: ModifierGroup[], picks: Record<string, ModifierOption[]>) => {
    const step = quickPickStep(groups, picks, available);
    if (step.kind === "ask") {
      setPick({ product: p, status: "ready", groups, picks, step });
      return;
    }
    setPick(null);
    if (step.kind === "full") {
      // Un plato con varias preguntas propias se abre entero después de este.
      onQueue?.(p);
      return;
    }
    onQueue?.(p, step.selections);
    confirmAdded(p, Object.values(picks).flat());
    setQuery("");
  };

  const startPick = (p: Product) => {
    if (pick?.product.id === p.id) {
      setPick(null);
      return;
    }
    setPick({ product: p, status: "loading", groups: [], picks: {}, step: null });
    loadModifiers(p.id)
      .then((data) => {
        // Formato viejo (variantes/extras sueltos): se elige en su propia hoja.
        if (data.variants.length > 0 || data.extras.length > 0) {
          setPick(null);
          onQueue?.(p);
          return;
        }
        advance(p, data.modifier_groups, {});
      })
      .catch(() => {
        setPick((cur) => (cur?.product.id === p.id ? { ...cur, status: "error" } : cur));
      });
  };

  return (
    <div className="px-5 pt-4">
      <div className="border-t border-gray-100 pt-4 mb-3">
        <h4 className="text-[17px] font-semibold leading-snug text-gray-900">
          <label htmlFor={inputId}>{t.addonSearchTitle}</label>
        </h4>
        <p className="mt-1.5 text-[13px] text-gray-600">
          {findOnMenu ? t.addonSearchSub : locale === "es" ? "Opcional" : "Optional"}
        </p>
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value.slice(0, 40))}
          onFocus={onFocusInput}
          onKeyDown={(e) => {
            // Enter marca el primer extra que se puede marcar desde acá; nunca envía nada.
            if (e.key !== "Enter") return;
            e.preventDefault();
            const first = onDish.find((r) => r.inSearchGroup || r.direct);
            const picked = first && (first.inSearchGroup ? isSelected(first.option) : !!isPicked?.(first.groupId, first.option.id));
            if (first && !picked) {
              toggleResult(first);
              setQuery("");
            }
          }}
          placeholder={t.addonSearchPlaceholder(examples)}
          aria-label={t.addonSearchLabel}
          aria-controls={resultsId}
          /* text-base (16px): con menos, iOS Safari hace zoom al enfocar. */
          className="w-full h-12 pl-11 pr-11 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-500 transition-colors focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label={t.addonSearchClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      <div id={resultsId} aria-live="polite">
        {onDish.length > 0 && (
          <>
            {menuHits.length > 0 && <p className={SECTION}>{t.addonSearchOnDish}</p>}
            <div className="mt-2 rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {onDish.map((r) => {
                const name = tName(r.option, locale, defaultLocale);
                if (!r.inSearchGroup && !r.direct) {
                  const group_ = groupById.get(r.groupId);
                  const question = group_ ? tName(group_, locale, defaultLocale) : "";
                  // Varias opciones de la misma pregunta ("queso" → American, Cheddar…):
                  // se nombra la pregunta, no una opción al azar.
                  const many = r.groupMatches > 1;
                  return (
                    <button
                      key={`${r.groupId}:${r.option.id}`}
                      type="button"
                      onClick={() => onRevealGroup(r.groupId)}
                      className="w-full min-h-[52px] flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] leading-snug text-gray-900 font-medium">
                          {many ? question : name}
                        </span>
                        <span className="block text-[13px] leading-snug text-gray-600">
                          {many ? t.addonSearchAboveShort : t.addonSearchAbove(question)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-700 shrink-0">
                        <ArrowUp className="w-4 h-4" aria-hidden="true" />
                        {t.addonSearchGoTo}
                      </span>
                    </button>
                  );
                }
                const on = r.inSearchGroup
                  ? isSelected(r.option)
                  : !!isPicked?.(r.groupId, r.option.id);
                const price = Number(r.option.price_delta);
                return (
                  <button
                    key={`${r.groupId}:${r.option.id}`}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleResult(r)}
                    className="w-full min-h-[52px] flex items-center gap-3 px-4 py-2.5 text-left text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors",
                        on ? "bg-brand-500" : "border-2 border-gray-300 bg-white",
                      )}
                    >
                      {on ? (
                        <Check className="w-3.5 h-3.5 text-[#04241E]" strokeWidth={3} />
                      ) : (
                        <Plus className="w-3.5 h-3.5 text-gray-400" strokeWidth={3} />
                      )}
                    </span>
                    <span className={cn("flex-1 min-w-0 text-[15px] leading-snug", on ? "font-semibold" : "font-medium")}>
                      {name}
                    </span>
                    {price !== 0 && (
                      <span className="text-[15px] text-gray-700 tabular-nums shrink-0">
                        {price > 0 ? "+" : ""}
                        {fmtPrice(price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {menuHits.length > 0 && onQueue && (
          <>
            <p className={SECTION}>{t.addonSearchToOrder}</p>
            <div className="mt-2 rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {menuHits.map((p) => {
                const choose = needsChoices(p);
                const open = pick?.product.id === p.id ? pick : null;
                const panelId = `${resultsId}-${p.id}`;
                return (
                  <div key={p.id}>
                    <button
                      type="button"
                      aria-expanded={choose ? !!open : undefined}
                      aria-controls={choose ? panelId : undefined}
                      onClick={() => {
                        if (choose) {
                          startPick(p);
                          return;
                        }
                        onQueue(p);
                        confirmAdded(p);
                        setQuery("");
                      }}
                      className="w-full min-h-[52px] flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] leading-snug text-gray-900 font-medium">
                          {tName(p, locale, defaultLocale)}
                        </span>
                        <span className="block text-[13px] leading-snug text-gray-600 tabular-nums">
                          {fmtPrice(Number(p.price))}
                        </span>
                      </span>
                      {open ? (
                        <span className="inline-flex items-center gap-1 min-h-[36px] px-3.5 rounded-full bg-gray-100 text-[14px] font-semibold text-gray-700 shrink-0">
                          <X className="w-4 h-4" aria-hidden="true" />
                          {t.addonSearchPickCancel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 min-h-[36px] px-3.5 rounded-full bg-[#e6faf7] text-[14px] font-semibold text-[#047a65] shrink-0">
                          <Plus className="w-4 h-4" aria-hidden="true" />
                          {t.addonSearchAddToOrder}
                        </span>
                      )}
                    </button>

                    {open && (
                      <div id={panelId} className="bg-gray-50 px-4 pt-1 pb-3.5">
                        {open.status === "loading" && (
                          <p className="flex items-center gap-2 min-h-[44px] text-[14px] text-gray-600" role="status">
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            {t.addonSearchPickLoading}
                          </p>
                        )}
                        {open.status === "error" && (
                          <button
                            type="button"
                            onClick={() => {
                              setPick(null);
                              startPick(p);
                            }}
                            className="min-h-[44px] text-left text-[14px] text-gray-700"
                          >
                            {t.addonSearchPickError}{" "}
                            <span className="font-semibold text-gray-900 underline underline-offset-2">
                              {t.addonSearchPickRetry}
                            </span>
                          </button>
                        )}
                        {open.status === "ready" && open.step && (
                          <div role="group" aria-labelledby={`${panelId}-q`}>
                            {Object.values(open.picks).flat().length > 0 && (
                              <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-[#047a65] font-semibold">
                                <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                                {Object.values(open.picks)
                                  .flat()
                                  .map((o) => tName(o, locale, defaultLocale))
                                  .join(" · ")}
                              </p>
                            )}
                            <p id={`${panelId}-q`} className="pt-2 text-[14px] font-semibold text-gray-900">
                              {tName(open.step.group, locale, defaultLocale)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {open.step.options.map((o) => {
                                const delta = Number(o.price_delta);
                                return (
                                  <button
                                    key={o.id}
                                    type="button"
                                    onClick={() =>
                                      advance(p, open.groups, { ...open.picks, [open.step!.group.id]: [o] })
                                    }
                                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full border border-gray-300 bg-white text-[15px] font-medium text-gray-900 hover:border-gray-900 active:bg-gray-100"
                                  >
                                    {tName(o, locale, defaultLocale)}
                                    {delta !== 0 && (
                                      <span className="text-[14px] text-gray-600 tabular-nums">
                                        {delta > 0 ? "+" : ""}
                                        {fmtPrice(delta)}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Una soda no va en las instrucciones del plato: si está en el menú, solo eso. */}
        {noResults && (
          <div className="mt-2 rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-[14px] text-gray-700">{t.addonSearchNone(trimmed)}</p>
            <button
              type="button"
              onClick={() => onGoToNotes(trimmed)}
              className="mt-1 text-[14px] font-semibold text-gray-900 underline underline-offset-2 hover:no-underline min-h-[44px]"
            >
              {t.addonSearchToNotes}
            </button>
          </div>
        )}
      </div>

      {sentToOrder.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#e6faf7] px-4 py-2.5" role="status">
          <Check className="w-4 h-4 text-[#047a65] shrink-0" strokeWidth={3} aria-hidden="true" />
          <p className="flex-1 min-w-0 text-[14px] leading-snug text-[#04241E]">
            {t.addonSearchSentToOrder(sentToOrder.join(", "))}
          </p>
        </div>
      )}

      {queued && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#e6faf7] px-4 py-2.5" role="status">
          <p className="flex-1 min-w-0 text-[14px] leading-snug text-[#04241E]">
            {t.addonSearchQueued(tName(queued, locale, defaultLocale))}
          </p>
          {onUnqueue && (
            <button
              type="button"
              onClick={onUnqueue}
              className="shrink-0 min-h-[40px] px-2 text-[13px] font-semibold text-[#047a65] underline underline-offset-2"
            >
              {t.addonSearchUnqueue}
            </button>
          )}
        </div>
      )}

      {group && selected.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={t.addonSearchTitle}>
          {selected.map((o) => {
            const name = tName(o, locale, defaultLocale);
            const price = Number(o.price_delta);
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onToggle(group, o)}
                  aria-label={t.addonSearchRemove(name)}
                  className="inline-flex items-center gap-1.5 min-h-[40px] pl-3.5 pr-2.5 rounded-full bg-brand-500 text-[#04241E] text-[14px] font-semibold"
                >
                  {name}
                  {price !== 0 && (
                    <span className="font-medium text-[#04241E]/80 tabular-nums">
                      {price > 0 ? "+" : ""}
                      {fmtPrice(price)}
                    </span>
                  )}
                  <X className="w-4 h-4" strokeWidth={2.5} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Título chico de cada lista: lo que va en el plato y lo que va al pedido. */
const SECTION = "mt-4 text-[12px] font-bold uppercase tracking-[0.06em] text-gray-600";

interface PickState {
  product: Product;
  status: "loading" | "ready" | "error";
  groups: ModifierGroup[];
  picks: Record<string, ModifierOption[]>;
  step: Extract<ReturnType<typeof quickPickStep>, { kind: "ask" }> | null;
}

interface LoadedModifiers {
  modifier_groups: ModifierGroup[];
  variants: unknown[];
  extras: unknown[];
}

// Las opciones de un producto no cambian mientras el cliente arma el pedido:
// abrir y cerrar la soda dos veces no vuelve a pedirlas.
const modifiersCache = new Map<string, Promise<LoadedModifiers>>();

function loadModifiers(productId: string): Promise<LoadedModifiers> {
  const cached = modifiersCache.get(productId);
  if (cached) return cached;
  const req = fetch(`/api/product-modifiers?productId=${encodeURIComponent(productId)}`)
    .then((r) => {
      if (!r.ok) throw new Error(`product-modifiers ${r.status}`);
      return r.json();
    })
    .then((data: Partial<LoadedModifiers>) => ({
      modifier_groups: Array.isArray(data?.modifier_groups) ? data.modifier_groups : [],
      variants: Array.isArray(data?.variants) ? data.variants : [],
      extras: Array.isArray(data?.extras) ? data.extras : [],
    }));
  // Un error no queda guardado: "Try again" vuelve a pedir.
  req.catch(() => modifiersCache.delete(productId));
  modifiersCache.set(productId, req);
  return req;
}
