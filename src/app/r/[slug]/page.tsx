import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MenuShell } from '@/components/public/MenuShell';
import { fetchMenuData } from './menu-data';
import { demoRestaurant, demoCategories, demoProducts } from '@/lib/demo-data';
import { grillHouseRestaurant, grillHouseCategories, grillHouseProducts } from '@/lib/demo-data-en';
import { DIETARY_TAGS } from '@/lib/dietary-tags';

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
  'the-grill-house': {
    restaurant: grillHouseRestaurant,
    categories: grillHouseCategories,
    products: grillHouseProducts,
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
        <JsonLdScript restaurant={demoConfig.restaurant} slug={params.slug} categories={demoConfig.categories} products={demoConfig.products} reviewStats={{ average: 4.7, total: 128 }} />
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
      <JsonLdScript restaurant={data.restaurant} slug={params.slug} categories={data.categories} products={data.products} reviewStats={data.reviewStats} />
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

function JsonLdScript({
  restaurant, slug, categories, products, reviewStats,
}: {
  restaurant: any;
  slug: string;
  categories?: any[];
  products?: any[];
  reviewStats?: { average: number; total: number } | null;
}) {
  const url = `${APP_URL}/r/${slug}`;
  const currency = restaurant.currency ?? 'MXN';

  const paymentMap: Record<string, string> = {
    cash: 'Cash', online: 'Credit Card', oxxo: 'OXXO', spei: 'Bank Transfer',
  };
  const paymentAccepted = (restaurant.payment_methods_enabled as string[] | undefined)
    ?.map((m: string) => paymentMap[m])
    .filter(Boolean);

  let priceRange: string | undefined;
  if (products && products.length > 0) {
    const prices = products.map((p: any) => p.price).filter((p: number) => p > 0);
    if (prices.length > 0) {
      const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
      if (avg <= 80) priceRange = '$';
      else if (avg <= 200) priceRange = '$$';
      else if (avg <= 500) priceRange = '$$$';
      else priceRange = '$$$$';
    }
  }

  const restaurantLd: any = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: restaurant.name,
    description: restaurant.description || undefined,
    url,
    ...(restaurant.address && {
      address: { '@type': 'PostalAddress', streetAddress: restaurant.address },
    }),
    ...(restaurant.latitude && restaurant.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      },
    }),
    ...(restaurant.phone && { telephone: restaurant.phone }),
    ...(restaurant.cover_image_url && { image: restaurant.cover_image_url }),
    ...(restaurant.logo_url && { logo: restaurant.logo_url }),
    ...(paymentAccepted && paymentAccepted.length > 0 && { paymentAccepted }),
    ...(priceRange && { priceRange }),
    acceptsReservations: false,
  };

  if (reviewStats && reviewStats.total >= 1) {
    restaurantLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: reviewStats.average,
      bestRating: 5,
      worstRating: 1,
      ratingCount: reviewStats.total,
    };
  }

  if (restaurant.operating_hours) {
    const fullDayNames: Record<string, string> = {
      monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
      thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
    };
    const specs = Object.entries(restaurant.operating_hours)
      .filter(([, v]: any) => v && !v.closed)
      .map(([day, v]: any) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${fullDayNames[day] ?? day}`,
        opens: v.open,
        closes: v.close,
      }));
    if (specs.length > 0) restaurantLd.openingHoursSpecification = specs;
  }

  if (products && products.length > 0 && categories && categories.length > 0) {
    const catMap = new Map(categories.map((c: any) => [c.id, c.name]));
    const grouped = new Map<string, any[]>();

    for (const p of products) {
      const catName = catMap.get(p.category_id) ?? 'General';
      if (!grouped.has(catName)) grouped.set(catName, []);
      grouped.get(catName)!.push(p);
    }

    const sections = Array.from(grouped.entries()).map(([name, items]) => ({
      '@type': 'MenuSection',
      name,
      hasMenuItem: items.slice(0, 30).map((p: any) => {
        const diets = (p.dietary_tags as string[] | undefined)
          ?.map((t: string) => DIETARY_TAGS.find((dt) => dt.id === t)?.schemaDiet)
          .filter(Boolean);
        return {
          '@type': 'MenuItem',
          name: p.name,
          ...(p.description && { description: p.description }),
          ...(p.image_url && { image: p.image_url }),
          ...(diets && diets.length > 0 && { suitableForDiet: diets }),
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: currency,
            availability: 'https://schema.org/InStock',
          },
        };
      }),
    }));

    restaurantLd.hasMenu = {
      '@type': 'Menu',
      name: `${restaurant.name} Menu`,
      hasMenuSection: sections,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantLd) }}
    />
  );
}
