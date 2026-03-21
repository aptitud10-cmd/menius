export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ReviewPageClient from '@/components/public/ReviewPageClient';

interface PageProps {
  params: { slug: string; orderId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Leave a review | MENIUS`,
    description: 'Rate your experience',
  };
}

export default async function ReviewPage({ params }: PageProps) {
  const adminDb = createAdminClient();

  const { data: order } = await adminDb
    .from('orders')
    .select('id, customer_name, restaurant_id, restaurants(id, name, slug, locale)')
    .eq('id', params.orderId)
    .maybeSingle();

  if (!order || !order.restaurants) return notFound();

  const restaurant = Array.isArray(order.restaurants) ? order.restaurants[0] : order.restaurants;

  if (restaurant.slug !== params.slug) return notFound();

  return (
    <ReviewPageClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={params.slug}
      orderId={order.id}
      customerName={order.customer_name ?? ''}
      locale={restaurant.locale ?? 'es'}
    />
  );
}
