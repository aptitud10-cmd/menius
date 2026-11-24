"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Search, X, Plus, Check, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { tName } from "@/lib/i18n";
import { searchAddons } from "@/lib/addon-search";
import type { ModifierGroup, ModifierOption, Product } from "@/types";
import type { Translations, Locale } from "@/lib/translations";

interface AddonSearchProps {
  /** Grupo con display_type 'search': los agregados sin pregunta propia. */
  group: ModifierGroup;
  /** Las demás preguntas visibles del plato: lo que ya preguntan no se duplica. */
  otherGroups: ModifierGroup[];
  selected: ModifierOption[];
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
  onQueue?: (product: Product) => void;
  onUnqueue?: () => void;
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
  onToggle,
  onRevealGroup,
  onGoToNotes,
  onFocusInput,
  findOnMenu,
  queued = null,
  onQueue,
  onUnqueue,
  fmtPrice,
  t,
  locale,
  defaultLocale,
}: AddonSearchProps) {
  const [query, setQuery] = useState("");
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

  const title = tName(group, locale, defaultLocale);
  // Ejemplos del propio plato: en una burger "avocado, mushrooms, egg"; en
  // pancakes "nutella, walnuts…". Las tres primeras opciones del grupo.
  const examples = group.options
    .slice(0, 3)
    .map((o) => tName(o, locale, defaultLocale).toLowerCase())
    .join(", ");
  const trimmed = query.trim();
  const noResults = trimmed.length >= 2 && results.length === 0;
  const menuHits = useMemo(
    () => (noResults && findOnMenu ? findOnMenu(trimmed).slice(0, 2) : []),
    [noResults, findOnMenu, trimmed],
  );

  const isSelected = (o: ModifierOption) => selected.some((s) => s.id === o.id);

  return (
    <div className="px-5 pt-4">
      <div className="border-t border-gray-100 pt-4 mb-3">
        <h4 className="text-[17px] font-semibold leading-snug text-gray-900">
          <label htmlFor={inputId}>{title}</label>
        </h4>
        <p className="mt-1.5 text-[13px] text-gray-600">
          {locale === "es" ? "Opcional" : "Optional"}
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
            // Enter agrega el primer agregado encontrado; nunca envía nada.
            if (e.key !== "Enter") return;
            e.preventDefault();
            const first = results.find((r) => r.inSearchGroup);
            if (first && !isSelected(first.option)) {
              onToggle(group, first.option);
              setQuery("");
            }
          }}
          placeholder={t.addonSearchPlaceholder(examples)}
          aria-label={t.addonSearchLabel}
          aria-controls={resultsId}
          /* text-base (16px): con menos, iOS Safari hace zoom al enfocar. */
          className="w-full h-12 pl-11 pr-11 rounded-2xl border border-gray-200 bg-white text-base text-gray-900 placeholder:text-gray-500 transition-colors focus:outline-none focus:border-[#05c8a7] focus:ring-1 focus:ring-[#05c8a7] [&::-webkit-search-cancel-button]:hidden"
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
        {results.length > 0 && (
          <div className="mt-2 rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {results.map((r) => {
              const name = tName(r.option, locale, defaultLocale);
              if (!r.inSearchGroup) {
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
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-700 flex-shrink-0">
                      <ArrowUp className="w-4 h-4" aria-hidden="true" />
                      {t.addonSearchGoTo}
                    </span>
                  </button>
                );
              }
              const on = isSelected(r.option);
              const price = Number(r.option.price_delta);
              return (
                <button
                  key={r.option.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onToggle(group, r.option)}
                  className="w-full min-h-[52px] flex items-center gap-3 px-4 py-2.5 text-left text-gray-900 hover:bg-gray-50 active:bg-gray-100"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "w-[22px] h-[22px] rounded-md flex items-center justify-center flex-shrink-0 transition-colors",
                      on ? "bg-[#05c8a7]" : "border-2 border-gray-300 bg-white",
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
                    <span className="text-[15px] text-gray-700 tabular-nums flex-shrink-0">
                      {price > 0 ? "+" : ""}
                      {fmtPrice(price)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {menuHits.length > 0 && onQueue && (
          <div className="mt-2 rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {menuHits.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onQueue(p);
                  setQuery("");
                }}
                className="w-full min-h-[52px] flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] leading-snug text-gray-900 font-medium">
                    {tName(p, locale, defaultLocale)}
                  </span>
                  <span className="block text-[13px] leading-snug text-gray-600">
                    {t.addonSearchOnMenu} · {fmtPrice(Number(p.price))}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#047a65] flex-shrink-0">
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  {t.addonSearchAddAfter}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Una soda no va en las instrucciones del plato: si está en el menú, solo eso. */}
        {noResults && menuHits.length === 0 && (
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

      {queued && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[#e6faf7] px-4 py-2.5" role="status">
          <p className="flex-1 min-w-0 text-[14px] leading-snug text-[#04241E]">
            {t.addonSearchQueued(tName(queued, locale, defaultLocale))}
          </p>
          {onUnqueue && (
            <button
              type="button"
              onClick={onUnqueue}
              className="flex-shrink-0 min-h-[40px] px-2 text-[13px] font-semibold text-[#047a65] underline underline-offset-2"
            >
              {t.addonSearchUnqueue}
            </button>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={title}>
          {selected.map((o) => {
            const name = tName(o, locale, defaultLocale);
            const price = Number(o.price_delta);
            return (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onToggle(group, o)}
                  aria-label={t.addonSearchRemove(name)}
                  className="inline-flex items-center gap-1.5 min-h-[40px] pl-3.5 pr-2.5 rounded-full bg-[#05c8a7] text-[#04241E] text-[14px] font-semibold"
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
