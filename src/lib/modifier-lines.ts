/**
 * Las opciones elegidas de un plato, escritas como se dicen en la cocina: una línea por
 * cosa, cada una con su precio (Pedro 2026-11-13).
 *
 *   Eggs: Over Hard
 *     with Swiss cheese        $1.50
 *   Sweet Potato Fries         $1.50
 *     with Mozzarella cheese   $1.50
 *   Side Bacon / Crispy        $7.95
 *
 * Antes cada lugar listaba solo el nombre de la opción ("Swiss · Mozzarella · Crispy ·
 * Split") y nadie sabía dónde iba cada cosa. Cada grupo dice cómo se escribe:
 *   ticket_label  — plantilla con {option} ("with {option} cheese"). Vacía = el nombre tal cual.
 *   ticket_layout — 'line' | 'indent' | 'inline' (se pega a la opción de la que depende;
 *                   si no depende de nada, al nombre del plato: "Cheeseburger Deluxe").
 * Un grupo condicional (depends_on_option_id) siempre va debajo de la opción que lo abre.
 *
 * Lo usan el carrito y el checkout (con los grupos del producto) y /api/orders, que guarda
 * el resultado en order_items.modifier_lines para el Counter y el ticket.
 */
import type { ModifierSelection } from '@/types';
import { dependencyIds } from '@/lib/conditional-modifiers';

export interface ModLine {
  text: string;
  /** Recargo por unidad (0 = no se muestra precio). */
  price: number;
  indent: boolean;
  /** Va pegada al nombre del plato ("Cheeseburger" + "Deluxe"), no como línea. */
  title?: boolean;
  /**
   * Sale de una pregunta opcional (bacon extra, pan, queso). El carrito y el checkout muestran
   * el recargo solo de estas; en "elegí uno" (tamaño, estilo) el precio es parte de la elección
   * y se ve en el total del plato (Pedro 2026-11-22). Cocina y ticket muestran todos.
   */
  addon?: boolean;
  /**
   * La opción elegida de una pregunta cuyas alternativas están en el nombre del plato
   * ("Pastrami or Corned Beef Omelette" → Pastrami). withTitle la usa para nombrar el
   * plato por lo que se pidió ("Pastrami Omelette") en vez de dejarla como línea chica.
   */
  choice?: { option: string; of: string[] };
}

export interface LineGroup {
  id: string;
  name: string;
  sort_order?: number | null;
  depends_on_option_id?: string | null;
  depends_on_option_ids?: string[] | null;
  ticket_label?: string | null;
  ticket_layout?: string | null;
  is_required?: boolean | null;
}

export interface LineOption {
  id: string;
  name: string;
  price_delta?: number | string | null;
}

export interface LineSelection {
  group: LineGroup;
  options: LineOption[];
  /** Todas las opciones de la pregunta (no solo las elegidas), para ver si el nombre del plato las lista. */
  allOptions?: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "with {option} cheese" + "Swiss" → "with Swiss cheese". Sin plantilla, el nombre tal cual. */
export function renderTicketLabel(template: string | null | undefined, rawOption: string): string {
  // "Deluxe — lettuce, tomato & choice of side": lo que va después de " — " le explica
  // la opción al cliente en el botón; la cocina solo necesita "Deluxe".
  const option = rawOption.split(' — ')[0].trim() || rawOption;
  const t = template?.trim();
  if (!t) return option;
  return t.includes('{option}') ? t.split('{option}').join(option) : `${t} ${option}`;
}

interface Node {
  text: string;
  price: number;
  indent: boolean;
  addon?: boolean;
  children: Node[];
  choice?: ModLine['choice'];
}

export function buildModLines(selections: LineSelection[]): ModLine[] {
  const sorted = [...selections]
    .filter((s) => s.options.length > 0)
    .sort((a, b) => (a.group.sort_order ?? 0) - (b.group.sort_order ?? 0));

  const roots: Node[] = [];
  const titles: Node[] = [];
  const nodeByOption = new Map<string, Node>();

  const place = (sel: LineSelection, parent: Node | null, top = false) => {
    const layout = sel.group.ticket_layout ?? 'line';
    const addon = sel.group.is_required === false;
    for (const o of sel.options) {
      const text = renderTicketLabel(sel.group.ticket_label, o.name);
      const price = Number(o.price_delta) || 0;
      // Inline sin padre = se pega al nombre del plato. Lo que dependa de esta opción
      // (el side del Deluxe) queda como línea normal, sin sangría.
      if (top && layout === 'inline') {
        const node: Node = { text, price, indent: false, children: [] };
        titles.push(node);
        nodeByOption.set(o.id, node);
        continue;
      }
      if (parent && layout === 'inline') {
        parent.text += ` / ${text}`;
        parent.price = round2(parent.price + price);
        if (addon && price > 0) parent.addon = true;
        nodeByOption.set(o.id, parent);
        continue;
      }
      const node: Node = { text, price, indent: layout === 'indent', addon, children: [] };
      // Una sola elección, en una pregunta que no depende de otra, con 2+ alternativas.
      if (top && sel.options.length === 1 && (sel.allOptions?.length ?? 0) >= 2) {
        node.choice = { option: o.name, of: sel.allOptions as string[] };
      }
      (parent ? parent.children : roots).push(node);
      nodeByOption.set(o.id, node);
    }
  };

  // "Cualquiera de estas" (Cheese on Potatoes cuelga de Home Fries, French Fries…):
  // va debajo de la que esté elegida.
  const parentOf = (s: LineSelection) => {
    for (const d of dependencyIds(s.group)) {
      const n = nodeByOption.get(d);
      if (n) return n;
    }
    return undefined;
  };
  const isConditional = (s: LineSelection) => dependencyIds(s.group).length > 0;

  for (const sel of sorted) if (!isConditional(sel)) place(sel, null, true);

  // Condicionales: debajo de la opción que los abre. Puede haber cadenas (un condicional
  // que depende de otro), así que se repite hasta que no se pueda ubicar nada más; lo
  // que quede sin padre (datos raros) va como línea suelta, nunca se pierde.
  let pending = sorted.filter(isConditional);
  while (pending.length > 0) {
    // Ubicar y decidir qué queda pendiente en la MISMA pasada. Antes la lista de
    // pendientes se armaba antes de ubicar: en Deluxe → French Fries → Cheese on
    // Fries el queso encontraba padre en esta vuelta y se ubicaba otra vez en la
    // siguiente (línea repetida en ticket, Counter y email; ORD-261118-007).
    const next: LineSelection[] = [];
    for (const s of pending) {
      const parent = parentOf(s);
      if (parent) place(s, parent);
      else next.push(s);
    }
    if (next.length === pending.length) {
      for (const s of next) place(s, null);
      break;
    }
    pending = next;
  }

  const out: ModLine[] = [];
  const walk = (n: Node, depth: number) => {
    out.push({ text: n.text, price: n.price, indent: depth > 0 || n.indent, ...(n.addon ? { addon: true } : {}), ...(n.choice && depth === 0 ? { choice: n.choice } : {}) });
    for (const c of n.children) walk(c, depth + 1);
  };
  for (const t of titles) out.push({ text: t.text, price: t.price, indent: false, title: true });
  for (const t of titles) for (const c of t.children) walk(c, 0);
  for (const r of roots) walk(r, 0);
  return out;
}

/** Líneas de un ítem del carrito (los grupos vienen completos de /api/product-modifiers). */
export function cartModLines(selections: ModifierSelection[] | undefined): ModLine[] {
  return buildModLines(
    (selections ?? []).map((ms) => ({
      group: ms.group, options: ms.selectedOptions, allOptions: ms.group.options?.map((o) => o.name),
    })),
  );
}

/**
 * Líneas de un pedido ya guardado. Los pedidos nuevos traen la foto en modifier_lines;
 * los anteriores a este cambio caen al nombre de la opción con su precio.
 */
export function orderItemModLines(item: {
  modifier_lines?: unknown;
  order_item_modifiers?: { group_name?: string | null; option_name?: string | null; price_delta?: number | string | null }[];
}): ModLine[] {
  if (Array.isArray(item.modifier_lines)) {
    return (item.modifier_lines as Partial<ModLine>[])
      .filter((l) => typeof l?.text === 'string' && l.text)
      .map((l) => ({
        text: l.text as string, price: Number(l.price) || 0, indent: !!l.indent,
        ...(l.title ? { title: true } : {}),
        ...(isChoice(l.choice) ? { choice: l.choice } : {}),
      }));
  }
  return (item.order_item_modifiers ?? [])
    .filter((m) => m.option_name)
    .map((m) => ({ text: m.option_name as string, price: Number(m.price_delta) || 0, indent: false }));
}

/**
 * "Cheeseburger" + líneas → título "Cheeseburger Deluxe" y el resto de las líneas.
 * El recargo de lo que va al título se suma al precio del plato (sale de las líneas).
 */
export function withTitle(name: string, lines: ModLine[]): { name: string; lines: ModLine[]; price: number } {
  // "Pastrami or Corned Beef Omelette" + Pastrami → "Pastrami Omelette" (Pedro 2026-11-20:
  // la elección quedaba como línea chica debajo y no se notaba qué carne era).
  let base = name;
  let chosen: ModLine | undefined;
  for (const l of lines) {
    if (!l.choice) continue;
    const renamed = nameWithChoice(name, l.choice.option, l.choice.of);
    if (renamed) { base = renamed; chosen = l; break; }
  }
  const parts = lines.filter((l) => l.title);
  if (parts.length === 0 && !chosen) return { name, lines, price: 0 };
  return {
    name: [base, ...parts.map((p) => p.text)].join(' '),
    lines: lines.filter((l) => !l.title && l !== chosen),
    price: linesTotal(chosen ? [...parts, chosen] : parts),
  };
}

function isChoice(c: unknown): c is { option: string; of: string[] } {
  if (!c || typeof c !== 'object') return false;
  const { option, of } = c as { option?: unknown; of?: unknown };
  return typeof option === 'string' && Array.isArray(of) && of.every((x) => typeof x === 'string');
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Lo que puede haber entre dos alternativas del nombre: ", ", " or ", ", or ", " o ", " / ". */
const SEPARATOR = /^(\s*,\s*|\s*,?\s+(or|o)\s+|\s*\/\s*)$/i;

/**
 * Si el nombre del plato lista las alternativas de la pregunta, lo reescribe con la elegida:
 *   "Pastrami or Corned Beef Omelette", Pastrami               → "Pastrami Omelette"
 *   "Tomato or V8 Juice", Tomato Juice                         → "Tomato Juice"
 *   "Bacon, Sausage, Ham or Turkey Sausage", Ham               → "Ham"
 *   "Cereal with Seasonal Berries or Fruit Salad", Fruit Salad → "Cereal with Fruit Salad"
 * Cada alternativa tiene que estar en el nombre (entera, o sus primeras palabras: "Tomato"
 * de "Tomato Juice") y entre una y otra solo puede haber comas, "or"/"o" o "/". Si algo no
 * cuadra devuelve null y el plato se muestra como siempre: nombre + línea.
 */
export function nameWithChoice(name: string, chosen: string, alternatives: string[]): string | null {
  if (alternatives.length < 2 || !alternatives.includes(chosen)) return null;
  const spans: { start: number; end: number }[] = [];
  for (const alt of alternatives) {
    const words = alt.split(' — ')[0].trim().split(/\s+/);
    let span: { start: number; end: number } | null = null;
    for (let k = words.length; k >= 1 && !span; k--) {
      // Sin lookbehind: Safari de iOS < 16.4 no lo soporta y esto corre también en el carrito.
      const m = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRe(words.slice(0, k).join(' '))})(?=$|[^\\p{L}\\p{N}])`, 'iu').exec(name);
      if (m) span = { start: m.index + m[1].length, end: m.index + m[1].length + m[2].length };
    }
    if (!span) return null;
    spans.push(span);
  }
  spans.sort((a, b) => a.start - b.start);
  for (let i = 1; i < spans.length; i++) {
    if (spans[i].start < spans[i - 1].end) return null;
    if (!SEPARATOR.test(name.slice(spans[i - 1].end, spans[i].start))) return null;
  }
  const option = chosen.split(' — ')[0].trim();
  const out = `${name.slice(0, spans[0].start)}${option}${name.slice(spans[spans.length - 1].end)}`
    // "Tomato or V8 Juice" + "V8 Juice" no deja "V8 Juice Juice".
    .replace(new RegExp('(^|[^\\p{L}\\p{N}])([\\p{L}\\p{N}]+)\\s+\\2(?=$|[^\\p{L}\\p{N}])', 'giu'), '$1$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return out || null;
}

/**
 * Para la página de seguimiento del cliente: "Cheeseburger Deluxe" y sus líneas con
 * precio, igual que el carrito. Va en la respuesta pública (no hay datos privados).
 */
export function customerItemLines(item: Parameters<typeof orderItemModLines>[0] & { product?: { name?: string | null } | null }) {
  const { name, lines } = withTitle(item.product?.name ?? '', orderItemModLines(item));
  return { display_name: name || null, lines: lines.map(({ text, price, indent }) => ({ text, price, indent })) };
}

/** Suma de los recargos (para mostrar el precio base del plato = unitario − esto). */
export function linesTotal(lines: ModLine[]): number {
  return round2(lines.reduce((s, l) => s + l.price, 0));
}

/**
 * Formato para el ticket térmico: "texto\tprecio". La app Android ≥1.0.3 parte en el
 * tab y alinea el precio a la derecha según el ancho de SU papel (la web no lo conoce).
 */
export function ticketModifierStrings(lines: ModLine[], money: (n: number) => string): string[] {
  return lines.map((l) => `${l.indent ? '  ' : ''}${l.text}${l.price > 0 ? `\t${money(l.price)}` : ''}`);
}
