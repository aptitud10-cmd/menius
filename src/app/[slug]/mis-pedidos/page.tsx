import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { OrderHistoryClient } from '@/app/r/[slug]/mis-pedidos/OrderHistoryClient';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Mis pedidos | MENIUS`,
    description: 'Consulta el historial de tus pedidos',
    robots: { index: false },
  };
}

export default async function MisPedidosPage({ params }: PageProps) {
  const adminDb = createAdminClient();

  const { data: restaurant } = await adminDb
    .from('restaurants')
    .select('id, name, slug, currency')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!restaurant) notFound();

  return (
    <OrderHistoryClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      currency={restaurant.currency ?? 'MXN'}
    />
  );
}
