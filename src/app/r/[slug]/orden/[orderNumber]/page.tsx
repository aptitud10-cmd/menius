import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const OrderTracker = dynamic(() => import('@/components/public/OrderTracker').then(m => m.OrderTracker), {
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-pulse text-center">
        <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-3" />
        <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
      </div>
    </div>
  ),
});

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
