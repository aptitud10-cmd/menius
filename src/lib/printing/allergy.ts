/**
 * Detecta una alergia en las notas del pedido (SPEC impresión §6). Si hay, el
 * ticket imprime un banner invertido "ALLERGY: <fragmento>".
 *
 * Por palabra, no por substring: "nut" no puede dispararse con "donut",
 * "coconut" ni "minute". Se prefiere un falso positivo ("no dairy") a perder
 * una alergia real.
 */
const KEYWORDS = [
  'allerg\\p{L}*', 'alergi\\p{L}*', 'al[eé]rgic\\p{L}*',
  'peanuts?', 'nuts?', 'gluten', 'celiac\\p{L}*', 'cel[ií]ac\\p{L}*',
  'shellfish', 'dairy', 'man[ií]', 'nuez', 'nueces', 'mariscos?',
];

// \b no entiende tildes: los bordes se arman con \p{L} (cualquier letra).
const RE = new RegExp(`(?<!\\p{L})(?:${KEYWORDS.join('|')})(?!\\p{L})`, 'iu');

const MAX = 70;

/**
 * Devuelve el fragmento de la primera nota que menciona una alergia (la frase
 * que la contiene, recortada), o null si ninguna la menciona.
 */
export function detectAllergy(notes: Array<string | null | undefined>): string | null {
  for (const raw of notes) {
    const text = (raw ?? '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const m = RE.exec(text);
    if (!m) continue;
    // La frase que contiene la palabra (separada por . ; ! ? o salto).
    const sentences = text.split(/(?<=[.;!?])\s+/);
    let pos = 0;
    for (const s of sentences) {
      if (m.index < pos + s.length + 1) return clip(s.trim());
      pos += s.length + 1;
    }
    return clip(text);
  }
  return null;
}

function clip(s: string): string {
  return s.length <= MAX ? s : `${s.slice(0, MAX - 1).trimEnd()}…`;
}
