import { getDashboardContext } from '@/lib/get-dashboard-context';
import { ProductsManager } from '@/components/menu/ProductsManager';

export default async function ProductsPage() {
  const { supabase, restaurantId: rid } = await getDashboardContext();

  // Slim: la lista solo necesita columnas de `products` + un CONTEO de modifier
  // groups (para el badge). variants/extras/modifier_options completos NO se
  // traen aquí — solo los usa "duplicar producto", que ahora los carga on-demand
  // (ver getProductForDuplication). En catálogos grandes (Buccaneer: 380 prod,
  // 997 opciones) esto recorta el payload RSC en ~1200 filas anidadas.
  const [{ data: products }, { data: categories }, { data: restaurant }] = await Promise.all([
    supabase.from('products').select('*, modifier_groups(count)').eq('restaurant_id', rid).order('sort_order'),
    supabase.from('categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
    supabase.from('restaurants').select('id, currency, locale, available_locales').eq('id', rid).maybeSingle(),
  ]);

  const mappedProducts = (products ?? []).map((p: any) => {
    // Supabase devuelve el count agregado como [{ count: N }]; lo normalizamos a
    // un array de largo N para que `modifier_groups.length` (el badge) siga válido
    // sin cargar el contenido real de los grupos.
    const modCount = p.modifier_groups?.[0]?.count ?? 0;
    return {
      ...p,
      variants: [],
      extras: [],
      modifier_groups: Array.from({ length: modCount }, () => ({})),
    };
  });

  return (
    <div>
      <h1 className="dash-heading mb-6">{restaurant?.locale === 'en' ? 'Products' : 'Productos'}</h1>
      <ProductsManager
        initialProducts={mappedProducts}
        categories={categories ?? []}
        restaurantId={rid}
        currency={restaurant?.currency || 'USD'}
        defaultLocale={restaurant?.locale || 'es'}
        availableLocales={restaurant?.available_locales || [restaurant?.locale || 'es']}
      />
    </div>
  );
}
