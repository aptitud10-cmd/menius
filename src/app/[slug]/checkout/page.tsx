import { notFound } from 'next/navigation';
import { fetchMenuData } from '../menu-data';
import { demoRestaurant } from '@/lib/demo-data';
import { grillHouseRestaurant } from '@/lib/demo-data-en';
import { CheckoutPageClient } from '@/components/public/CheckoutPageClient';
import { generateOrderToken } from '@/lib/order-token';

export const dynamic = 'force-dynamic';

const DEMO_RESTAURANTS: Record<string, { restaurant: typeof demoRestaurant; locale: 'es' | 'en' }> = {
  'la-casa-del-sabor': { restaurant: demoRestaurant, locale: 'es' },
  'the-grill-house': { restaurant: grillHouseRestaurant, locale: 'en' },
};

interface PageProps {
  params: { slug: string };
}

export default async function CheckoutPage({ params }: PageProps) {
  const demo = DEMO_RESTAURANTS[params.slug];
  if (demo) {
    return <CheckoutPageClient restaurant={demo.restaurant} locale={demo.locale} slug={params.slug} orderToken="" />;
  }

  const data = await fetchMenuData(params.slug);
  if (!data) notFound();

  console.log('[checkout] restaurant.id from fetchMenuData:', data.restaurant.id, 'slug:', params.slug);
  const orderToken = generateOrderToken(data.restaurant.id);

  return <CheckoutPageClient restaurant={data.restaurant} locale={data.locale} slug={params.slug} orderToken={orderToken} />;
}
