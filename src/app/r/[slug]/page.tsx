import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PublicMenuClient } from '@/components/public/PublicMenuClient';
import { demoRestaurant, demoCategories, demoProducts } from '@/lib/demo-data';
import { buccaneerRestaurant, buccaneerCategories, buccaneerProducts } from '@/lib/demo-data-en';

// ISR: revalidate public menu pages every 60 seconds
export const revalidate = 60;

interface PageProps {
  params: { slug: string };
  searchParams: { table?: string };
}

const DEMO_SLUGS: Record<string, {
  restaurant: typeof demoRestaurant;
  categories: typeof demoCategories;
  products: typeof demoProducts;
  locale: 'es' | 'en';
}> = {
  demo: {
    restaurant: demoRestaurant,
    categories: demoCategories,
    products: demoProducts,
    locale: 'es',
  },
  'buccaneer-diner': {
    restaurant: buccaneerRestaurant,
    categories: buccaneerCategories,
    products: buccaneerProducts,
    locale: 'en',
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const demoConfig = DEMO_SLUGS[params.slug];

  if (demoConfig) {
    const r = demoConfig.restaurant;
    const title = `${r.name} — Menú Digital | MENIUS`;
    const description = r.description ?? `Pide online en ${r.name}`;
    const url = `${APP_URL}/r/${params.slug}`;
    const image = (r as any).cover_image_url || `${APP_URL}/icons/icon-512.svg`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: 'MENIUS',
        type: 'website',
        images: [{ url: image, width: 1200, height: 630, alt: r.name }],
        locale: demoConfig.locale === 'es' ? 'es_MX' : 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: r.name,
        description,
        images: [image],
      },
      alternates: { canonical: url },
    };
  }

  const supabase = createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, description, cover_image_url, logo_url, slug, locale')
    .eq('slug', params.slug)
    .single();

  if (!restaurant) return { title: 'Menú no encontrado | MENIUS' };

  const isEn = restaurant.locale === 'en';
  const title = `${restaurant.name} — ${isEn ? 'Digital Menu' : 'Menú Digital'} | MENIUS`;
  const description = restaurant.description ?? (isEn ? `Order online from ${restaurant.name}.` : `Pide online en ${restaurant.name}. Menú digital con MENIUS.`);
  const url = `${APP_URL}/r/${restaurant.slug}`;
  const image = restaurant.cover_image_url || restaurant.logo_url || `${APP_URL}/icons/icon-512.svg`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: 'MENIUS',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: restaurant.name }],
      locale: isEn ? 'en_US' : 'es_MX',
    },
    twitter: {
      card: 'summary_large_image',
      title: restaurant.name,
      description,
      images: [image],
    },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

export default async function PublicMenuPage({ params, searchParams }: PageProps) {
  const supabase = createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!restaurant) {
    const demoConfig = DEMO_SLUGS[params.slug];
    if (demoConfig) {
      return (
        <>
          <JsonLdScript restaurant={demoConfig.restaurant} slug={params.slug} />
          <PublicMenuClient
            restaurant={demoConfig.restaurant}
            categories={demoConfig.categories}
            products={demoConfig.products}
            tableName={searchParams.table ?? null}
            locale={demoConfig.locale}
            isDemo
          />
        </>
      );
    }
    notFound();
  }

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).eq('is_active', true).order('sort_order'),
    supabase.from('products').select('*, product_variants(*), product_extras(*)').eq('restaurant_id', restaurant.id).eq('is_active', true).order('sort_order'),
  ]);

  const mappedProducts = (products ?? []).map((p: any) => ({
    ...p,
    variants: p.product_variants ?? [],
    extras: p.product_extras ?? [],
  }));

  const isDemo = !!DEMO_SLUGS[params.slug];
  const locale = DEMO_SLUGS[params.slug]?.locale ?? restaurant.locale ?? 'es';

  return (
    <>
      <JsonLdScript restaurant={restaurant} slug={params.slug} products={mappedProducts} />
      <PublicMenuClient
        restaurant={restaurant}
        categories={categories ?? []}
        products={mappedProducts}
        tableName={searchParams.table ?? null}
        locale={locale}
        isDemo={isDemo}
      />
    </>
  );
}

function JsonLdScript({ restaurant, slug, products }: { restaurant: any; slug: string; products?: any[] }) {
  const url = `${APP_URL}/r/${slug}`;

  const restaurantLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    description: restaurant.description || undefined,
    url,
    ...(restaurant.address && { address: { '@type': 'PostalAddress', streetAddress: restaurant.address } }),
    ...(restaurant.phone && { telephone: restaurant.phone }),
    ...(restaurant.cover_image_url && { image: restaurant.cover_image_url }),
    ...(restaurant.logo_url && { logo: restaurant.logo_url }),
    servesCuisine: 'Various',
    acceptsReservations: false,
  };

  if (restaurant.operating_hours) {
    const daysMap: Record<string, string> = {
      monday: 'Mo', tuesday: 'Tu', wednesday: 'We', thursday: 'Th',
      friday: 'Fr', saturday: 'Sa', sunday: 'Su',
    };
    const specs = Object.entries(restaurant.operating_hours)
      .filter(([, v]: any) => !v.closed)
      .map(([day, v]: any) => `${daysMap[day] ?? day} ${v.open}-${v.close}`);

    if (specs.length > 0) {
      restaurantLd.openingHoursSpecification = specs.map((s) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: s.split(' ')[0],
        opens: s.split(' ')[1]?.split('-')[0],
        closes: s.split(' ')[1]?.split('-')[1],
      }));
    }
  }

  if (products && products.length > 0) {
    restaurantLd.hasMenu = {
      '@type': 'Menu',
      name: `Menú de ${restaurant.name}`,
      hasMenuSection: [{
        '@type': 'MenuSection',
        name: 'Menú completo',
        hasMenuItem: products.slice(0, 50).map((p: any) => ({
          '@type': 'MenuItem',
          name: p.name,
          description: p.description || undefined,
          ...(p.image_url && { image: p.image_url }),
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: restaurant.currency ?? 'MXN',
          },
        })),
      }],
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantLd) }}
    />
  );
}
