export const dynamic = 'force-dynamic';

import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { OrderTracker } from '@/components/public/OrderTracker';

interface PageProps {
  params: { slug: string; orderNumber: string };
  searchParams: { paid?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Order ${params.orderNumber} | MENIUS`,
    description: 'Track your order in real time',
    robots: { index: false, follow: false },
  };
}

export default async function OrderTrackingPage({ params, searchParams }: PageProps) {
  const paidSuccess = searchParams.paid === 'true';

  let restaurant: { id: string; name: string; slug: string; currency: string | null; address: string | null; locale: string | null; phone: string | null } | null = null;
  let initialOrder: any = null;

  try {
    const adminDb = createAdminClient();

    // Fetch restaurant first so we have the UUID needed for the order RPC
    const { data: restaurantData } = await adminDb
      .from('restaurants')
      .select('id, name, slug, currency, locale, address, phone')
      .eq('slug', params.slug)
      .maybeSingle();

    if (restaurantData) {
      restaurant = {
        id: restaurantData.id,
        name: restaurantData.name,
        slug: restaurantData.slug,
        currency: (restaurantData as any).currency ?? null,
        address: (restaurantData as any).address ?? null,
        locale: (restaurantData as any).locale ?? null,
        phone: (restaurantData as any).phone ?? null,
      };

      // Fetch order server-side so the page renders with data immediately.
      // Uses direct table query (admin client) to avoid dependency on RPC functions.
      const { data: orderData, error: orderErr } = await adminDb
        .from('orders')
        .select(`
          *,
          table:table_id(name),
          order_items(
            id, qty, unit_price, line_total, notes,
            product:product_id(name),
            variant:variant_id(name)
          )
        `)
        .eq('order_number', params.orderNumber)
        .eq('restaurant_id', restaurantData.id)
        .maybeSingle();

      if (!orderErr && orderData) {
        initialOrder = {
          ...orderData,
          table_name: (orderData.table as any)?.name ?? null,
          order_items: ((orderData.order_items ?? []) as any[]).map((item: any) => ({
            id: item.id,
            qty: item.qty,
            unit_price: item.unit_price,
            line_total: item.line_total,
            notes: item.notes,
            product_name: item.product?.name ?? null,
            variant_name: item.variant?.name ?? null,
          })),
        };
      }
    }
  } catch {
    // If DB fetch fails, fall through to show fallback for paid orders
  }

  const en = restaurant?.locale === 'en';

  if (!restaurant) {
    if (paidSuccess) {
      return (
        <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
              {en ? 'Payment received!' : '¡Pago recibido!'}
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              {en
                ? 'Your payment was processed successfully. The restaurant has received your order.'
                : 'Tu pago fue procesado exitosamente. El restaurante ha recibido tu pedido.'}
            </p>
            <Link
              href={`/${params.slug}`}
              className="block w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors"
            >
              {en ? 'Back to menu' : 'Volver al menú'}
            </Link>
          </div>
        </div>
      );
    }
    redirect(`/${params.slug}`);
  }

  return (
    <OrderTracker
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      restaurantAddress={restaurant.address ?? undefined}
      restaurantPhone={restaurant.phone ?? undefined}
      orderNumber={params.orderNumber}
      currency={restaurant.currency ?? 'MXN'}
      locale={restaurant.locale ?? 'es'}
      showPaidBanner={paidSuccess}
      initialOrder={initialOrder}
    />
  );
}
