import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { OrderTracker } from '@/components/public/OrderTracker';

interface PageProps {
  params: { slug: string; orderNumber: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Pedido ${params.orderNumber} | MENIUS`,
    description: 'Sigue el estado de tu pedido en tiempo real',
  };
}

export default async function OrderTrackingPage({ params }: PageProps) {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .single();

  if (!restaurant) notFound();

  return (
    <OrderTracker
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      orderNumber={params.orderNumber}
    />
  );
}
