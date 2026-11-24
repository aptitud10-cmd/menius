import type { LifecycleEmailInput } from './emails';
import type { LifecycleKind } from './lifecycle';
import { choosePicks, restaurantForEmail, type MarketingRestaurant, type PickPool } from './lifecycle-data';

/**
 * Datos de ejemplo para la vista previa del dueño (y para revisar el diseño):
 * un cliente "Alex" cuyo último pedido fueron los 2 platos más pedidos.
 */
export function buildLifecyclePreviewInput(
  kind: LifecycleKind,
  locale: 'es' | 'en',
  r: MarketingRestaurant,
  pool: PickPool,
  appUrl: string,
): LifecycleEmailInput {
  const menuUrl = `${appUrl}/${r.slug}`;
  const ordered = pool.popular.slice(0, 2);
  const lastOrderAt = new Date(Date.now() - (kind === 'winback' ? 50 : 12) * 24 * 3600_000).toISOString();
  const { picks, picksAreNew } = choosePicks(
    { popular: pool.popular.slice(2), newest: pool.newest },
    kind,
    new Set(ordered.map((p) => p.id)),
    lastOrderAt,
  );
  const hero = ordered[0];
  return {
    kind,
    locale,
    restaurant: restaurantForEmail(r),
    customerName: 'Alex',
    menuUrl,
    repeatUrl: menuUrl,
    unsubscribeUrl: menuUrl,
    lastItems: ordered.length
      ? ordered.map((p, i) => ({ qty: i === 0 ? 1 : 2, name: p.name }))
      : [{ qty: 1, name: locale === 'en' ? 'Your favorite dish' : 'Tu plato favorito' }],
    heroDish: hero ? { name: hero.name, price: null, imageUrl: hero.image_url } : null,
    picks,
    picksAreNew,
  };
}
