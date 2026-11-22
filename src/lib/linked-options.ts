/**
 * Opciones enganchadas a un plato (modifier_options.linked_product_id).
 *
 * "Soup or salad?" → Soup → "Which soup?" ofrece las sopas de la biblioteca, cada una
 * enganchada a su producto. Lo que está puesto hoy lo decide el Counter (pestaña "Hoy":
 * products.is_active / in_stock, corte de las 5 AM), así que la lista se arma sola:
 *   - plato apagado (no está hoy) o borrado → la opción no se ofrece
 *   - plato agotado                          → se ve en gris "Sold out today"
 * La hoja la muestra así y /api/orders rechaza las dos cosas (carrito viejo, API).
 */

export interface LinkedProductState {
  id: string;
  is_active?: boolean | null;
  in_stock?: boolean | null;
}

export type LinkedState = 'ok' | 'hidden' | 'sold_out';

export function linkedOptionState(
  linkedProductId: string | null | undefined,
  products: ReadonlyMap<string, LinkedProductState>,
): LinkedState {
  if (!linkedProductId) return 'ok';
  const p = products.get(linkedProductId);
  if (!p || p.is_active === false) return 'hidden';
  if (p.in_stock === false) return 'sold_out';
  return 'ok';
}

/** Ids de producto enganchados en una lista de opciones (sin repetir). */
export function linkedProductIds(options: ReadonlyArray<{ linked_product_id?: string | null }>): string[] {
  return Array.from(new Set(options.map((o) => o.linked_product_id).filter((id): id is string => !!id)));
}
