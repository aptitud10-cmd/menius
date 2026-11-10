/**
 * Nombre de mesa para tickets. Las mesas suelen llamarse "Mesa 5" / "Table 5",
 * pero también "5", "Terraza 2" o solo "Mesa".
 *  - "Mesa 5" / "Table 5" / "5" → "MESA 5" (en: "TABLE 5")
 *  - "Mesa" sola                → "MESA"
 *  - "Terraza 2", "Mesanine 1"  → "EN MESA — TERRAZA 2" (no se le pega "MESA")
 */
export function tableBanner(tableName: string, en: boolean): string {
  const word = en ? 'TABLE' : 'MESA';
  const rest = stripTablePrefix(tableName);
  if (rest === null) return `${en ? 'DINE-IN' : 'EN MESA'} — ${tableName.trim().toUpperCase()}`;
  return rest ? `${word} ${rest.toUpperCase()}` : word;
}

/**
 * Lo que va después de "Mesa"/"Table" (o el nombre entero si es solo un
 * número). null si el nombre no empieza con esa palabra completa.
 */
export function stripTablePrefix(tableName: string): string | null {
  const n = tableName.trim();
  if (/^\d+[a-z]?$/i.test(n)) return n;
  const m = n.match(/^(mesa|table)(?![a-zñáéíóú])\s*(.*)$/i);
  return m ? m[2].trim() : null;
}
