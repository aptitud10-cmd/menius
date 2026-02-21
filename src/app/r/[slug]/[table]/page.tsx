import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchMenuData } from '../menu-data';
import { MenuShell } from '@/components/public/MenuShell';

export const revalidate = 60;

interface PageProps {
  params: { slug: string; table: string };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menius.app';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchMenuData(params.slug);
  if (!data) return { title: 'Menú no encontrado | MENIUS' };

  const { restaurant } = data;
  const tableName = decodeURIComponent(params.table);
  const isEn = data.locale === 'en';
  const title = `${restaurant.name} — ${tableName} | MENIUS`;
  const description = restaurant.description ?? (isEn ? `Order online from ${restaurant.name}.` : `Pide online en ${restaurant.name}.`);
  const url = `${APP_URL}/r/${params.slug}/${params.table}`;
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
    twitter: { card: 'summary_large_image', title: restaurant.name, description, images: [image] },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  };
}

export default async function TableMenuPage({ params }: PageProps) {
  const data = await fetchMenuData(params.slug);
  if (!data) notFound();

  const tableName = decodeURIComponent(params.table);

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

  const paymentMap: Record<string, string> = { cash: 'Cash', online: 'Credit Card' };
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
      hasMenuItem: items.slice(0, 30).map((p: any) => ({
        '@type': 'MenuItem',
        name: p.name,
        ...(p.description && { description: p.description }),
        ...(p.image_url && { image: p.image_url }),
        offers: {
          '@type': 'Offer',
          price: p.price,
          priceCurrency: currency,
          availability: 'https://schema.org/InStock',
        },
      })),
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
