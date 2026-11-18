import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { OrderHistoryClient } from './OrderHistoryClient';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // In the store's language: it was a fixed "Mis pedidos" on English menus.
  const { data } = await createAdminClient()
    .from('restaurants')
    .select('name, locale')
    .eq('slug', params.slug)
    .maybeSingle();
  const label = data?.locale === 'en' ? 'My orders' : 'Mis pedidos';
  return {
    title: data?.name ? `${label} · ${data.name}` : label,
    robots: { index: false },
  };
}

export default async function MisPedidosPage({ params }: PageProps) {
  const adminDb = createAdminClient();

  const { data: restaurant } = await adminDb
    .from('restaurants')
    .select('id, name, slug, currency, locale')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!restaurant) notFound();

  return (
    <OrderHistoryClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      currency={restaurant.currency ?? 'MXN'}
      locale={restaurant.locale ?? 'es'}
    />
  );
}
