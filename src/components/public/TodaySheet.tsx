"use client";

/**
 * "Hoja del día" (variante C, Pedro 2026-11-20): sopas y especiales de hoy arriba de
 * la portada del menú. Es la hojita crema que el diner mete dentro de la carta, con el
 * cartelito rojo en cursiva de las tarjetas reales ("Chef's Special"). Lo que se ve
 * acá lo pone el Counter en la pestaña "Hoy" (products.daily_kind + is_active) y se
 * va solo al corte de las 5 AM.
 *
 * Segunda vuelta (2 críticos, 2026-11-21): en el celular los especiales son filas
 * alineadas a la izquierda (centrados medían ~230 px cada uno y la hoja empujaba
 * "Popular items" 2 pantallas); las sopas fijas van en una línea; "+" verde sólido.
 * Tercera vuelta (crítico visual): todo alineado a la izquierda también en tablet y
 * computadora, y el "Today's Special" con el nombre más grande.
 * 2026-11-22 (Pedro + crítico, variante C2 en .specify/docs/especiales/titulos/): cada sección
 * abre con una banda oscura de cartel ("Soups of the day · 4 today", "Today's specials ·
 * 4 dishes") para que se note al entrar. Las sopas fijas pasan a ser filas iguales a las del
 * día, con la etiqueta "Every day" (Pedro: se veían más chicas y también se piden).
 */

import { Instrument_Serif } from "next/font/google";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { tName, tDesc } from "@/lib/i18n";
import type { Product } from "@/types";

// Cursiva solo para el cartelito. Sin precarga: el navegador la baja únicamente
// si hay un especial en pantalla (las tiendas sin especiales no la tocan).
const serifItalic = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  preload: false,
});

const C = {
  paper: "#FBF7EE",
  edge: "#EADFCB",
  red: "#B0232C",
  label: "#7A5A2E",
  leader: "#D9CBB0",
  band: "#21180F",
  bandText: "#FBF7EE",
  bandCount: "#E3C48E",
};

/** Banda de cartel que abre cada sección. El -mx iguala el padding de la hoja: va de borde a borde. */
function Band({ title, count }: { title: string; count: string }) {
  return (
    <div
      className="-mx-4 flex min-h-[40px] items-center justify-between gap-3 px-4 py-2 sm:-mx-8 sm:min-h-[52px] sm:px-8 sm:py-2.5"
      style={{ background: C.band }}
    >
      <h3 className="font-menu text-[1.3rem] leading-none sm:text-[1.85rem]" style={{ color: C.bandText }}>
        {title}
      </h3>
      <span
        className="flex-none text-[12px] font-semibold uppercase leading-none tracking-[0.1em] tabular-nums"
        style={{ color: C.bandCount }}
      >
        {count}
      </span>
    </div>
  );
}

const WEEKDAYS = {
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  es: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
};
const MONTHS = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
};

/** 'YYYY-MM-DD' → "Thursday, Nov 20". A mano (no Intl) para que servidor y navegador escriban lo mismo. */
function dayLabel(day: string, en: boolean): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return "";
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return en
    ? `${WEEKDAYS.en[wd]}, ${MONTHS.en[m - 1]} ${d}`
    : `${WEEKDAYS.es[wd]} ${d} de ${MONTHS.es[m - 1]}`;
}

export interface SoupSize {
  name: string;
  price: number;
}

/** Lo que justifica dibujar la hoja: especiales o sopas que rotan. Las fijas solas no
 *  son noticia (están todos los días en "Soups"). MenuShell usa lo mismo para el botón "Today". */
export function todayItemCount(products: Product[]): number {
  return products.filter((p) => p.daily_kind === "special" || (p.daily_kind === "soup" && !p.daily_always)).length;
}

interface TodaySheetProps {
  /** Productos ya "vivos" (agotados en tiempo real); se filtran acá los del día. */
  products: Product[];
  /** Día de trabajo del restaurante (corte 5 AM), calculado en el servidor. */
  day: string | null;
  soupSizes: SoupSize[] | null;
  locale: string;
  defaultLocale: string;
  fmtPrice: (n: number) => string;
  onOpen: (product: Product) => void;
}

/** "+" verde sólido. Decorativo: el botón es toda la fila. */
function AddDot({ big }: { big?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex flex-shrink-0 items-center justify-center rounded-full bg-[#047a65] text-white",
        big ? "h-9 w-9" : "h-8 w-8",
      )}
    >
      <Plus className={big ? "h-[18px] w-[18px]" : "h-4 w-4"} strokeWidth={2.5} />
    </span>
  );
}

export function TodaySheet({ products, day, soupSizes, locale, defaultLocale, fmtPrice, onOpen }: TodaySheetProps) {
  const en = locale !== "es";
  const T = en
    ? {
        today: "Today", soups: "Soups of the day", specials: "Today\u2019s specials", every: "Every day",
        out: "Sold out today", add: "Add",
        soupCount: (n: number) => `${n} today`, dishCount: (n: number) => `${n} ${n === 1 ? "dish" : "dishes"}`,
      }
    : {
        today: "Hoy", soups: "Sopas del día", specials: "Especiales de hoy", every: "Todos los días",
        out: "Agotado por hoy", add: "Agregar",
        soupCount: (n: number) => `${n} hoy`, dishCount: (n: number) => `${n} ${n === 1 ? "plato" : "platos"}`,
      };

  const soldLast = (a: Product, b: Product) => Number(a.in_stock === false) - Number(b.in_stock === false);
  const specials = products.filter((p) => p.daily_kind === "special").sort(soldLast);
  const rotating = products.filter((p) => p.daily_kind === "soup" && !p.daily_always).sort(soldLast);
  const fixed = products.filter((p) => p.daily_kind === "soup" && p.daily_always);
  if (specials.length === 0 && rotating.length === 0) return null;
  // Las del día primero (son la noticia), después las de todos los días; agotadas al final.
  const soups = [...rotating, ...fixed].sort(soldLast);
  const available = (list: Product[]) => list.filter((p) => p.in_stock !== false).length;

  const sizes = soupSizes ?? [];
  // Agotado: sin onClick y aria-disabled (no `disabled`, que lo saca del teclado y de algunos lectores).
  const open = (p: Product) => () => {
    if (p.in_stock !== false) onOpen(p);
  };

  return (
    <section
      aria-labelledby="today-sheet-title"
      className="mx-auto w-full max-w-[640px] rounded-2xl border px-4 pt-5 pb-3 sm:px-8 sm:pt-6 sm:pb-5"
      style={{
        background: C.paper,
        borderColor: C.edge,
        boxShadow: "0 1px 0 #E8DCC4, 0 8px 24px -16px rgba(60,40,10,.18)",
      }}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 id="today-sheet-title" className="font-menu text-[2rem] leading-none text-gray-950 sm:text-[2.4rem]">
          {T.today}
        </h2>
        {day && <p className="text-[14px] text-gray-600 sm:text-[15px]">{dayLabel(day, en)}</p>}
      </header>

      {soups.length > 0 && (
        <div className="mt-5 sm:mt-6">
          <Band title={T.soups} count={T.soupCount(available(soups))} />
          {sizes.length > 0 && (
            // Cada tamaño entero y separado por aire, sin "·": nunca queda un
            // separador huérfano ni "Extra Large Bowl" / "$10.85" partido.
            <p className="mt-3.5 flex flex-wrap gap-x-4 text-[14px] text-gray-700 tabular-nums">
              {sizes.map((s) => (
                <span key={s.name} className="whitespace-nowrap">
                  {s.name} <span className="font-semibold text-gray-950">{fmtPrice(s.price)}</span>
                </span>
              ))}
            </p>
          )}
          {soups.length > 0 && (
            <ul className="mt-2">
              {soups.map((p) => {
                const name = tName(p, locale, defaultLocale);
                const out = p.in_stock === false;
                const always = !!p.daily_always;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={open(p)}
                      aria-disabled={out || undefined}
                      className={cn(
                        "flex w-full min-h-[48px] items-center gap-2 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7]",
                        out && "cursor-default",
                      )}
                    >
                      {!out && <span className="sr-only">{T.add} </span>}
                      <span className={cn("text-[17px] font-semibold", out ? "text-gray-600" : "text-gray-950")}>{name}</span>
                      {always && (
                        <span className="flex-none whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.label }}>
                          {T.every}
                        </span>
                      )}
                      <span aria-hidden="true" className="mx-1 h-0 min-w-[16px] flex-1 translate-y-[3px] border-b-2 border-dotted" style={{ borderColor: C.leader }} />
                      {out ? (
                        <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[13px] font-semibold text-gray-700">{T.out}</span>
                      ) : (
                        <AddDot />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {specials.length > 0 && (
        <div className="mt-6">
          <Band title={T.specials} count={T.dishCount(available(specials))} />
          <ul>
          {specials.map((p) => {
            const name = tName(p, locale, defaultLocale);
            const desc = tDesc(p, locale, defaultLocale);
            const out = p.in_stock === false;
            // El "Today's Special" es la estrella de la tarjeta impresa: nombre más grande.
            const star = !out && /today'?s special/i.test(p.daily_label ?? "");
            return (
              <li key={p.id} className="border-t first:border-t-0" style={{ borderColor: C.edge }}>
                <button
                  type="button"
                  onClick={open(p)}
                  aria-disabled={out || undefined}
                  className={cn(
                    "flex w-full items-start gap-3 py-4 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#05c8a7] sm:gap-6 sm:py-5",
                    out && "cursor-default",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    {!out && <span className="sr-only">{T.add} </span>}
                    {p.daily_label && (
                      <span
                        className={cn(serifItalic.className, "block text-[1.15rem] leading-tight sm:text-[1.3rem]")}
                        style={{ color: out ? "#6b6460" : C.red }}
                      >
                        {p.daily_label}
                      </span>
                    )}
                    <span
                      className={cn(
                        "block font-menu",
                        star ? "text-[1.75rem] sm:text-[2rem]" : "text-[1.5rem] sm:text-[1.75rem]",
                        // Después del tamaño: tailwind-merge borra el leading si el tamaño viene detrás.
                        "leading-[1.1]",
                        out ? "text-gray-600" : "text-gray-950",
                      )}
                    >
                      {name}
                    </span>
                    {desc && !out && (
                      <span
                        className={cn(
                          "mt-1 max-w-[52ch] text-[14px] leading-snug text-gray-700 sm:mt-1.5 sm:text-[15px]",
                          star ? "line-clamp-4 sm:line-clamp-3" : "line-clamp-2",
                        )}
                      >
                        {desc}
                      </span>
                    )}
                  </span>
                  <span className="flex flex-shrink-0 flex-col items-end gap-2 pt-1 sm:pt-2">
                    {out ? (
                      <span className="whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[13px] font-semibold text-gray-700">{T.out}</span>
                    ) : (
                      <>
                        <span className="text-[16px] font-bold text-gray-950 tabular-nums sm:text-[18px]">{fmtPrice(p.price)}</span>
                        <AddDot big />
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          </ul>
        </div>
      )}
    </section>
  );
}
