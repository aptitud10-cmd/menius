/**
 * Buscador de agregados de la hoja del plato ("Add something else").
 *
 * Los agregados de un plato que no tienen pregunta propia viven en un grupo
 * normal con `display_type = 'search'`: precio, validación de la orden, ticket y
 * KDS funcionan igual que cualquier pregunta. Este módulo solo decide qué
 * aparece cuando el cliente escribe:
 *   - en inglés o español ("aguacate" → Avocado), con o sin tildes;
 *   - con errores de tipeo ("avocad", "bacn");
 *   - y, si lo que busca ya es una pregunta del plato ("Would you like to add
 *     meat?" → Bacon), lo manda ahí en vez de ofrecerlo dos veces.
 */

export interface SearchableOption {
  id: string;
  name: string;
  translations?: Record<string, { name?: string } | undefined> | null;
}

export interface AddonMatch<T extends SearchableOption> {
  option: T;
  /** Grupo al que pertenece la opción encontrada. */
  groupId: string;
  /** true = es una opción del buscador; false = ya está en otra pregunta del plato. */
  inSearchGroup: boolean;
  score: number;
  /** Cuántas opciones de esa pregunta encajaron ("queso" → American, Cheddar, Swiss…). */
  groupMatches: number;
}

/** Minúsculas, sin tildes ni signos: "Jalapeños" → "jalapenos". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Singular aproximado para comparar: "tomatoes" → "tomato", "huevos" → "huevo". */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('oes')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es') && !word.endsWith('ses')) return word.slice(0, -1);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Cómo lo pide la gente, por palabra clave del nombre en inglés. Genérico de
 * comida (sirve a cualquier restaurante): las claves se buscan dentro del
 * nombre normalizado de la opción.
 */
const SYNONYMS: Record<string, string[]> = {
  avocado: ['aguacate', 'palta', 'guacamole'],
  bacon: ['tocino', 'tocineta', 'beicon', 'panceta'],
  ham: ['jamon'],
  sausage: ['salchicha', 'chorizo', 'longaniza'],
  turkey: ['pavo'],
  chicken: ['pollo'],
  beef: ['res', 'carne'],
  pastrami: ['carne'],
  salami: ['salame'],
  gyro: ['shawarma'],
  lox: ['salmon ahumado', 'nova', 'salmon'],
  egg: ['huevo', 'huevos'],
  onion: ['cebolla', 'cebollas'],
  scallion: ['cebollin', 'cebolleta', 'cebollino', 'green onion', 'cebolla verde'],
  pepper: ['pimiento', 'pimenton', 'aji', 'morron'],
  mushroom: ['hongo', 'hongos', 'champinon', 'champinones', 'seta', 'setas'],
  spinach: ['espinaca', 'espinacas'],
  broccoli: ['brocoli'],
  jalapeno: ['jalapeno', 'picante', 'chile', 'spicy'],
  tomato: ['tomate', 'tomates', 'jitomate'],
  lettuce: ['lechuga'],
  olive: ['aceituna', 'aceitunas', 'oliva'],
  cheese: ['queso', 'quesos'],
  // Quesos que se cargan sin la palabra "cheese" ("American", "Swiss").
  american: ['american cheese', 'queso americano'],
  cheddar: ['cheddar cheese', 'queso cheddar'],
  swiss: ['swiss cheese', 'queso suizo'],
  mozzarella: ['mozzarella cheese', 'queso mozzarella', 'mozarella', 'mozarela'],
  'pepper jack': ['pepper jack cheese', 'queso pepper jack', 'queso picante'],
  provolone: ['provolone cheese', 'queso provolone'],
  feta: ['feta cheese', 'queso feta'],
  'cream cheese': ['queso crema', 'philadelphia'],
  pancake: ['panqueque', 'hotcake', 'hot cake', 'panqueca'],
  'french toast': ['tostada francesa', 'pan frances'],
  fruit: ['fruta', 'frutas'],
  nutella: ['chocolate'],
  chocolate: ['chocolate', 'chispas'],
  oreo: ['galleta'],
  coconut: ['coco'],
  walnut: ['nuez', 'nueces'],
};

interface Term {
  text: string;
  /**
   * false = sinónimo de una sola palabra del nombre ("tocino" para Turkey
   * Bacon): encuentra, pero no empata con la opción que es exactamente eso.
   */
  full: boolean;
}

function termsOf(opt: SearchableOption): Term[] {
  const terms = new Map<string, boolean>();
  const add = (text: string, full: boolean) => {
    if (text && !terms.get(text)) terms.set(text, full);
  };
  const base = normalize(opt.name);
  add(base, true);
  for (const tr of Object.values(opt.translations ?? {})) {
    if (tr?.name) add(normalize(tr.name), true);
  }
  const stemmedWords = base.split(' ').map(stem).join(' ');
  const stemmed = ` ${stemmedWords} `;
  for (const [key, words] of Object.entries(SYNONYMS)) {
    // Palabra entera: "ham" no es "graham"; "pepper" no es el queso Pepper Jack.
    if (!stemmed.includes(` ${key} `)) continue;
    if (key === 'pepper' && stemmed.includes(' pepper jack')) continue;
    for (const w of words) add(normalize(w), stemmedWords === key);
  }
  return Array.from(terms, ([text, full]) => ({ text, full }));
}

/** Palabras con que se puede encontrar una opción: nombre, español y sinónimos. */
export function searchTerms(opt: SearchableOption): string[] {
  return termsOf(opt).map((t) => t.text);
}

/** Distancia de edición con tope: corta apenas supera `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Errores tolerados según el largo de lo escrito: 4+ letras → 1, 7+ → 2. */
function typoBudget(len: number): number {
  if (len >= 7) return 2;
  if (len >= 4) return 1;
  return 0;
}

/**
 * Qué tan bien una búsqueda encaja con una opción. 0 = no encaja.
 * Empieza igual > palabra que empieza igual > contiene > con un error.
 */
export function matchScore(query: string, opt: SearchableOption): number {
  const q = normalize(query);
  if (q.length < 2) return 0;
  const qWords = q.split(' ').map(stem);
  let best = 0;
  for (const { text: term, full } of termsOf(opt)) {
    // Un sinónimo parcial encuentra la opción pero queda debajo de la exacta:
    // "tocino" → Bacon primero, Turkey Bacon después.
    const cap = (score: number) => (full ? score : Math.min(score, 70));
    const words = term.split(' ').map(stem);
    const joined = words.join(' ');
    if (joined === qWords.join(' ')) {
      if (full) return 100;
      best = Math.max(best, cap(100));
    }
    if (joined.startsWith(qWords.join(' '))) best = Math.max(best, cap(90));
    // Cada palabra escrita empieza alguna palabra del término ("turk bac" → Turkey Bacon).
    if (qWords.every((qw) => words.some((w) => w.startsWith(qw)))) best = Math.max(best, cap(80));
    if (q.length >= 3 && term.includes(q)) best = Math.max(best, cap(60));
    // Errores de tipeo, palabra por palabra.
    const fuzzy = qWords.every((qw) => {
      const budget = typoBudget(qw.length);
      if (budget === 0) return words.some((w) => w.startsWith(qw));
      return words.some(
        (w) =>
          editDistance(qw, w, budget) <= budget ||
          // "avocad" contra "avocado": prefijo con error.
          (w.length > qw.length && editDistance(qw, w.slice(0, qw.length), budget) <= budget),
      );
    });
    if (fuzzy) best = Math.max(best, 40);
  }
  return best;
}

export interface SearchGroupInput<T extends SearchableOption> {
  id: string;
  options: T[];
}

/**
 * Resultados para lo escrito: primero lo que ya pregunta el plato (para no
 * duplicarlo), después los agregados del buscador, cada lista por puntaje.
 * Una opción del buscador con el mismo nombre que una pregunta del plato no se
 * repite: gana la pregunta, que es donde el plato la cobra.
 */
export function searchAddons<T extends SearchableOption>(
  query: string,
  searchGroup: SearchGroupInput<T>,
  otherGroups: SearchGroupInput<T>[],
  limit = 6,
): AddonMatch<T>[] {
  if (normalize(query).length < 2) return [];
  const above: AddonMatch<T>[] = [];
  for (const g of otherGroups) {
    for (const option of g.options) {
      const score = matchScore(query, option);
      if (score > 0) above.push({ option, groupId: g.id, inSearchGroup: false, score, groupMatches: 1 });
    }
  }
  const takenNames = new Set(above.map((m) => normalize(m.option.name)));
  const own: AddonMatch<T>[] = [];
  for (const option of searchGroup.options) {
    if (takenNames.has(normalize(option.name))) continue;
    const score = matchScore(query, option);
    if (score > 0) own.push({ option, groupId: searchGroup.id, inSearchGroup: true, score, groupMatches: 1 });
  }
  const byScore = (a: AddonMatch<T>, b: AddonMatch<T>) => b.score - a.score;
  // Una pregunta del plato aparece una sola vez aunque encajen varias opciones.
  const aboveByGroup = new Map<string, AddonMatch<T>>();
  for (const m of above.sort(byScore)) {
    const first = aboveByGroup.get(m.groupId);
    if (first) first.groupMatches += 1;
    else aboveByGroup.set(m.groupId, m);
  }
  // Lo que encaja mejor primero, sea pregunta o agregado; a igual puntaje, la pregunta.
  return [...Array.from(aboveByGroup.values()), ...own.sort(byScore)]
    .sort((a, b) => b.score - a.score || Number(a.inSearchGroup) - Number(b.inSearchGroup))
    .slice(0, limit);
}
