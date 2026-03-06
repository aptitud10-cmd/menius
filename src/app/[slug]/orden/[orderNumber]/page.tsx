import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

const OrderTracker = dynamic(() => import('@/components/public/OrderTracker').then(m => m.OrderTracker), {
  ssr: false,
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
  searchParams: { paid?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Pedido ${params.orderNumber} | MENIUS`,
    description: 'Estado de tu pedido en tiempo real',
  };
}

export default async function OrderTrackingPage({ params, searchParams }: PageProps) {
  const paidSuccess = searchParams.paid === 'true';

  let restaurant: { id: string; name: string; slug: string; currency: string | null; address: string | null } | null = null;

  try {
    const adminDb = createAdminClient();
    const { data } = await adminDb
      .from('restaurants')
      .select('*')
      .eq('slug', params.slug)
      .maybeSingle();
    if (data) {
      restaurant = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        currency: (data as any).currency ?? null,
        address: (data as any).address ?? null,
      };
    }
  } catch {
    // If DB fetch fails, fall through to show fallback for paid orders
  }

  if (!restaurant) {
    if (paidSuccess) {
      return (
        <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="max-w-sm w-full">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">¡Pago recibido!</h1>
            <p className="text-sm text-gray-500 mb-6">
              Tu pago fue procesado exitosamente. El restaurante ha recibido tu pedido.
            </p>
            <Link
              href={`/${params.slug}`}
              className="block w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors"
            >
              Volver al menú
            </Link>
          </div>
        </div>
      );
    }
    notFound();
  }

  return (
    <OrderTracker
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      restaurantAddress={restaurant.address ?? undefined}
      orderNumber={params.orderNumber}
      currency={restaurant.currency ?? 'MXN'}
      showPaidBanner={paidSuccess}
    />
  );
}
