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

export interface ModLine {
  text: string;
  /** Recargo por unidad (0 = no se muestra precio). */
  price: number;
  indent: boolean;
  /** Va pegada al nombre del plato ("Cheeseburger" + "Deluxe"), no como línea. */
  title?: boolean;
}

export interface LineGroup {
  id: string;
  name: string;
  sort_order?: number | null;
  depends_on_option_id?: string | null;
  ticket_label?: string | null;
  ticket_layout?: string | null;
}

export interface LineOption {
  id: string;
  name: string;
  price_delta?: number | string | null;
}

export interface LineSelection {
  group: LineGroup;
  options: LineOption[];
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
  children: Node[];
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
        nodeByOption.set(o.id, parent);
        continue;
      }
      const node: Node = { text, price, indent: layout === 'indent', children: [] };
      (parent ? parent.children : roots).push(node);
      nodeByOption.set(o.id, node);
    }
  };

  for (const sel of sorted) if (!sel.group.depends_on_option_id) place(sel, null, true);

  // Condicionales: debajo de la opción que los abre. Puede haber cadenas (un condicional
  // que depende de otro), así que se repite hasta que no se pueda ubicar nada más; lo
  // que quede sin padre (datos raros) va como línea suelta, nunca se pierde.
  let pending = sorted.filter((s) => s.group.depends_on_option_id);
  while (pending.length > 0) {
    const next = pending.filter((s) => !nodeByOption.has(s.group.depends_on_option_id as string));
    for (const s of pending) {
      const parent = nodeByOption.get(s.group.depends_on_option_id as string);
      if (parent) place(s, parent);
    }
    if (next.length === pending.length) {
      for (const s of next) place(s, null);
      break;
    }
    pending = next;
  }

  const out: ModLine[] = [];
  const walk = (n: Node, depth: number) => {
    out.push({ text: n.text, price: n.price, indent: depth > 0 || n.indent });
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
    (selections ?? []).map((ms) => ({ group: ms.group, options: ms.selectedOptions })),
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
  const parts = lines.filter((l) => l.title);
  if (parts.length === 0) return { name, lines, price: 0 };
  return {
    name: [name, ...parts.map((p) => p.text)].join(' '),
    lines: lines.filter((l) => !l.title),
    price: linesTotal(parts),
  };
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
