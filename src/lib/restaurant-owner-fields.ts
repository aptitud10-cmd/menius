/**
 * Campos de `restaurants` que una tablet NO cambia, ni con el panel abierto por
 * PIN (get-tenant.ts: "quien vio al dueño poner el PIN no toca la plata"):
 * cobros, impuesto, moneda/país, dominio y datos fiscales. El dueño los cambia
 * desde su celular o computadora.
 *
 * El formulario de Configuración manda TODOS los campos al guardar, así que se
 * bloquea solo lo que cambia: la tablet puede seguir guardando horarios.
 */
export const OWNER_ONLY_FIELDS = [
  'payment_methods_enabled',
  'mp_access_token',
  'mp_enabled',
  'tax_rate',
  'tax_included',
  'tax_label',
  'currency',
  'country_code',
  'custom_domain',
  'fiscal_rfc',
  'fiscal_razon_social',
  'fiscal_regimen_fiscal',
  'fiscal_lugar_expedicion',
] as const;

/** Columnas que nunca salen hacia el navegador (llaves y secretos). */
export const SECRET_RESTAURANT_FIELDS = [
  'mp_access_token',
  'wompi_integrity_secret_enc',
  'wompi_events_secret_enc',
] as const;

/** Copia de la fila sin llaves ni secretos; `has_mp_token` dice si hay token sin mostrarlo. */
// El tipo de salida conserva el de entrada (las filas vienen como `any` de
// Supabase y los componentes esperan su tipo); las llaves se borran igual.
export function stripRestaurantSecrets<T extends Record<string, unknown>>(row: T): T & { has_mp_token: boolean } {
  const copy: Record<string, unknown> = { ...row };
  for (const k of SECRET_RESTAURANT_FIELDS) delete copy[k];
  copy.has_mp_token = Boolean(row.mp_access_token);
  return copy as T & { has_mp_token: boolean };
}

/** Lo mismo que muestra el formulario cuando la columna está vacía. */
const FORM_DEFAULTS: Partial<Record<(typeof OWNER_ONLY_FIELDS)[number], unknown>> = {
  currency: 'USD',
  tax_rate: 0,
  tax_included: false,
  tax_label: 'Tax',
  payment_methods_enabled: ['cash'],
  mp_enabled: false,
};

function norm(field: (typeof OWNER_ONLY_FIELDS)[number], v: unknown): string {
  const value = v === null || v === undefined || v === '' ? (FORM_DEFAULTS[field] ?? '') : v;
  if (field === 'tax_rate') return String(Number(value) || 0);
  if (Array.isArray(value)) return JSON.stringify([...value].map(String).sort());
  if (typeof value === 'string') return field === 'custom_domain' ? value.trim().toLowerCase() : value.trim();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Campos de cobro/impuesto que `updates` cambia respecto de `current`. */
export function ownerOnlyChanges(
  current: Record<string, unknown>,
  updates: Record<string, unknown>,
): string[] {
  return OWNER_ONLY_FIELDS.filter((f) => {
    if (updates[f] === undefined) return false;
    // El token no se compara: mandar uno es cambiarlo, y mandar vacío con uno
    // guardado es borrarlo.
    if (f === 'mp_access_token') return Boolean(updates[f]) || Boolean(current[f]);
    return norm(f, updates[f]) !== norm(f, current[f]);
  });
}
