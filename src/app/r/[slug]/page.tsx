import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MenuShell } from '@/components/public/MenuShell';
import { fetchMenuData } from './menu-data';
import { demoRestaurant, demoCategories, demoProducts } from '@/lib/demo-data';
import { buccaneerRestaurant, buccaneerCategories, buccaneerProducts } from '@/lib/demo-data-en';

export const revalidate = 60;

interface PageProps {
  params: { slug: string };
  searchParams: { table?: string; v?: string };
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
      twitter: { card: 'summary_large_image', title: r.name, description, images: [image] },
      alternates: { canonical: url },
    };
  }

  const data = await fetchMenuData(params.slug);
  if (!data) return { title: 'Menú no encontrado | MENIUS' };

  const { restaurant } = data;
  const isEn = data.locale === 'en';
  const title = `${restaurant.name} — ${isEn ? 'Digital Menu' : 'Menú Digital'} | MENIUS`;
  const description = restaurant.description ?? (isEn ? `Order online from ${restaurant.name}.` : `Pide online en ${restaurant.name}. Menú digital con MENIUS.`);
  const url = `${APP_URL}/r/${restaurant.slug}`;
  const image = restaurant.cover_image_url || restaurant.logo_url || `${APP_URL}/icons/icon-512.svg`;

  return {
    title,
    description,
    openGraph: { title, description, url, siteName: 'MENIUS', type: 'website', images: [{ url: image, width: 1200, height: 630, alt: restaurant.name }], locale: isEn ? 'en_US' : 'es_MX' },
    twitter: { card: 'summary_large_image', title: restaurant.name, description, images: [image] },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

export default async function PublicMenuPage({ params, searchParams }: PageProps) {
  // Demo slugs — also use new MenuShell
  const demoConfig = DEMO_SLUGS[params.slug];
  if (demoConfig) {
    return (
      <>
        <JsonLdScript restaurant={demoConfig.restaurant} slug={params.slug} />
        <MenuShell
          restaurant={demoConfig.restaurant}
          categories={demoConfig.categories}
          products={demoConfig.products}
          tableName={searchParams.table ?? null}
          locale={demoConfig.locale}
          backUrl="/"
        />
      </>
    );
  }

  // Real restaurants — use new MenuShell
  const data = await fetchMenuData(params.slug);
  if (!data) notFound();

  const tableName = searchParams.table ?? null;

  return (
    <>
      <JsonLdScript restaurant={data.restaurant} slug={params.slug} products={data.products} />
      <MenuShell
        restaurant={data.restaurant}
        categories={data.categories}
        products={data.products}
        tableName={tableName}
        locale={data.locale}
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
